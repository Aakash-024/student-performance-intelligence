"""
SPIP Phase 5: ML model training pipeline.

Trains two explainable models on the synthetic dataset in data/generated/:

  1. Ridge regression  -> predicts a student's NEXT-term average percentage
  2. Logistic regression -> predicts the probability the student is "at risk"
     next term, using the platform's own rule (avg < 40% or attendance < 60%)

Both are linear models: every prediction decomposes into
(feature value x weight) contributions, which the app renders as a
human-readable "why this prediction" breakdown.

Outputs src/lib/ml/model.json — the artifact the TypeScript runtime loads.
Re-run any time the seed data changes:  python scripts/ml/train.py

No scikit-learn dependency: NumPy only, so the pipeline matches what the
app implements at inference time (same math, no version drift).
"""

from __future__ import annotations

import json
import math
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "generated"
OUT = ROOT / "src" / "lib" / "ml" / "model.json"
OUT.parent.mkdir(parents=True, exist_ok=True)

RIDGE_LAMBDA_GRID = [0.1, 1.0, 10.0, 100.0]
LOGISTIC_LR = 0.1
LOGISTIC_EPOCHS = 20000
LOGISTIC_L2 = 1.0
FOLDS = 5
SEED = 42

FEATURE_NAMES = [
    "avg_percentage",        # current-term weighted average
    "attendance_percentage", # current-term attendance
    "subjects_passed_ratio", # passed / total subjects
    "cat1_pct",              # average CAT-1 score %
    "cat2_pct",              # average CAT-2 score %
    "internal_pct",          # average internal assessment score %
    "semester_pct",          # average semester exam score %
    "cat_trend",             # CAT2 minus CAT1 (within-term trajectory)
    "absent_rate",           # share of assessments marked absent
]


# ---------------------------------------------------------------------------
# Feature engineering
# ---------------------------------------------------------------------------

def build_features(marks: pd.DataFrame, assessments: pd.DataFrame,
                   history: pd.DataFrame) -> pd.DataFrame:
    """One row per (student, term) with the model's input features."""
    merged = marks.merge(
        assessments[["id", "type", "max_marks", "academic_term_id", "subject_id"]],
        left_on="assessment_id", right_on="id", suffixes=("", "_assessment"),
    )
    merged["pct"] = np.where(
        merged["is_absent"].astype(bool),
        0.0,
        merged["marks_obtained"] / merged["max_marks"] * 100.0,
    )

    per_type = (
        merged.groupby(["student_id", "academic_term_id", "type"])["pct"]
        .mean().unstack("type")
    )
    absent_rate = merged.groupby(["student_id", "academic_term_id"])["is_absent"].mean()

    # Within-term trajectory: per subject, CAT2 minus CAT1, averaged.
    cats = merged[merged["type"].isin(["cat1", "cat2"])]
    pivot = cats.pivot_table(
        index=["student_id", "academic_term_id", "subject_id"],
        columns="type", values="pct",
    ).reset_index()
    pivot["trend"] = pivot["cat2"] - pivot["cat1"]
    cat_trend = pivot.groupby(["student_id", "academic_term_id"])["trend"].mean()

    features = pd.DataFrame(index=history.index)
    features["avg_percentage"] = history["average_percentage"]
    features["attendance_percentage"] = history["attendance_percentage"]
    features["subjects_passed_ratio"] = (
        history["subjects_passed"] / history["total_subjects"].clip(lower=1)
    )
    history_key = history.set_index(["student_id", "academic_term_id"]).index
    for name, column in [
        ("cat1_pct", "cat1"), ("cat2_pct", "cat2"),
        ("internal_pct", "internal"), ("semester_pct", "semester"),
    ]:
        features[name] = per_type[column].reindex(history_key).to_numpy()
    features["cat_trend"] = cat_trend.reindex(history_key).to_numpy()
    features["absent_rate"] = absent_rate.reindex(history_key).to_numpy()

    # Missing assessment-type averages fall back to the term average: the app
    # does the same at inference time (a subject may have no CAT-2 recorded).
    term_avg = history["average_percentage"].to_numpy()
    features = features.fillna({
        "cat1_pct": pd.Series(term_avg, index=features.index),
        "cat2_pct": pd.Series(term_avg, index=features.index),
        "internal_pct": pd.Series(term_avg, index=features.index),
        "semester_pct": pd.Series(term_avg, index=features.index),
        "cat_trend": 0.0,
        "absent_rate": 0.0,
    })
    return features[FEATURE_NAMES]


def at_risk_label(avg: pd.Series, attendance: pd.Series) -> np.ndarray:
    """The platform's own rule, applied to the target term."""
    return ((avg < 40) | (attendance < 60)).to_numpy(dtype=float)


# ---------------------------------------------------------------------------
# Models (NumPy only, mirroring the TypeScript runtime exactly)
# ---------------------------------------------------------------------------

def ridge_fit(x: np.ndarray, y: np.ndarray, lam: float) -> tuple[np.ndarray, float]:
    """Closed-form ridge on standardized features (y centered by the mean)."""
    beta = np.linalg.solve(x.T @ x + lam * np.eye(x.shape[1]), x.T @ y)
    return beta, float(0.0)  # intercept handled by standardization/centering


def ridge_predict(x: np.ndarray, beta: np.ndarray, y_mean: float) -> np.ndarray:
    return x @ beta + y_mean


def logistic_fit(x: np.ndarray, y: np.ndarray, w_pos: float, w_neg: float):
    """Full-batch gradient descent with balanced class weights + L2."""
    beta = np.zeros(x.shape[1])
    intercept = 0.0
    sample_w = np.where(y == 1.0, w_pos, w_neg)
    for _ in range(LOGISTIC_EPOCHS):
        z = x @ beta + intercept
        p = 1.0 / (1.0 + np.exp(-z))
        grad = (x * (sample_w * (p - y))[:, None]).sum(axis=0) / sample_w.sum() \
            + LOGISTIC_L2 * beta / x.shape[1]
        grad_i = float((sample_w * (p - y)).sum()) / sample_w.sum()
        beta -= LOGISTIC_LR * grad
        intercept -= LOGISTIC_LR * grad_i
    return beta, intercept


def logistic_prob(x: np.ndarray, beta: np.ndarray, intercept: float) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-(x @ beta + intercept)))


def auc_score(y: np.ndarray, scores: np.ndarray) -> float:
    """Rank-based AUC (Mann-Whitney). Robust and dependency-free."""
    pos = scores[y == 1.0]
    neg = scores[y == 0.0]
    if not len(pos) or not len(neg):
        return float("nan")
    order = np.argsort(scores, kind="mergesort")
    ranks = np.empty(len(scores), dtype=float)
    ranks[order] = np.arange(1, len(scores) + 1)
    # Average ranks within ties.
    for value in np.unique(scores):
        mask = scores == value
        ranks[mask] = ranks[mask].mean()
    return float((ranks[y == 1.0].sum() - len(pos) * (len(pos) + 1) / 2)
                 / (len(pos) * len(neg)))


# ---------------------------------------------------------------------------
# Training with cross-validation
# ---------------------------------------------------------------------------

def kfold_indices(n: int, folds: int, seed: int) -> list[tuple[np.ndarray, np.ndarray]]:
    rng = np.random.default_rng(seed)
    idx = rng.permutation(n)
    return [(idx[i::folds], np.setdiff1d(idx, idx[i::folds])) for i in range(folds)]


def main() -> None:
    history = pd.read_csv(DATA / "academic_history.csv")
    marks = pd.read_csv(DATA / "marks.csv")
    assessments = pd.read_csv(DATA / "assessments.csv")
    terms = pd.read_csv(DATA / "academic_terms.csv").sort_values("start_date")

    feature_term, target_term = terms.iloc[0], terms.iloc[1]

    all_features = build_features(marks, assessments, history)
    x_all = all_features.to_numpy(dtype=float)
    meta = history.set_index(["student_id", "academic_term_id"])
    feat_idx = meta.index.isin([(sid, feature_term.id) for sid in history["student_id"]])
    # Select the rows belonging to the feature term, aligned with target rows.
    feat_rows = history[history["academic_term_id"] == feature_term.id].sort_values("student_id")
    target_rows = history[history["academic_term_id"] == target_term.id].set_index("student_id").loc[
        feat_rows["student_id"]
    ]

    x = all_features.loc[feat_rows.index].to_numpy(dtype=float)
    y_reg = target_rows["average_percentage"].to_numpy(dtype=float)
    y_cls = at_risk_label(target_rows["average_percentage"], target_rows["attendance_percentage"])

    n = len(x)
    print(f"samples: {n} | features: {len(FEATURE_NAMES)}")
    print(f"feature term: {feature_term['name']} -> target term: {target_term['name']}")
    print(f"at-risk positives in target term: {int(y_cls.sum())} ({y_cls.mean():.1%})")

    # Standardization stats (fit on the full dataset; the app reuses them).
    mu, sigma = x.mean(axis=0), x.std(axis=0)
    sigma[sigma == 0] = 1.0
    xs = (x - mu) / sigma

    folds = kfold_indices(n, FOLDS, SEED)

    # --- Ridge regression: pick lambda by CV, then report CV metrics --------
    best_lam, best_mae = None, math.inf
    for lam in RIDGE_LAMBDA_GRID:
        maes = []
        for test_idx, train_idx in folds:
            y_mean = y_reg[train_idx].mean()
            beta, _ = ridge_fit(xs[train_idx], y_reg[train_idx] - y_mean, lam)
            pred = ridge_predict(xs[test_idx], beta, y_mean)
            maes.append(np.abs(pred - y_reg[test_idx]).mean())
        mae = float(np.mean(maes))
        print(f"  ridge lambda={lam:<6} CV MAE = {mae:.2f}")
        if mae < best_mae:
            best_lam, best_mae = lam, mae

    cv_pred = np.zeros(n)
    for test_idx, train_idx in folds:
        y_mean = y_reg[train_idx].mean()
        beta, _ = ridge_fit(xs[train_idx], y_reg[train_idx] - y_mean, best_lam)
        cv_pred[test_idx] = ridge_predict(xs[test_idx], beta, y_mean)
    residuals = y_reg - cv_pred
    reg_metrics = {
        "cv_mae": float(np.abs(residuals).mean()),
        "cv_rmse": float(np.sqrt((residuals ** 2).mean())),
        "r2": float(1 - (residuals ** 2).sum() / ((y_reg - y_reg.mean()) ** 2).sum()),
        "residual_std": float(residuals.std(ddof=1)),
    }

    # Final fit on all data.
    y_mean = y_reg.mean()
    beta_reg, _ = ridge_fit(xs, y_reg - y_mean, best_lam)

    # --- Logistic regression -------------------------------------------------
    pos_weight = n / (2 * max(y_cls.sum(), 1))
    neg_weight = n / (2 * (n - y_cls.sum()))
    cv_probs = np.zeros(n)
    for test_idx, train_idx in folds:
        beta, intercept = logistic_fit(xs[train_idx], y_cls[train_idx], pos_weight, neg_weight)
        cv_probs[test_idx] = logistic_prob(xs[test_idx], beta, intercept)
    cls_metrics = {
        "cv_accuracy": float(((cv_probs >= 0.5) == (y_cls == 1)).mean()),
        "cv_auc": auc_score(y_cls, cv_probs),
        "positive_rate": float(y_cls.mean()),
    }
    beta_cls, intercept_cls = logistic_fit(xs, y_cls, pos_weight, neg_weight)

    print("\nRegression (predict next-term average):")
    print(f"  best lambda {best_lam} | CV MAE {reg_metrics['cv_mae']:.2f} "
          f"| CV RMSE {reg_metrics['cv_rmse']:.2f} | R2 {reg_metrics['r2']:.3f}")
    print(f"  residual std {reg_metrics['residual_std']:.2f} -> +/- band at inference")
    print("Classification (at-risk probability):")
    print(f"  CV accuracy {cls_metrics['cv_accuracy']:.1%} | CV AUC {cls_metrics['cv_auc']:.3f}")

    # --- Export ---------------------------------------------------------------
    artifact = {
        "version": 1,
        "trainedAt": date.today().isoformat(),
        "dataset": {
            "samples": int(n),
            "featureTerm": feature_term["name"],
            "targetTerm": target_term["name"],
            "source": "data/generated (synthetic, deterministic)",
            "atRiskRate": cls_metrics["positive_rate"],
        },
        "featureNames": FEATURE_NAMES,
        "standardization": {"mean": mu.tolist(), "std": sigma.tolist()},
        "regression": {
            "type": "ridge",
            "lambda": best_lam,
            "yMean": float(y_mean),
            "coef": beta_reg.tolist(),
            "residualStd": reg_metrics["residual_std"],
        },
        "classifier": {
            "type": "logistic",
            "coef": beta_cls.tolist(),
            "intercept": float(intercept_cls),
        },
        "metrics": {"regression": reg_metrics, "classification": cls_metrics},
    }
    OUT.write_text(json.dumps(artifact, indent=2) + "\n")
    print(f"\nWrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()