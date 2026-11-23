import Link from "next/link";
import { CalendarCheck, CalendarDays, Percent, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getSections,
  getSessions,
  getSubjects,
  getTeacherContext,
  getTerms,
} from "@/lib/data";
import { formatDate, formatPercent, termLabel } from "@/lib/utils";
import { Card, EmptyState, PageHeader, ProgressBar, ReadOnlyNote, StatCard } from "@/components/ui";
import { CreateSessionForm } from "./session-form";

export const metadata = { title: "Attendance" };

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; section?: string; term?: string }>;
}) {
  const params = await searchParams;
  const { user, profile } = await requireUser();
  const supabase = await createClient();
  const isAdmin = profile?.role === "admin";
  const canEdit = isAdmin || profile?.role === "teacher";

  const [sessions, subjects, sections, terms] = await Promise.all([
    getSessions(supabase),
    getSubjects(supabase),
    getSections(supabase),
    getTerms(supabase),
  ]);

  const teacherCtx =
    profile?.role === "teacher" ? await getTeacherContext(supabase, user.id) : null;
  const assignments = teacherCtx?.assignments ?? [];
  const allowedTeacherSections = new Set(assignments.map((a) => a.section_id));

  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const sectionById = new Map(sections.map((section) => [section.id, section]));

  const visible = sessions.filter((session) => {
    // Teachers are scoped to their assigned sections; admins and demo viewers
    // see every session (viewers read-only).
    if (profile?.role === "teacher" && !allowedTeacherSections.has(session.section_id)) return false;
    if (params.subject && session.subject_id !== params.subject) return false;
    if (params.section && session.section_id !== params.section) return false;
    if (params.term && session.academic_term_id !== params.term) return false;
    return true;
  });

  const recorded = visible.filter((session) => session.student_count > 0);
  const totalPresent = recorded.reduce((sum, session) => sum + session.present_count, 0);
  const totalRecords = recorded.reduce((sum, session) => sum + session.student_count, 0);
  const averageAttendance = totalRecords ? (totalPresent / totalRecords) * 100 : 0;

  const pendingSessions = visible.length - recorded.length;
  const currentTerm = terms.find((term) => term.is_current) ?? terms[terms.length - 1];

  const recent = visible.slice(0, 30);

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Create class sessions and record present or absent students."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sessions" value={visible.length} hint={`${currentTerm?.name ?? "Current term"}`} icon={CalendarDays} tone="indigo" />
        <StatCard label="Average attendance" value={formatPercent(averageAttendance)} hint={`${totalPresent}/${totalRecords} present marks`} icon={Percent} tone="emerald" />
        <StatCard label="Students covered" value={new Set(visible.map((s) => s.section_id)).size} hint="Sections with sessions in view" icon={Users} tone="sky" />
        <StatCard label="Awaiting records" value={pendingSessions} hint="Sessions with no attendance saved" icon={CalendarCheck} tone={pendingSessions ? "amber" : "slate"} />
      </div>

      <div className="mt-5">
        {canEdit ? (
          <CreateSessionForm
            subjects={subjects}
            sections={sections}
            terms={terms}
            assignments={assignments}
            isAdmin={isAdmin}
          />
        ) : (
          <ReadOnlyNote what="creating sessions" />
        )}
      </div>

      <Card className="mt-5" bodyClassName="px-4 py-4 sm:px-5">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-brand-muted">Term</span>
            <select
              name="term"
              defaultValue={params.term ?? ""}
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
                  {subject.code}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-brand-muted">Section</span>
            <select
              name="section"
              defaultValue={params.section ?? ""}
              className="rounded-xl border border-brand-border bg-brand-navy px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-cyan"
            >
              <option value="">All sections</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  Section {section.name}
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
          <Link href="/attendance" className="rounded-xl px-2 py-2 text-sm text-brand-muted hover:text-brand-text">
            Reset
          </Link>
        </form>
      </Card>

      <div className="mt-5 overflow-hidden rounded-2xl border border-brand-border bg-brand-navy shadow-sm">
        {recent.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No attendance sessions yet"
              description={
                isAdmin
                  ? "Create a session above to start recording attendance."
                  : "Create a session for one of your assigned classes."
              }
            />
          </div>
        ) : (
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-border bg-brand-panel/70 text-xs uppercase tracking-wide text-brand-muted">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Subject</th>
                  <th className="px-3 py-3 font-medium">Section</th>
                  <th className="px-3 py-3 font-medium">Period</th>
                  <th className="px-3 py-3 font-medium">Attendance</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {recent.map((session) => {
                  const percentage = session.student_count
                    ? (session.present_count / session.student_count) * 100
                    : 0;
                  return (
                    <tr key={session.id} className="hover:bg-brand-panel/60">
                      <td className="px-5 py-3 text-brand-text">{formatDate(session.session_date)}</td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-brand-text">
                          {subjectById.get(session.subject_id)?.code ?? "—"}
                        </p>
                        <p className="text-xs text-brand-muted">
                          {termLabel(terms.find((t) => t.id === session.academic_term_id)?.name ?? "—")}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-brand-muted">
                        {sectionById.get(session.section_id)?.name ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-brand-muted">P{session.period_number}</td>
                      <td className="px-3 py-3">
                        <div className="w-40">
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="font-medium text-brand-text">
                              {session.student_count
                                ? `${session.present_count}/${session.student_count}`
                                : "Not recorded"}
                            </span>
                            <span className="text-brand-muted">
                              {session.student_count ? formatPercent(percentage) : "—"}
                            </span>
                          </div>
                          <ProgressBar
                            value={percentage}
                            tone={percentage < 60 ? "rose" : percentage < 80 ? "amber" : "emerald"}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/attendance/${session.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-text transition hover:border-brand-cyan/60 hover:text-brand-cyan"
                        >
                          {session.student_count ? "Review" : "Mark attendance"}
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
        Showing the {recent.length} most recent sessions in view.
      </p>
    </div>
  );
}
