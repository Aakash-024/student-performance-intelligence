import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, Percent, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSections, getSubjects, getTeacherContext, getTerms } from "@/lib/data";
import { formatDate, formatPercent, termLabel } from "@/lib/utils";
import { Card, PageHeader, ProgressBar, StatCard } from "@/components/ui";
import { AttendanceForm } from "./attendance-form";

export const metadata = { title: "Session attendance" };

export default async function AttendanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, profile } = await requireUser();
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("attendance_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!session) notFound();

  const [subjects, sections, terms] = await Promise.all([
    getSubjects(supabase),
    getSections(supabase),
    getTerms(supabase),
  ]);

  const { data: students } = await supabase
    .from("students")
    .select("id, name, register_number")
    .eq("section_id", session.section_id)
    .eq("status", "active")
    .order("register_number", { ascending: true });

  const { data: records } = await supabase
    .from("attendance_records")
    .select("student_id, is_present")
    .eq("attendance_session_id", id);

  const teacherCtx =
    profile?.role === "teacher" ? await getTeacherContext(supabase, user.id) : null;
  const isAdmin = profile?.role === "admin";
  const canWrite =
    isAdmin ||
    (teacherCtx?.assignments ?? []).some(
      (assignment) =>
        assignment.subject_id === session.subject_id &&
        assignment.section_id === session.section_id,
    );

  const recordByStudent = new Map(
    (records ?? []).map((record) => [record.student_id as string, Boolean(record.is_present)]),
  );

  const rows = (students ?? []).map((student) => ({
    id: student.id as string,
    name: student.name as string,
    register_number: student.register_number as string,
    is_present: recordByStudent.get(student.id as string) ?? true,
    recorded: recordByStudent.has(student.id as string),
  }));

  const presentCount = rows.filter((row) => recordByStudent.get(row.id)).length;
  const recordedCount = rows.filter((row) => row.recorded).length;
  const percentage = recordedCount ? (presentCount / recordedCount) * 100 : 0;

  const subject = subjects.find((item) => item.id === session.subject_id);
  const section = sections.find((item) => item.id === session.section_id);
  const term = terms.find((item) => item.id === session.academic_term_id);

  return (
    <div>
      <Link
        href="/attendance"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-brand-muted transition hover:text-brand-text"
      >
        <ArrowLeft className="h-4 w-4" /> Back to attendance
      </Link>

      <PageHeader
        title={`${subject?.code ?? "—"} · Section ${section?.name ?? "—"}`}
        description={`${formatDate(session.session_date)} · Period ${session.period_number} · ${termLabel(term?.name ?? "Term")}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={rows.length} hint={`Section ${section?.name ?? "—"}`} icon={Users} tone="indigo" />
        <StatCard label="Recorded" value={`${recordedCount}/${rows.length}`} hint={recordedCount === rows.length ? "Complete" : "Not saved yet"} icon={CalendarDays} tone={recordedCount === rows.length ? "emerald" : "amber"} />
        <StatCard label="Attendance" value={formatPercent(percentage)} hint={`${presentCount} present`} icon={Percent} tone="sky" />
        <StatCard label="Period" value={`P${session.period_number}`} hint={formatDate(session.session_date)} icon={Clock} tone="slate" />
      </div>

      <div className="mt-4 w-full max-w-sm">
        <div className="mb-1 flex justify-between text-xs text-brand-muted">
          <span>Session attendance</span>
          <span className="font-medium text-brand-text">{formatPercent(percentage)}</span>
        </div>
        <ProgressBar value={percentage} tone={percentage < 60 ? "rose" : percentage < 80 ? "amber" : "emerald"} />
      </div>

      <div className="mt-5">
        {rows.length === 0 ? (
          <Card title="No students in this section">
            <p className="text-sm text-brand-muted">
              Add students to section {section?.name ?? "—"} before taking attendance.
            </p>
          </Card>
        ) : (
          <AttendanceForm sessionId={id} students={rows} editable={canWrite} />
        )}
      </div>
    </div>
  );
}
