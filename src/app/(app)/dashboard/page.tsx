import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  TrendingUp,
  Users,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  average,
  getSectionPerformance,
  getSections,
  getStudentOverview,
  getSubjectPerformance,
  getTeacherContext,
  getTerms,
} from "@/lib/data";
import type { Indicator, StudentOverview } from "@/lib/types";
import { formatPercent, INDICATOR_ORDER, indicatorMeta, termLabel } from "@/lib/utils";
import {
  CHART_COLORS,
  IndicatorDonut,
  ScoreDistributionChart,
  SectionComparisonChart,
  SubjectBarChart,
  TermTrendChart,
} from "@/components/charts";
import { Card, IndicatorBadge, PageHeader, ProgressBar, StatCard } from "@/components/ui";

export const metadata = { title: "Dashboard" };

interface TermScore {
  academic_term_id: string;
  student_id: string;
  avg_percentage: number;
  attendance_percentage: number;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const current = await getCurrentUser();
  const isTeacher = current?.profile?.role === "teacher";

  const [terms, sections, overview, subjectPerf, sectionPerf, termScores, marksCount, attendanceCount] =
    await Promise.all([
      getTerms(supabase),
      getSections(supabase),
      getStudentOverview(supabase),
      getSubjectPerformance(supabase),
      getSectionPerformance(supabase),
      supabase
        .from("v_student_term_performance")
        .select("academic_term_id, student_id, avg_percentage, attendance_percentage"),
      supabase.from("marks").select("*", { count: "exact", head: true }),
      supabase.from("attendance_records").select("*", { count: "exact", head: true }),
    ]);

  const teacherCtx =
    isTeacher && current ? await getTeacherContext(supabase, current.user.id) : null;
  const allowedSections = teacherCtx ? new Set(teacherCtx.assignments.map((a) => a.section_id)) : null;
  const allowedSubjects = teacherCtx ? new Set(teacherCtx.assignments.map((a) => a.subject_id)) : null;

  const students = allowedSections
    ? overview.filter((student) => allowedSections.has(student.section_id))
    : overview;
  const scopedSections = allowedSections
    ? sections.filter((section) => allowedSections.has(section.id))
    : sections;
  const scopedStudentIds = new Set(students.map((student) => student.student_id));

  const currentTerm = terms.find((term) => term.is_current) ?? terms[terms.length - 1];
  const currentSubjects = subjectPerf
    .filter((row) => row.academic_term_id === currentTerm?.id)
    .filter((row) => !allowedSubjects || allowedSubjects.has(row.subject_id))
    .sort((a, b) => b.avg_percentage - a.avg_percentage);

  const currentSections = sectionPerf.filter((row) => row.academic_term_id === currentTerm?.id);

  const scores = (termScores.data ?? []) as TermScore[];
  const termTrend = terms.map((term) => {
    const rows = scores.filter(
      (row) => row.academic_term_id === term.id && scopedStudentIds.has(row.student_id),
    );
    return {
      term: termLabel(term.name),
      avg: Number(average(rows.map((row) => row.avg_percentage)).toFixed(1)),
      attendance: Number(average(rows.map((row) => row.attendance_percentage)).toFixed(1)),
    };
  });

  const sectionChartTerms = terms.map((term) => termLabel(term.name));
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

  const indicatorCounts = INDICATOR_ORDER.reduce<Record<Indicator, number>>(
    (acc, indicator) => ({ ...acc, [indicator]: 0 }),
    { at_risk: 0, declining: 0, improving: 0, high_performer: 0, on_track: 0 },
  );
  for (const student of students) {
    indicatorCounts[student.indicator] = (indicatorCounts[student.indicator] ?? 0) + 1;
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

  const watchlist = students
    .filter((student) => ["at_risk", "declining"].includes(student.indicator))
    .sort((a, b) => a.avg_percentage - b.avg_percentage)
    .slice(0, 6);

  const topPerformers = [...students]
    .sort((a, b) => b.avg_percentage - a.avg_percentage)
    .slice(0, 6);

  const avgScore = average(students.map((student) => student.avg_percentage));
  const avgAttendance = average(students.map((student) => student.attendance_percentage));
  const atRisk = students.filter((student) => student.indicator === "at_risk").length;

  const firstName = current?.profile?.full_name?.split(" ").slice(-1)[0] ?? "there";

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={
          isTeacher
            ? `Your assigned classes · ${termLabel(currentTerm?.name ?? "Current term")}`
            : `Department-wide overview · ${termLabel(currentTerm?.name ?? "Current term")}`
        }
        actions={
          <>
            <Link
              href="/assessments"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <ClipboardList className="h-4 w-4" /> Enter marks
            </Link>
            <Link
              href="/attendance"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
            >
              <CalendarCheck className="h-4 w-4" /> Take attendance
            </Link>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Live database
        </span>
        <span>{students.length} students in scope</span>
        <span>{(marksCount.count ?? 0).toLocaleString()} marks</span>
        <span>{(attendanceCount.count ?? 0).toLocaleString()} attendance records</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Students"
          value={students.length}
          hint={`${scopedSections.length} sections · ${currentSubjects.length} subjects`}
          icon={Users}
          tone="indigo"
        />
        <StatCard
          label="Average score"
          value={formatPercent(avgScore)}
          hint={`${topPerformers.filter((s) => s.avg_percentage >= 75).length} students above 75%`}
          icon={TrendingUp}
          tone="emerald"
        />
        <StatCard
          label="Attendance"
          value={formatPercent(avgAttendance)}
          hint="Average across the current term"
          icon={CalendarCheck}
          tone="sky"
        />
        <StatCard
          label="At risk"
          value={atRisk}
          hint={`${indicatorCounts.declining} more are declining`}
          icon={AlertTriangle}
          tone="rose"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Term trend" description="Average score and attendance by semester">
          <TermTrendChart data={termTrend} />
        </Card>
        <Card title="Early-warning mix" description="Rule-based indicators for current data">
          <IndicatorDonut data={donutData} />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card
          title="Subject performance"
          description={`${termLabel(currentTerm?.name ?? "Current term")} · average vs pass rate`}
        >
          <SubjectBarChart
            data={currentSubjects.map((subject) => ({
              name: subject.subject_code,
              avg: subject.avg_percentage,
              pass: subject.pass_rate,
            }))}
          />
        </Card>
        <Card title="Section comparison" description="Average score by section and semester">
          <SectionComparisonChart data={sectionChartData} terms={sectionChartTerms} />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <Card title="Score distribution" description="Students grouped by overall percentage">
          <ScoreDistributionChart data={distribution} />
        </Card>

        <Card
          title="Students to watch"
          description="Lowest averages among at-risk and declining students"
          action={
            <Link
              href="/students?indicator=at_risk"
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
          bodyClassName="px-0 py-0"
        >
          <div className="divide-y divide-slate-100">
            {watchlist.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                No at-risk students in this scope.
              </p>
            ) : (
              watchlist.map((student) => <StudentRow key={student.student_id} student={student} />)
            )}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card
          title="Top performers"
          description="Highest overall averages this term"
          action={
            <Link
              href="/students?indicator=high_performer"
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
          bodyClassName="px-0 py-0"
        >
          <div className="divide-y divide-slate-100">
            {topPerformers.map((student) => (
              <StudentRow key={student.student_id} student={student} />
            ))}
          </div>
        </Card>

        <Card title="How indicators work" description="Deterministic rules — no black box">
          <div className="space-y-3 text-sm">
            {[
              ["At risk", "Average below 40% or attendance below 60%", "bg-rose-500"],
              ["Declining", "Dropped 5+ points versus the previous term", "bg-amber-500"],
              ["High performer", "Average 75%+ with attendance 85%+", "bg-emerald-500"],
              ["Improving", "Gained 5+ points versus the previous term", "bg-sky-500"],
              ["On track", "Everyone else", "bg-slate-400"],
            ].map(([label, rule, dot]) => (
              <div key={label} className="flex items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
                <div>
                  <p className="font-medium text-slate-800">{label}</p>
                  <p className="text-slate-500">{rule}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StudentRow({ student }: { student: StudentOverview }) {
  return (
    <Link
      href={`/students/${student.student_id}`}
      className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-slate-50"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600 ring-1 ring-indigo-100">
          {student.register_number.slice(-2)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-800">{student.name}</p>
          <p className="text-xs text-slate-500">
            {student.register_number} · Section {student.section_name}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <div className="hidden w-28 sm:block">
          <div className="mb-1 flex justify-between text-[11px] text-slate-500">
            <span>Score</span>
            <span className="font-medium text-slate-700">{formatPercent(student.avg_percentage)}</span>
          </div>
          <ProgressBar
            value={student.avg_percentage}
            tone={student.avg_percentage < 40 ? "rose" : student.avg_percentage < 55 ? "amber" : "indigo"}
          />
        </div>
        <IndicatorBadge indicator={student.indicator} />
      </div>
    </Link>
  );
}
