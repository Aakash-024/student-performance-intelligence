import Link from "next/link";
import { AlertTriangle, ClipboardList, Percent, Save } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveStudents,
  getAssessmentSummaries,
  getAssessments,
  getSections,
  getSubjects,
  getTeacherContext,
  getTerms,
} from "@/lib/data";
import { assessmentLabel, formatDate, formatPercent, termLabel } from "@/lib/utils";
import { Card, EmptyState, PageHeader, ProgressBar, ReadOnlyNote, StatCard } from "@/components/ui";
import { CreateAssessmentForm, EditAssessmentForm } from "./assessment-form";

export const metadata = { title: "Assessments" };

export default async function AssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string; subject?: string }>;
}) {
  const params = await searchParams;
  const { user, profile } = await requireUser();
  const supabase = await createClient();
  const isAdmin = profile?.role === "admin";
  const canEdit = isAdmin || profile?.role === "teacher";

  const [terms, subjects, sections, assessments, summaries, students] = await Promise.all([
    getTerms(supabase),
    getSubjects(supabase),
    getSections(supabase),
    getAssessments(supabase),
    getAssessmentSummaries(supabase),
    getActiveStudents(supabase),
  ]);

  const teacherCtx =
    profile?.role === "teacher" ? await getTeacherContext(supabase, user.id) : null;
  const assignments = teacherCtx?.assignments ?? [];
  const currentTerm = terms.find((term) => term.is_current) ?? terms[terms.length - 1];

  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const sectionById = new Map(sections.map((section) => [section.id, section]));
  const summaryById = new Map(summaries.map((row) => [row.assessment_id, row]));

  // All signed-in staff see the full assessment catalogue: teachers configure
  // structure, not just their own assigned classes. Marks entry remains scoped
  // by teacher_assignments at the database level.
  const filtered = assessments.filter((assessment) => {
    if (params.term && assessment.academic_term_id !== params.term) return false;
    if (params.subject && assessment.subject_id !== params.subject) return false;
    return true;
  });

  function expectedCount(subjectId: string, termId: string) {
    if (isAdmin || !canEdit) return students.length;
    const allowedSections = new Set(
      assignments
        .filter((a) => a.subject_id === subjectId && a.academic_term_id === termId)
        .map((a) => a.section_id),
    );
    return students.filter((student) => allowedSections.has(student.section_id)).length;
  }

  const rows = filtered.map((assessment) => {
    const summary = summaryById.get(assessment.id);
    const expected = expectedCount(assessment.subject_id, assessment.academic_term_id);
    return {
      assessment,
      summary,
      expected,
      missing: Math.max(expected - (summary?.marks_count ?? 0), 0),
    };
  });

  const totalMissing = rows.reduce((sum, row) => sum + row.missing, 0);
  const avgScore = rows.filter((row) => row.summary?.avg_percentage != null).length
    ? rows.reduce((sum, row) => sum + Number(row.summary?.avg_percentage ?? 0), 0) /
      rows.filter((row) => row.summary?.avg_percentage != null).length
    : 0;

  return (
    <div>
      <PageHeader
        title="Assessments"
        description="Assessment structure, mark coverage, and entry points for every subject."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assessments" value={filtered.length} hint={`${terms.length} terms · ${subjects.length} subjects`} icon={ClipboardList} tone="indigo" />
        <StatCard label="Average score" value={formatPercent(avgScore)} hint="Across assessments with marks" icon={Percent} tone="emerald" />
        <StatCard label="Missing marks" value={totalMissing} hint="Expected entries not yet recorded" icon={AlertTriangle} tone={totalMissing ? "rose" : "slate"} />
        <StatCard label="Term" value={termLabel(currentTerm?.name ?? "—")} hint="Current academic semester" icon={Save} tone="sky" />
      </div>

      <div className="mt-5">
        {canEdit ? <CreateAssessmentForm subjects={subjects} terms={terms} /> : <ReadOnlyNote what="adding assessments" />}
      </div>

      <Card className="mt-5" bodyClassName="px-4 py-4 sm:px-5">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-brand-muted">Term</span>
            <select
              name="term"
              defaultValue={params.term ?? currentTerm?.id ?? ""}
              className="rounded-xl border border-brand-border bg-brand-navy px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-cyan"
            >
              <option value="">All terms</option>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-brand-muted">Subject</span>
            <select
              name="subject"
              defaultValue={params.subject ?? ""}
              className="rounded-xl border border-brand-border bg-brand-navy px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-cyan"
            >
              <option value="">All subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code} — {subject.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            Apply
          </button>
          <Link href="/assessments" className="rounded-xl px-2 py-2 text-sm text-brand-muted hover:text-brand-text">
            Reset
          </Link>
        </form>
      </Card>

      <div className="mt-5 overflow-hidden rounded-2xl border border-brand-border bg-brand-navy shadow-sm">
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No assessments in this scope"
              description={
                isAdmin
                  ? "Create an assessment to start entering marks."
                  : "You have no assessments assigned for the selected filters."
              }
            />
          </div>
        ) : (
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-border bg-brand-panel/70 text-xs uppercase tracking-wide text-brand-muted">
                  <th className="px-5 py-3 font-medium">Assessment</th>
                  <th className="px-3 py-3 font-medium">Term</th>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Max / weight</th>
                  <th className="px-3 py-3 font-medium">Coverage</th>
                  <th className="px-3 py-3 font-medium">Average</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {rows.map(({ assessment, summary, expected, missing }) => {
                  const subject = subjectById.get(assessment.subject_id);
                  const recorded = summary?.marks_count ?? 0;
                  const coverage = expected ? (recorded / expected) * 100 : 0;
                  return (
                    <tr key={assessment.id} className="align-top hover:bg-brand-panel/60">
                      <td className="px-5 py-3">
                        <p className="font-medium text-brand-text">
                          {subject?.code ?? "—"} · {assessmentLabel(assessment.type)}
                        </p>
                        <p className="text-xs text-brand-muted">{subject?.name ?? "Subject"}</p>
                        <div className="mt-2 max-w-xs">
                          {canEdit ? <EditAssessmentForm assessment={assessment} /> : null}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-brand-muted">
                        {termLabel(assessment.academic_terms?.name ?? "—")}
                      </td>
                      <td className="px-3 py-3 text-brand-muted">{formatDate(assessment.date)}</td>
                      <td className="px-3 py-3 text-brand-muted">
                        {assessment.max_marks} / {assessment.weightage_percent}%
                      </td>
                      <td className="px-3 py-3">
                        <div className="w-36">
                          <div className="mb-1 flex justify-between text-xs">
                            <span
                              className={
                                missing > 0 ? "font-medium text-amber-400" : "font-medium text-emerald-400"
                              }
                            >
                              {recorded}/{expected}
                            </span>
                            <span className="text-brand-muted">{missing > 0 ? `${missing} missing` : "complete"}</span>
                          </div>
                          <ProgressBar value={coverage} tone={missing > 0 ? "amber" : "emerald"} />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={
                            (summary?.avg_percentage ?? 0) < 40
                              ? "font-medium text-rose-400"
                              : "font-medium text-brand-text"
                          }
                        >
                          {summary?.avg_percentage != null ? formatPercent(summary.avg_percentage) : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/assessments/${assessment.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-blue px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-110"
                        >
                          {missing > 0 ? "Enter marks" : "Review marks"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-brand-muted">
        {isAdmin || !canEdit
          ? `Coverage is measured against all ${students.length} active students.`
          : `Coverage is measured against students in your assigned sections (${sections.filter((s) => assignments.some((a) => a.section_id === s.id)).length} sections).`}
      </p>
    </div>
  );
}
