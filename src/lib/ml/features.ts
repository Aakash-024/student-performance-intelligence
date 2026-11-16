/**
 * Feature computation for the Phase 5 ML models.
 *
 * CRITICAL: this must compute features identically to scripts/ml/train.py —
 * both sides document the exact same definitions. Any change here requires a
 * retrain (python scripts/ml/train.py) and vice versa.
 *
 * Features are computed from the CURRENT term's data; the models predict the
 * NEXT term's average and at-risk probability.
 */

import type { StudentOverview } from "@/lib/types";

/** Matches marks rows as selected by getStudentDetail (assessments joined). */
export interface MarkRow {
  marks_obtained: number;
  is_absent: boolean;
  assessments: {
    type: string;
    max_marks: number;
    date: string | null;
    subject_id: string;
    academic_terms: { name: string } | null;
  } | null;
}

export const FEATURE_LABELS = {
  avg_percentage: "Current-term average",
  attendance_percentage: "Attendance",
  subjects_passed_ratio: "Subjects passed ratio",
  cat1_pct: "CAT-1 average",
  cat2_pct: "CAT-2 average",
  internal_pct: "Internal assessment average",
  semester_pct: "Semester exam average",
  cat_trend: "CAT-1 to CAT-2 trend",
  absent_rate: "Assessment absence rate",
} as const;

export type FeatureName = keyof typeof FEATURE_LABELS;

export const FEATURE_NAMES = Object.keys(FEATURE_LABELS) as FeatureName[];

export interface MlFeatures {
  avg_percentage: number;
  attendance_percentage: number;
  subjects_passed_ratio: number;
  cat1_pct: number;
  cat2_pct: number;
  internal_pct: number;
  semester_pct: number;
  cat_trend: number;
  absent_rate: number;
}

/**
 * Builds the model's feature vector from data already fetched for the student
 * detail page — no extra database queries.
 *
 * `termName` selects the term to compute features for (the models are trained
 * to map one term onto the following one).
 */
export function buildFeatures(options: {
  overview: StudentOverview | null;
  marks: MarkRow[];
  termName: string;
}): MlFeatures {
  const { overview, marks, termName } = options;

  const termMarks = marks.filter(
    (mark) => mark.assessments?.academic_terms?.name === termName,
  );

  const pct = (mark: MarkRow) =>
    mark.is_absent
      ? 0
      : (mark.marks_obtained / (mark.assessments?.max_marks ?? 1)) * 100;

  const avgPercentage = overview?.avg_percentage ?? 0;
  const meanByType = (type: string) => {
    const rows = termMarks.filter((mark) => mark.assessments?.type === type);
    return rows.length ? rows.reduce((sum, row) => sum + pct(row), 0) / rows.length : avgPercentage;
  };

  // Per-subject CAT2 minus CAT1, averaged — mirrors train.py's cat_trend.
  const bySubject = new Map<string, { cat1: number | null; cat2: number | null }>();
  for (const mark of termMarks) {
    const assessment = mark.assessments;
    if (!assessment || (assessment.type !== "cat1" && assessment.type !== "cat2")) continue;
    const entry = bySubject.get(assessment.subject_id) ?? { cat1: null, cat2: null };
    entry[assessment.type] = pct(mark);
    bySubject.set(assessment.subject_id, entry);
  }
  const trends = [...bySubject.values()]
    .filter((entry) => entry.cat1 !== null && entry.cat2 !== null)
    .map((entry) => (entry.cat2 as number) - (entry.cat1 as number));

  return {
    avg_percentage: avgPercentage,
    attendance_percentage: overview?.attendance_percentage ?? 0,
    subjects_passed_ratio:
      overview && overview.subjects_count > 0
        ? overview.subjects_passed / overview.subjects_count
        : 0,
    cat1_pct: meanByType("cat1"),
    cat2_pct: meanByType("cat2"),
    internal_pct: meanByType("internal"),
    semester_pct: meanByType("semester"),
    cat_trend: trends.length ? trends.reduce((sum, value) => sum + value, 0) / trends.length : 0,
    absent_rate: termMarks.length
      ? termMarks.filter((mark) => mark.is_absent).length / termMarks.length
      : 0,
  };
}
