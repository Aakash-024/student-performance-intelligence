import Link from "next/link";
import { Search, SlidersHorizontal, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSections, getStudentOverview, getTeacherContext } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import type { Indicator } from "@/lib/types";
import { formatPercent, INDICATOR_ORDER, indicatorMeta } from "@/lib/utils";
import { Card, EmptyState, Flash, IndicatorBadge, PageHeader, ProgressBar } from "@/components/ui";
import { CreateStudentForm } from "./student-form";

export const metadata = { title: "Students" };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; section?: string; indicator?: string; flash?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { user, profile } = await requireUser();

  const [sections, students] = await Promise.all([
    getSections(supabase),
    getStudentOverview(supabase, {
      sectionId: params.section,
      indicator: params.indicator,
      search: params.q,
    }),
  ]);

  const teacherCtx =
    profile?.role === "teacher" ? await getTeacherContext(supabase, user.id) : null;
  const allowedSections = teacherCtx
    ? new Set(teacherCtx.assignments.map((assignment) => assignment.section_id))
    : null;
  const visible = allowedSections
    ? students.filter((student) => allowedSections.has(student.section_id))
    : students;

  const avg = visible.length
    ? visible.reduce((sum, student) => sum + student.avg_percentage, 0) / visible.length
    : 0;
  const isAdmin = profile?.role === "admin";

  return (
    <div>
      <PageHeader
        title="Students"
        description="Every active student with current-term performance, attendance, and early-warning status."
      />

      <Flash message={params.flash} />

      {isAdmin ? (
        <div className="mb-5">
          <CreateStudentForm sections={sections} />
        </div>
      ) : null}

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">In view</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{visible.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Average score</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{formatPercent(avg)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Needs attention</p>
          <p className="mt-1 text-2xl font-semibold text-rose-600">
            {visible.filter((student) => ["at_risk", "declining"].includes(student.indicator)).length}
          </p>
        </div>
      </div>

      <Card bodyClassName="px-4 py-4 sm:px-5">
        <form method="get" className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Search by name or register number…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filter
            </span>
            <select
              name="section"
              defaultValue={params.section ?? ""}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
            >
              <option value="">All sections</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  Section {section.name}
                </option>
              ))}
            </select>

            <select
              name="indicator"
              defaultValue={params.indicator ?? ""}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
            >
              <option value="">All indicators</option>
              {INDICATOR_ORDER.map((indicator) => (
                <option key={indicator} value={indicator}>
                  {indicatorMeta[indicator].label}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Apply
            </button>
            {params.q || params.section || params.indicator ? (
              <Link
                href="/students"
                className="rounded-xl px-2 py-2 text-sm text-slate-500 transition hover:text-slate-800"
              >
                Reset
              </Link>
            ) : null}
          </div>
        </form>
      </Card>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {visible.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No students match these filters"
              description="Try clearing the search or choosing a different section."
              action={
                <Link
                  href="/students"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white"
                >
                  <Users className="h-4 w-4" /> Show all students
                </Link>
              }
            />
          </div>
        ) : (
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-3 py-3 font-medium">Section</th>
                  <th className="px-3 py-3 font-medium">Average</th>
                  <th className="px-3 py-3 font-medium">Attendance</th>
                  <th className="px-3 py-3 font-medium">Change</th>
                  <th className="px-5 py-3 font-medium">Indicator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((student) => (
                  <tr key={student.student_id} className="transition hover:bg-slate-50/70">
                    <td className="px-5 py-3">
                      <Link href={`/students/${student.student_id}`} className="group block">
                        <p className="font-medium text-slate-800 group-hover:text-indigo-600">
                          {student.name}
                        </p>
                        <p className="text-xs text-slate-500">{student.register_number}</p>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{student.section_name}</td>
                    <td className="px-3 py-3">
                      <div className="w-32">
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="font-medium text-slate-700">
                            {formatPercent(student.avg_percentage)}
                          </span>
                          <span className="text-slate-400">
                            {student.subjects_passed}/{student.subjects_count} passed
                          </span>
                        </div>
                        <ProgressBar
                          value={student.avg_percentage}
                          tone={
                            student.avg_percentage < 40
                              ? "rose"
                              : student.avg_percentage < 55
                                ? "amber"
                                : "indigo"
                          }
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={
                          student.attendance_percentage < 60 ? "font-medium text-rose-600" : "text-slate-600"
                        }
                      >
                        {formatPercent(student.attendance_percentage)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={
                          student.change > 0
                            ? "text-emerald-600"
                            : student.change < 0
                              ? "text-rose-600"
                              : "text-slate-500"
                        }
                      >
                        {student.change > 0 ? "+" : ""}
                        {student.change.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <IndicatorBadge indicator={student.indicator as Indicator} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Showing {visible.length} students · Indicators use deterministic thresholds (see dashboard).
      </p>
    </div>
  );
}
