import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CalendarX,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  average,
  getAssessmentSummaries,
  getAssessments,
  getSections,
  getSectionPerformance,
  getStudentOverview,
  getSubjectPerformance,
  getTeacherContext,
  getTerms,
} from "@/lib/data";
import type { Indicator } from "@/lib/types";
import { assessmentLabel, formatPercent, INDICATOR_ORDER, indicatorMeta, termLabel } from "@/lib/utils";
import {
  CHART_COLORS,
  IndicatorDonut,
  ScoreDistributionChart,
  SectionComparisonChart,
  SubjectBarChart,
  TermTrendChart,
} from "@/components/charts";
import { Card, IndicatorBadge, PageHeader, ProgressBar, StatCard } from "@/components/ui";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string }>;
}) {
  const params = await searchParams;
  const { user, profile } = await requireUser();
  const supabase = await createClient();
  const isAdmin = profile?.role === "admin";

  const [terms, sections, overview, subjectPerf, sectionPerf, assessments, summaries, termScores] =
    await Promise.all([
      getTerms(supabase),
      getSections(supabase),
      getStudentOverview(supabase),
      getSubjectPerformance(supabase),
      getSectionPerformance(supabase),
      getAssessments(supabase),
      getAssessmentSummaries(supabase),
      supabase
        .from("v_student_term_performance")
        .select("academic_term_id, student_id, avg_percentage, attendance_percentage"),
    ]);

  const teacherCtx =
    profile?.role === "teacher" ? await getTeacherContext(supabase, user.id) : null;
  const assignments = teacherCtx?.assignments ?? [];
  const allowedSections = isAdmin
    ? null
    : new Set(assignments.map((assignment) => assignment.section_id));
  const allowedSubjects = isAdmin
    ? null
    : new Set(assignments.map((assignment) => assignment.subject_id));

  const students = allowedSections
    ? overview.filter((student) => allowedSections.has(student.section_id))
    : overview;
  const scopedSections = allowedSections
    ? sections.filter((section) => allowedSections.has(section.id))
    : sections;
  const studentIds = new Set(students.map((student) => student.student_id));

  const selectedTermId = params.term ?? terms.find((term) => term.is_current)?.id ?? terms[0]?.id;
  const selectedTerm = terms.find((term) => term.id === selectedTermId);

  const currentSubjects = subjectPerf
    .filter((row) => row.academic_term_id === selectedTermId)
    .filter((row) => !allowedSubjects || allowedSubjects.has(row.subject_id))
    .sort((a, b) => b.avg_percentage - a.avg_percentage);

  const currentSections = sectionPerf
    .filter((row) => row.academic_term_id === selectedTermId)
    .filter((row) => !allowedSections || allowedSections.has(row.section_id));

  const sectionChartData = scopedSections.map((section) => {
    const row: Record<string, string | number> = { name: section.name };
    for (const term of terms) {
      const stat = sectionPerf.find(
        (item) => item.section_id === section.id && item.academic_term_id === term.id,
      );
      row[termLabel(term.name)] = Number((stat?.avg_percentage ?? 0).toFixed(1));
    }
    return row;
  });

  // Assessment-type comparison for the selected term.
  const typeRows = ["cat1", "cat2", "semester"].map((type) => {
    const list = assessments.filter(
      (assessment) =>
        assessment.type === type &&
        assessment.academic_term_id === selectedTermId &&
        (!allowedSubjects || allowedSubjects.has(assessment.subject_id)),
    );
    const scores = list
      .map((assessment) => summaries.find((row) => row.assessment_id === assessment.id)?.avg_percentage)
      .filter((value): value is number => value != null);
    return { type, avg: scores.length ? average(scores) : 0, count: list.length };
  });

  const indicatorCounts = INDICATOR_ORDER.reduce<Record<Indicator, number>>(
    (acc, indicator) => ({ ...acc, [indicator]: 0 }),
    { at_risk: 0, declining: 0, improving: 0, high_performer: 0, on_track: 0 },
  );
  for (const student of students) {
    indicatorCounts[student.indicator] += 1;
  }

  const donutColors: Record<Indicator, string> = {
    high_performer: CHART_COLORS.emerald,
    improving: CHART_COLORS.sky,
    on_track: CHART_COLORS.slate,
    declining: CHART_COLORS.amber,
    at_risk: CHART_COLORS.rose,
  };
  const donutData = INDICATOR_ORDER.map((indicator) => ({
    name: indicatorMeta[indicator].label,
    value: indicatorCounts[indicator],
    color: donutColors[indicator],
  }));

  const bands = [
    { band: "0–39", min: 0, max: 40 },
    { band: "40–54", min: 40, max: 55 },
    { band: "55–69", min: 55, max: 70 },
    { band: "70–84", min: 70, max: 85 },
    { band: "85–100", min: 85, max: 101 },
  ];
  const distribution = bands.map((band) => ({
    band: band.band,
    students: students.filter(
      (student) => student.avg_percentage >= band.min && student.avg_percentage < band.max,
    ).length,
  }));

  const scores = (termScores.data ?? []) as {
    academic_term_id: string;
    student_id: string;
    avg_percentage: number;
    attendance_percentage: number;
  }[];

  const termTrend = terms.map((term) => {
    const rows = scores.filter(
      (row) => row.academic_term_id === term.id && studentIds.has(row.student_id),
    );
    return {
      term: termLabel(term.name),
      avg: Number(average(rows.map((row) => row.avg_percentage)).toFixed(1)),
      attendance: Number(average(rows.map((row) => row.attendance_percentage)).toFixed(1)),
    };
  });

  const atRisk = students.filter((student) => student.indicator === "at_risk");
  const declining = students
    .filter((student) => student.indicator === "declining")
    .sort((a, b) => a.change - b.change);
  const lowAttendance = [...students]
    .filter((student) => student.attendance_percentage < 75)
    .sort((a, b) => a.attendance_percentage - b.attendance_percentage)
    .slice(0, 8);
  const topPerformers = [...students]
    .sort((a, b) => b.avg_percentage - a.avg_percentage)
    .slice(0, 8);

  const avgScore = average(students.map((student) => student.avg_percentage));
  const avgAttendance = average(students.map((student) => student.attendance_percentage));

  return (
    <div>
      <PageHeader
        title="Analytics"
        description={
          isAdmin
            ? "Department-wide performance analysis for the selected semester."
            : "Performance analysis scoped to your assigned classes."
        }
        actions={
          <form method="get" className="flex items-center gap-2">
            <select
              name="term"
              defaultValue={selectedTermId}
              className="rounded-xl border border-brand-border bg-brand-navy px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-cyan"
            >
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-xl bg-brand-blue px-3.5 py-2 text-sm font-medium text-white transition hover:brightness-110"
            >
              View
            </button>
          </form>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students analysed" value={students.length} hint={`${scopedSections.length} sections`} icon={Users} tone="indigo" />
        <StatCard label="Average score" value={formatPercent(avgScore)} hint={termLabel(selectedTerm?.name ?? "Term")} icon={TrendingUp} tone="emerald" />
        <StatCard label="Average attendance" value={formatPercent(avgAttendance)} hint="Across all recorded sessions" icon={BarChart3} tone="sky" />
        <StatCard label="Need attention" value={atRisk.length + declining.length} hint={`${atRisk.length} at risk · ${declining.length} declining`} icon={AlertTriangle} tone="rose" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card title="Subject averages" description={`${termLabel(selectedTerm?.name ?? "Term")} · average vs pass rate`}>
          <SubjectBarChart
            data={currentSubjects.map((subject) => ({
              name: subject.subject_code,
              avg: subject.avg_percentage,
              pass: subject.pass_rate,
            }))}
          />
        </Card>
        <Card title="Section comparison" description="Average score by section across semesters">
          <SectionComparisonChart data={sectionChartData} terms={terms.map((term) => termLabel(term.name))} />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card title="Early-warning mix" description="Rule-based indicators">
          <IndicatorDonut data={donutData} />
        </Card>
        <Card title="Score distribution" description="Students grouped by overall percentage">
          <ScoreDistributionChart data={distribution} />
        </Card>
        <Card title="Assessment-type averages" description={`Average score per assessment type · ${termLabel(selectedTerm?.name ?? "Term")}`}>
          <div className="space-y-4 py-2">
            {typeRows.map((row) => (
              <div key={row.type}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-brand-text">{assessmentLabel(row.type)}</span>
                  <span className="text-brand-muted">
                    {row.count} assessment{row.count === 1 ? "" : "s"} · {formatPercent(row.avg)}
                  </span>
                </div>
                <ProgressBar
                  value={row.avg}
                  tone={row.avg < 40 ? "rose" : row.avg < 55 ? "amber" : "indigo"}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card title="Term trend" description="Average score and attendance by semester">
          <TermTrendChart data={termTrend} />
        </Card>
        <Card title="Section averages" description={`${termLabel(selectedTerm?.name ?? "Term")} summary`} bodyClassName="px-0 py-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-border bg-brand-panel/70 text-xs uppercase tracking-wide text-brand-muted">
                <th className="px-5 py-3 font-medium">Section</th>
                <th className="px-3 py-3 font-medium">Students</th>
                <th className="px-3 py-3 font-medium">Average</th>
                <th className="px-5 py-3 font-medium">Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {currentSections.map((row) => (
                <tr key={row.section_id} className="hover:bg-brand-panel/60">
                  <td className="px-5 py-3 font-medium text-brand-text">Section {row.section_name}</td>
                  <td className="px-3 py-3 text-brand-muted">{row.student_count}</td>
                  <td className="px-3 py-3 text-brand-text">{formatPercent(row.avg_percentage)}</td>
                  <td className="px-5 py-3 text-brand-muted">{formatPercent(row.attendance_percentage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card
          title="Top performers"
          description="Highest averages in scope"
          action={<Link href="/students?indicator=high_performer" className="text-xs font-medium text-brand-cyan hover:text-brand-cyan">View all</Link>}
          bodyClassName="px-0 py-0"
        >
          <div className="divide-y divide-brand-border">
            {topPerformers.map((student) => (
              <StudentLine key={student.student_id} student={student} metric="score" />
            ))}
          </div>
        </Card>

        <Card
          title="Declining performance"
          description="Largest drop versus the previous term"
          action={<Link href="/students?indicator=declining" className="text-xs font-medium text-brand-cyan hover:text-brand-cyan">View all</Link>}
          bodyClassName="px-0 py-0"
        >
          <div className="divide-y divide-brand-border">
            {declining.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-brand-muted">No declining students.</p>
            ) : (
              declining.slice(0, 8).map((student) => (
                <StudentLine key={student.student_id} student={student} metric="change" />
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card
          title="Low attendance"
          description="Below 75% attendance"
          action={<CalendarX className="h-4 w-4 text-brand-muted" />}
          bodyClassName="px-0 py-0"
        >
          <div className="divide-y divide-brand-border">
            {lowAttendance.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-brand-muted">
                Every student is above 75% attendance.
              </p>
            ) : (
              lowAttendance.map((student) => (
                <StudentLine key={student.student_id} student={student} metric="attendance" />
              ))
            )}
          </div>
        </Card>

        <Card title="At-risk students" description="Average below 40% or attendance below 60%" bodyClassName="px-0 py-0">
          <div className="divide-y divide-brand-border">
            {atRisk.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-brand-muted">No at-risk students.</p>
            ) : (
              atRisk
                .sort((a, b) => a.avg_percentage - b.avg_percentage)
                .slice(0, 8)
                .map((student) => (
                  <Link
                    key={student.student_id}
                    href={`/students/${student.student_id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-brand-panel"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-brand-text">{student.name}</p>
                      <p className="text-xs text-brand-muted">
                        {student.register_number} · Section {student.section_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-rose-400">
                        {formatPercent(student.avg_percentage)}
                      </span>
                      <TrendingDown className="h-4 w-4 text-rose-500" />
                    </div>
                  </Link>
                ))
            )}
          </div>
        </Card>
      </div>

      <p className="mt-4 text-xs text-brand-muted">
        These indicators are transparent rule-based calculations, not machine learning. Students in
        scope: {students.length} · marks tables filtered by your role through RLS.
      </p>
    </div>
  );
}

function StudentLine({
  student,
  metric,
}: {
  student: {
    student_id: string;
    name: string;
    register_number: string;
    section_name: string;
    avg_percentage: number;
    attendance_percentage: number;
    change: number;
    indicator: Indicator;
  };
  metric: "score" | "change" | "attendance";
}) {
  return (
    <Link
      href={`/students/${student.student_id}`}
      className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-brand-panel"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-brand-text">{student.name}</p>
        <p className="text-xs text-brand-muted">
          {student.register_number} · Section {student.section_name}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden w-24 sm:block">
          <ProgressBar
            value={metric === "attendance" ? student.attendance_percentage : student.avg_percentage}
            tone={
              metric === "attendance"
                ? student.attendance_percentage < 60
                  ? "rose"
                  : "amber"
                : student.avg_percentage < 40
                  ? "rose"
                  : "indigo"
            }
          />
        </div>
        <span className="w-20 text-right text-xs font-medium text-brand-text">
          {metric === "attendance"
            ? formatPercent(student.attendance_percentage)
            : metric === "change"
              ? `${student.change > 0 ? "+" : ""}${student.change.toFixed(1)}`
              : formatPercent(student.avg_percentage)}
        </span>
        <IndicatorBadge indicator={student.indicator} />
      </div>
    </Link>
  );
}
