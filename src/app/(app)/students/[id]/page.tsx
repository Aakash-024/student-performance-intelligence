import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarCheck, GraduationCap, Mail, TrendingDown, TrendingUp } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getDepartments,
  getSections,
  getStudentDetail,
  getStudentOverview,
  getSubjects,
  getTerms,
} from "@/lib/data";
import { formatDotDate, toAcademicYear } from "@/lib/progress-report";
import { formatDate, formatPercent, indicatorMeta, termLabel } from "@/lib/utils";
import { Card, IndicatorBadge, PageHeader, ProgressBar, StatCard } from "@/components/ui";
import { AssessmentTrendChart, SubjectRadarChart } from "@/components/charts";
import { ReportButton } from "@/components/report-button";
import { progressReportConfig } from "@/lib/report-config";
import { EditStudentForm } from "../student-form";

export const metadata = { title: "Student" };

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await requireUser();
  const supabase = await createClient();

  const detail = await getStudentDetail(supabase, id);
  if (!detail) notFound();

  const [terms, subjects, sectionPeers, sections, departments] = await Promise.all([
    getTerms(supabase),
    getSubjects(supabase),
    getStudentOverview(supabase),
    getSections(supabase),
    getDepartments(supabase),
  ]);

  const { student, overview, subjectPerformance, attendance, marks } = detail;
  const currentTerm = terms.find((term) => term.is_current) ?? terms[terms.length - 1];
  const previousTerm = [...terms]
    .filter((term) => term.id !== currentTerm?.id)
    .sort((a, b) => b.start_date.localeCompare(a.start_date))[0];

  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const termById = new Map(terms.map((term) => [term.id, term]));

  const currentSubjects = subjectPerformance.filter(
    (row) => row.academic_term_id === currentTerm?.id,
  );
  const previousSubjects = new Map(
    subjectPerformance
      .filter((row) => row.academic_term_id === previousTerm?.id)
      .map((row) => [row.subject_id, row.percentage]),
  );

  const radarData = currentSubjects.map((row) => ({
    subject: subjectById.get(row.subject_id)?.code ?? "—",
    current: Number(row.percentage.toFixed(1)),
    previous: Number((previousSubjects.get(row.subject_id) ?? 0).toFixed(1)),
  }));

  const attendanceRows = attendance
    .map((row) => ({
      term: termById.get(row.academic_term_id)?.name ?? "Term",
      percentage: row.attendance_percentage,
      sessions: row.sessions_count,
    }))
    .sort((a, b) => a.term.localeCompare(b.term));

  const trendData = marks
    .filter((mark) => mark.assessments)
    .map((mark) => {
      const assessment = mark.assessments!;
      return {
        label: `${subjectById.get(assessment.subject_id)?.code ?? ""} ${assessment.type.toUpperCase()}`,
        score: mark.is_absent ? 0 : (mark.marks_obtained / assessment.max_marks) * 100,
        date: assessment.date ?? "",
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ label, score }) => ({ label, score: Number(score.toFixed(1)) }));

  const sameSection = overview
    ? sectionPeers.filter((row) => row.section_id === overview.section_id)
    : [];
  const rank =
    [...sameSection]
      .sort((a, b) => b.avg_percentage - a.avg_percentage)
      .findIndex((row) => row.student_id === id) + 1;

  // ---- Progress-report PDF data ---------------------------------------------
  const sectionInfo = sections.find((section) => section.id === student.section_id);
  const department = departments.find((dept) => dept.id === sectionInfo?.department_id);
  const departmentCode = progressReportConfig.departmentCode || department?.code || "—";
  const departmentName = progressReportConfig.departmentName || department?.name || "—";

  const cat1BySubject = new Map(
    marks
      .filter(
        (mark) =>
          mark.assessments?.type === "cat1" &&
          mark.assessments.academic_terms?.name === currentTerm?.name,
      )
      .map((mark) => [mark.assessments!.subject_id, mark]),
  );

  const reportData = {
    name: student.name,
    registerNumber: student.register_number,
    year: student.current_year,
    section: departmentCode === "—" ? (student.sections?.name ?? "—") : `${departmentCode}-${student.sections?.name ?? "—"}`,
    departmentName,
    departmentCode,
    course: `B.TECH (${departmentCode})`,
    semester: currentTerm?.semester ?? 1,
    academicYear: currentTerm ? toAcademicYear(currentTerm.year) : "—",
    attendancePercent: overview?.attendance_percentage ?? 0,
    attendanceFrom: formatDotDate(currentTerm?.start_date),
    attendanceTo: formatDotDate(currentTerm?.end_date),
    subjects: currentSubjects.map((row) => {
      const subject = subjectById.get(row.subject_id);
      const mark = cat1BySubject.get(row.subject_id);
      return {
        code: subject?.code ?? "—",
        name: subject?.name ?? "Subject",
        marks: mark && !mark.is_absent ? Number(mark.marks_obtained) : null,
        maxMarks: mark?.assessments?.max_marks ?? 0,
        absent: mark?.is_absent ?? false,
      };
    }),
    reportDate: formatDotDate(new Date().toISOString().slice(0, 10)),
  };

  return (
    <div>
      <Link
        href="/students"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to students
      </Link>

      <PageHeader
        title={student.name}
        description={`${student.register_number} · Section ${student.sections?.name ?? "—"} · Year ${student.current_year}`}
        actions={<ReportButton data={reportData} />}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        {overview ? <IndicatorBadge indicator={overview.indicator} /> : null}
        {student.email ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Mail className="h-3.5 w-3.5" /> {student.email}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <GraduationCap className="h-3.5 w-3.5" /> Rank {Math.max(rank, 1)} of {sameSection.length}
        </span>
      </div>

      {profile?.role === "admin" ? (
        <div className="mb-5 max-w-md">
          <EditStudentForm
            student={{
              id: student.id,
              name: student.name,
              email: student.email,
              section_id: student.section_id,
              current_year: student.current_year,
              status: student.status,
            }}
            sections={sections}
          />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Overall average"
          value={formatPercent(overview?.avg_percentage ?? 0)}
          hint={`${overview?.subjects_passed ?? 0}/${overview?.subjects_count ?? 0} subjects passed`}
          icon={TrendingUp}
          tone="indigo"
        />
        <StatCard
          label="Attendance"
          value={formatPercent(overview?.attendance_percentage ?? 0)}
          hint={attendanceRows.map((row) => `${termLabel(row.term)}: ${row.percentage.toFixed(0)}%`).join(" · ")}
          icon={CalendarCheck}
          tone="sky"
        />
        <StatCard
          label="Term-over-term"
          value={`${(overview?.change ?? 0) >= 0 ? "+" : ""}${(overview?.change ?? 0).toFixed(1)}`}
          hint={previousTerm ? `versus ${termLabel(previousTerm.name)}` : "No previous term"}
          icon={(overview?.change ?? 0) >= 0 ? TrendingUp : TrendingDown}
          tone={(overview?.change ?? 0) >= 0 ? "emerald" : "rose"}
        />
        <StatCard
          label="Class rank"
          value={`#${Math.max(rank, 1)}`}
          hint={`of ${sameSection.length} students in section ${student.sections?.name ?? "—"}`}
          icon={GraduationCap}
          tone="amber"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <Card
          title="Subject scores"
          description={`${termLabel(currentTerm?.name ?? "Current term")} compared with ${termLabel(previousTerm?.name ?? "previous term")}`}
        >
          <SubjectRadarChart data={radarData} />
        </Card>
        <Card
          title="Assessment history"
          description="Weighted score per assessment, oldest first"
        >
          <AssessmentTrendChart data={trendData} />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        <Card
          title="Subject breakdown"
          description="Weighted percentage by subject, with term-over-term change"
          bodyClassName="px-0 py-0"
        >
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">Subject</th>
                  <th className="px-3 py-3 font-medium">Current</th>
                  <th className="px-3 py-3 font-medium">Previous</th>
                  <th className="px-5 py-3 font-medium">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentSubjects.map((row) => {
                  const subject = subjectById.get(row.subject_id);
                  const previous = previousSubjects.get(row.subject_id);
                  const change = previous === undefined ? null : row.percentage - previous;
                  return (
                    <tr key={row.subject_id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-800">{subject?.name ?? "Subject"}</p>
                        <p className="text-xs text-slate-500">{subject?.code ?? "—"}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="w-28">
                          <div className="mb-1 text-xs font-medium text-slate-700">
                            {formatPercent(row.percentage)}
                          </div>
                          <ProgressBar
                            value={row.percentage}
                            tone={row.percentage < 40 ? "rose" : row.percentage < 55 ? "amber" : "indigo"}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {previous === undefined ? "—" : formatPercent(previous)}
                      </td>
                      <td className="px-5 py-3">
                        {change === null ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span
                            className={
                              change > 0
                                ? "font-medium text-emerald-600"
                                : change < 0
                                  ? "font-medium text-rose-600"
                                  : "text-slate-500"
                            }
                          >
                            {change > 0 ? "+" : ""}
                            {change.toFixed(1)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-5">
          <Card title="Attendance by term" description="Present sessions divided by total sessions">
            <div className="space-y-4">
              {attendanceRows.map((row) => (
                <div key={row.term}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{row.term}</span>
                    <span className="text-slate-500">
                      {row.percentage.toFixed(1)}% · {row.sessions} sessions
                    </span>
                  </div>
                  <ProgressBar
                    value={row.percentage}
                    tone={row.percentage < 60 ? "rose" : row.percentage < 75 ? "amber" : "emerald"}
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card title="Classification" description="How the indicator is calculated">
            <p className="text-sm text-slate-600">
              {indicatorMeta[overview?.indicator ?? "on_track"].label} — based on the current-term
              average of {formatPercent(overview?.avg_percentage ?? 0)} and attendance of{" "}
              {formatPercent(overview?.attendance_percentage ?? 0)}.
            </p>
            <ul className="mt-3 space-y-2 text-xs text-slate-500">
              <li>At risk: average below 40% or attendance below 60%.</li>
              <li>Declining: dropped 5+ points versus the previous term.</li>
              <li>High performer: average 75%+ with attendance 85%+.</li>
              <li>Improving: gained 5+ points versus the previous term.</li>
            </ul>
          </Card>
        </div>
      </div>

      <Card
        title="Recent assessments"
        description="Latest marks recorded for this student"
        className="mt-5"
        bodyClassName="px-0 py-0"
      >
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Subject</th>
                <th className="px-3 py-3 font-medium">Assessment</th>
                <th className="px-3 py-3 font-medium">Marks</th>
                <th className="px-5 py-3 font-medium">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {marks
                .filter((mark) => mark.assessments)
                .sort((a, b) => (b.assessments?.date ?? "").localeCompare(a.assessments?.date ?? ""))
                .slice(0, 12)
                .map((mark, index) => {
                  const assessment = mark.assessments!;
                  const percentage = mark.is_absent
                    ? 0
                    : (mark.marks_obtained / assessment.max_marks) * 100;
                  return (
                    <tr key={`${assessment.subject_id}-${index}`} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 text-slate-600">{formatDate(assessment.date)}</td>
                      <td className="px-3 py-3 text-slate-700">
                        {subjectById.get(assessment.subject_id)?.name ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {assessment.type.toUpperCase()} ·{" "}
                        {termLabel(assessment.academic_terms?.name ?? "—")}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {mark.is_absent ? "Absent" : `${mark.marks_obtained} / ${assessment.max_marks}`}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={
                            percentage >= 75
                              ? "font-medium text-emerald-600"
                              : percentage < 40
                                ? "font-medium text-rose-600"
                                : "text-slate-700"
                          }
                        >
                          {percentage.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
