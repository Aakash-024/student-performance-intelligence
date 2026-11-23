import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ClipboardList, Percent, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveStudents,
  getAssessmentSummaries,
  getMarkAudit,
  getSections,
  getTeacherContext,
} from "@/lib/data";
import { assessmentLabel, formatDate, formatPercent, termLabel } from "@/lib/utils";
import { Card, PageHeader, ProgressBar, StatCard } from "@/components/ui";
import { MarksForm } from "./marks-form";

export const metadata = { title: "Marks entry" };

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, profile } = await requireUser();
  const supabase = await createClient();

  const { data: assessment } = await supabase
    .from("assessments")
    .select("*, subjects(id, code, name), academic_terms(name)")
    .eq("id", id)
    .maybeSingle();

  if (!assessment) notFound();

  const [students, sections, summaries] = await Promise.all([
    getActiveStudents(supabase),
    getSections(supabase),
    getAssessmentSummaries(supabase),
  ]);

  const teacherCtx =
    profile?.role === "teacher" ? await getTeacherContext(supabase, user.id) : null;
  const assignments = teacherCtx?.assignments ?? [];
  const isAdmin = profile?.role === "admin";
  const isStaff = isAdmin || profile?.role === "teacher";

  // Teachers see only sections they are assigned for this subject + term.
  // Viewers (demo accounts) see every section but cannot edit.
  const allowedSectionIds = !isStaff || isAdmin
    ? new Set(sections.map((section) => section.id))
    : new Set(
        assignments
          .filter(
            (assignment) =>
              assignment.subject_id === assessment.subject_id &&
              assignment.academic_term_id === assessment.academic_term_id,
          )
          .map((assignment) => assignment.section_id),
      );

  const editable = isStaff && (isAdmin || allowedSectionIds.size > 0);
  const scopedStudents = students.filter((student) => allowedSectionIds.has(student.section_id));
  const sectionById = new Map(sections.map((section) => [section.id, section]));

  const { data: marks } = await supabase
    .from("marks")
    .select("student_id, marks_obtained, is_absent")
    .eq("assessment_id", id);

  const audit = await getMarkAudit(supabase, id);
  const studentById = new Map(students.map((student) => [student.id, student.name]));

  const markByStudent = new Map(
    (marks ?? []).map((mark) => [
      mark.student_id as string,
      { marks_obtained: Number(mark.marks_obtained), is_absent: Boolean(mark.is_absent) },
    ]),
  );

  const rows = scopedStudents.map((student) => {
    const existing = markByStudent.get(student.id);
    return {
      id: student.id,
      name: student.name,
      register_number: student.register_number,
      section_name: sectionById.get(student.section_id)?.name ?? "—",
      marks_obtained: existing ? existing.marks_obtained : null,
      is_absent: existing ? existing.is_absent : false,
    };
  });

  const summary = summaries.find((row) => row.assessment_id === id);
  const recorded = summary?.marks_count ?? 0;
  const missing = Math.max(scopedStudents.length - recorded, 0);
  const subject = assessment.subjects as { code: string; name: string } | null;

  return (
    <div>
      <Link
        href="/assessments"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-brand-muted transition hover:text-brand-text"
      >
        <ArrowLeft className="h-4 w-4" /> Back to assessments
      </Link>

      <PageHeader
        title={`${subject?.code ?? "—"} · ${assessmentLabel(assessment.type)}`}
        description={`${subject?.name ?? "Subject"} · ${assessment.academic_terms?.name ?? "Term"} · maximum ${assessment.max_marks} marks at ${assessment.weightage_percent}% weightage`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students in scope" value={scopedStudents.length} hint={isAdmin || !isStaff ? "All active students" : "Your assigned sections"} icon={Users} tone="indigo" />
        <StatCard label="Marks recorded" value={recorded} hint={missing > 0 ? `${missing} missing` : "Complete"} icon={ClipboardList} tone={missing ? "amber" : "emerald"} />
        <StatCard label="Average" value={formatPercent(summary?.avg_percentage ?? 0)} hint="Weighted score for this assessment" icon={Percent} tone="sky" />
        <StatCard label="Exam date" value={formatDate(assessment.date)} hint={termLabel(assessment.academic_terms?.name ?? "Term")} icon={CalendarDays} tone="slate" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="w-full max-w-sm">
          <div className="mb-1 flex justify-between text-xs text-brand-muted">
            <span>Coverage</span>
            <span className="font-medium text-brand-text">
              {scopedStudents.length ? ((recorded / scopedStudents.length) * 100).toFixed(0) : 0}%
            </span>
          </div>
          <ProgressBar
            value={scopedStudents.length ? (recorded / scopedStudents.length) * 100 : 0}
            tone={missing > 0 ? "amber" : "emerald"}
          />
        </div>
        {summary?.absent_count ? (
          <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-400 ring-1 ring-rose-500/25">
            {summary.absent_count} absent
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        {scopedStudents.length === 0 ? (
          <Card title="No students in scope">
            <p className="text-sm text-brand-muted">
              You are not assigned to any section for this subject in this term. Ask an administrator
              to assign the class to you.
            </p>
          </Card>
        ) : (
          <MarksForm assessmentId={id} maxMarks={assessment.max_marks} rows={rows} editable={editable} />
        )}
      </div>

      <Card
        title="Correction history"
        description="Changes to marks already recorded (new entries are not shown)"
        className="mt-5"
        bodyClassName="px-0 py-0"
      >
        {audit.length === 0 ? (
          <p className="px-5 py-4 text-sm text-brand-muted">No corrections recorded yet.</p>
        ) : (
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-border bg-brand-panel/70 text-xs uppercase tracking-wide text-brand-muted">
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-3 py-3 font-medium">Change</th>
                  <th className="px-3 py-3 font-medium">Edited by</th>
                  <th className="px-5 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {audit.map((entry) => (
                  <tr key={entry.id} className="hover:bg-brand-panel/70">
                    <td className="px-5 py-3 text-brand-text">
                      {studentById.get(entry.student_id) ?? "Student"}
                    </td>
                    <td className="px-3 py-3 text-brand-muted">
                      {entry.old_is_absent ? "Absent" : Number(entry.old_marks).toFixed(1)} →{" "}
                      {entry.new_is_absent ? "Absent" : Number(entry.new_marks).toFixed(1)}
                    </td>
                    <td className="px-3 py-3 text-brand-muted">
                      {entry.actor_role}
                    </td>
                    <td className="px-5 py-3 text-brand-muted">{formatDate(entry.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
