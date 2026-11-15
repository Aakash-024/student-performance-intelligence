/**
 * Context builder for the V2 AI agents.
 *
 * Everything here runs with the *signed-in user's* Supabase client, so the
 * evidence pack can only ever contain rows that Postgres RLS already allows
 * this user to see. The agent layer adds no additional data access of its own.
 */

import {
  getStudentDetail,
  getSubjects,
  getTerms,
} from "@/lib/data";
import { formatPercent, indicatorMeta, termLabel } from "@/lib/utils";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface StudentRiskContext {
  studentId: string;
  studentName: string;
  registerNumber: string;
  indicatorLabel: string;
  evidence: string;
}

const subjectById = (rows: Awaited<ReturnType<typeof getSubjects>>) =>
  new Map(rows.map((subject) => [subject.id, subject]));

/**
 * Builds a compact, numeric evidence pack for one student. The text is the
 * only context the model receives: it cannot see data that is not in here.
 */
export async function buildStudentRiskContext(
  supabase: SupabaseClient,
  studentId: string,
): Promise<StudentRiskContext | null> {
  const detail = await getStudentDetail(supabase, studentId);
  if (!detail) return null;

  const [terms, subjects] = await Promise.all([getTerms(supabase), getSubjects(supabase)]);
  const subjectsById = subjectById(subjects);
  const termById = new Map(terms.map((term) => [term.id, term]));

  const { student, overview, subjectPerformance, attendance, marks } = detail;
  const currentTerm = terms.find((term) => term.is_current) ?? terms[terms.length - 1];

  const lines: string[] = [];

  lines.push(
    `STUDENT: ${student.name} (register number ${student.register_number}), ` +
      `section ${student.sections?.name ?? "—"}, year ${student.current_year}, status ${student.status}.`,
  );

  if (overview) {
    lines.push(
      `OVERALL: average ${formatPercent(overview.avg_percentage)} across ${overview.subjects_count} subjects ` +
        `(${overview.subjects_passed} passed), attendance ${formatPercent(overview.attendance_percentage)}.`,
    );
    if (overview.previous_percentage !== null) {
      lines.push(
        `TERM-OVER-TERM: previous term average ${formatPercent(overview.previous_percentage)}, ` +
          `change ${overview.change >= 0 ? "+" : ""}${overview.change.toFixed(1)} points.`,
      );
    } else {
      lines.push("TERM-OVER-TERM: no previous-term data available.");
    }
    lines.push(`RULE-BASED INDICATOR: ${indicatorMeta[overview.indicator].label}.`);
  } else {
    lines.push("OVERALL: no aggregated performance data available for this student yet.");
  }

  const currentSubjects = subjectPerformance.filter(
    (row) => row.academic_term_id === currentTerm?.id,
  );
  if (currentSubjects.length) {
    lines.push(
      `SUBJECT PERFORMANCE (${termLabel(currentTerm?.name ?? "current term")}, weighted percentage, subjects with fewer assessments are less reliable):`,
    );
    for (const row of currentSubjects) {
      const subject = subjectsById.get(row.subject_id);
      lines.push(
        `- ${subject?.code ?? "—"} ${subject?.name ?? "Unknown subject"}: ` +
          `${row.percentage.toFixed(1)}% over ${row.assessments_taken} assessments.`,
      );
    }
  }

  if (attendance.length) {
    lines.push("ATTENDANCE BY TERM (present sessions / total sessions):");
    for (const row of attendance) {
      const term = termById.get(row.academic_term_id);
      lines.push(
        `- ${termLabel(term?.name ?? "Term")}: ${row.attendance_percentage.toFixed(1)}% ` +
          `across ${row.sessions_count} sessions.`,
      );
    }
  }

  const recentMarks = marks
    .filter((mark) => mark.assessments)
    .sort((a, b) => (b.assessments!.date ?? "").localeCompare(a.assessments!.date ?? ""))
    .slice(0, 15);
  if (recentMarks.length) {
    lines.push("MOST RECENT ASSESSMENTS (percentage score):");
    for (const mark of recentMarks) {
      const assessment = mark.assessments!;
      const subject = subjectsById.get(assessment.subject_id);
      const percentage = mark.is_absent
        ? 0
        : (mark.marks_obtained / assessment.max_marks) * 100;
      lines.push(
        `- ${assessment.date ?? "undated"} ${subject?.code ?? "—"} ${assessment.type.toUpperCase()} ` +
          `(${termLabel(assessment.academic_terms?.name ?? "—")}): ` +
          `${mark.is_absent ? "absent" : `${mark.marks_obtained}/${assessment.max_marks} = ${percentage.toFixed(1)}%`}.`,
      );
    }
  }

  lines.push(
    "CLASSIFICATION THRESHOLDS used by the platform: at risk if average < 40% or attendance < 60%; " +
      "declining if the average dropped 5+ points versus the previous term; high performer if average >= 75% " +
      "and attendance >= 85%; improving if the average gained 5+ points; on track otherwise.",
  );

  return {
    studentId: student.id,
    studentName: student.name,
    registerNumber: student.register_number,
    indicatorLabel: overview ? indicatorMeta[overview.indicator].label : "Unknown",
    evidence: lines.join("\n"),
  };
}
