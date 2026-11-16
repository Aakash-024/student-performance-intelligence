/**
 * Inference for the Phase 5 ML models.
 *
 * Pure TypeScript, zero dependencies: the models are linear, so prediction is
 * a standardized dot product. This mirrors the NumPy math in
 * scripts/ml/train.py exactly (standardize -> weights -> output).
 *
 * Explainability: each feature's contribution to the prediction is
 * (standardized value x weight), in percentage points — the UI renders these
 * as a transparent "why this prediction" breakdown.
 */

import model from "./model.json";
import { FEATURE_LABELS, type FeatureName, type MlFeatures } from "./features";

const regression = model.regression;
const classifier = model.classifier;
const mean = model.standardization.mean as number[];
const std = model.standardization.std as number[];

export interface MlContribution {
  feature: FeatureName;
  label: string;
  value: number;
  /** Points of percentage added or removed from the predicted average. */
  contribution: number;
}

export interface MlPrediction {
  predictedAverage: number;
  /** +/- band around the prediction, from cross-validated residuals. */
  band: number;
  riskProbability: number;
  contributions: MlContribution[];
  modelVersion: number;
  trainedAt: string;
  metrics: {
    cvMae: number;
    r2: number;
    auc: number;
    cvAccuracy: number;
  };
}

function standardize(features: MlFeatures): number[] {
  return model.featureNames.map((name, index) => {
    const value = features[name as FeatureName];
    return (value - mean[index]) / std[index];
  });
}

export function predict(features: MlFeatures): MlPrediction {
  const xs = standardize(features);

  // Ridge regression: centered target, so the mean is added back.
  let dot = 0;
  for (let i = 0; i < xs.length; i++) dot += xs[i] * regression.coef[i];
  const predictedAverage = dot + regression.yMean;

  // Logistic regression: probability the student is at risk next term.
  let z = classifier.intercept;
  for (let i = 0; i < xs.length; i++) z += xs[i] * classifier.coef[i];
  const riskProbability = 1 / (1 + Math.exp(-z));

  const contributions: MlContribution[] = model.featureNames
    .map((name, index) => ({
      feature: name as FeatureName,
      label: FEATURE_LABELS[name as FeatureName],
      value: features[name as FeatureName],
      contribution: xs[index] * regression.coef[index],
    }))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return {
    predictedAverage,
    band: regression.residualStd,
    riskProbability,
    contributions,
    modelVersion: model.version,
    trainedAt: model.trainedAt,
    metrics: {
      cvMae: model.metrics.regression.cv_mae,
      r2: model.metrics.regression.r2,
      auc: model.metrics.classification.cv_auc,
      cvAccuracy: model.metrics.classification.cv_accuracy,
    },
  };
}
