import { BookOpen, GraduationCap, Percent, TrendingUp } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDepartments, getSubjectPerformance, getSubjects, getTerms } from "@/lib/data";
import { formatPercent, termLabel } from "@/lib/utils";
import { Card, PageHeader, ProgressBar, ReadOnlyNote, StatCard } from "@/components/ui";
import { SubjectBarChart, TermTrendChart } from "@/components/charts";
import { CreateSubjectForm, EditSubjectForm } from "./subject-form";

export const metadata = { title: "Subjects" };

export default async function SubjectsPage() {
  const { profile } = await requireUser();
  const canEdit = profile?.role === "admin" || profile?.role === "teacher";
  const supabase = await createClient();

  const [subjects, performance, terms, departments] = await Promise.all([
    getSubjects(supabase),
    getSubjectPerformance(supabase),
    getTerms(supabase),
    getDepartments(supabase),
  ]);

  const currentTerm = terms.find((term) => term.is_current) ?? terms[terms.length - 1];

  const current = performance.filter((row) => row.academic_term_id === currentTerm?.id);
  const subjectRows = subjects.map((subject) => {
    const currentRow = current.find((row) => row.subject_id === subject.id);
    const history = terms.map((term) => {
      const row = performance.find(
        (item) => item.subject_id === subject.id && item.academic_term_id === term.id,
      );
      return {
        term: termLabel(term.name),
        avg: Number((row?.avg_percentage ?? 0).toFixed(1)),
        attendance: 0,
      };
    });
    return { subject, currentRow, history };
  });

  const chartData = current.map((row) => ({
    name: row.subject_code,
    avg: row.avg_percentage,
    pass: row.pass_rate,
  }));

  const classAverage = current.length
    ? current.reduce((sum, row) => sum + row.avg_percentage, 0) / current.length
    : 0;
  const passRate = current.length
    ? current.reduce((sum, row) => sum + row.pass_rate, 0) / current.length
    : 0;
  const totalMarks = current.reduce((sum, row) => sum + row.marks_count, 0);

  const termTrend = terms.map((term) => {
    const rows = performance.filter((row) => row.academic_term_id === term.id);
    return {
      term: termLabel(term.name),
      avg: Number(
        (rows.length ? rows.reduce((sum, row) => sum + row.avg_percentage, 0) / rows.length : 0).toFixed(1),
      ),
      attendance: 0,
    };
  });

  return (
    <div>
      <PageHeader
        title="Subjects"
        description="Subject catalogue with live performance. Teachers and administrators can change codes, names, and departments at any time."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Subjects" value={subjects.length} hint={`${departments.length} department`} icon={BookOpen} tone="indigo" />
        <StatCard label="Class average" value={formatPercent(classAverage)} hint={termLabel(currentTerm?.name ?? "Current term")} icon={TrendingUp} tone="emerald" />
        <StatCard label="Pass rate" value={formatPercent(passRate)} hint="Marks at or above 40%" icon={Percent} tone="sky" />
        <StatCard label="Marks recorded" value={totalMarks.toLocaleString()} hint="Current term across all subjects" icon={GraduationCap} tone="amber" />
      </div>

      <div className="mt-5">{canEdit ? <CreateSubjectForm departments={departments} /> : <ReadOnlyNote what="editing subjects" />}</div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card title="Average vs pass rate" description={`${termLabel(currentTerm?.name ?? "Current term")} · all subjects`}>
          {chartData.length ? <SubjectBarChart data={chartData} /> : <p className="py-10 text-center text-sm text-slate-500">No assessment data yet.</p>}
        </Card>
        <Card title="Semester trend" description="Average subject score by semester">
          <TermTrendChart data={termTrend.map((row) => ({ ...row, attendance: row.avg }))} />
        </Card>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subjectRows.map(({ subject, currentRow, history }) => (
          <div key={subject.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{subject.code}</p>
                <h2 className="mt-0.5 text-sm font-semibold text-slate-900">{subject.name}</h2>
                <p className="mt-1 text-xs capitalize text-slate-500">
                  {subject.type} · {subject.credits} credits
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {currentRow ? formatPercent(currentRow.avg_percentage) : "—"}
              </span>
            </div>

            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span>Pass rate</span>
                <span className="font-medium text-slate-700">
                  {currentRow ? formatPercent(currentRow.pass_rate) : "—"}
                </span>
              </div>
              <ProgressBar
                value={currentRow?.pass_rate ?? 0}
                tone={(currentRow?.pass_rate ?? 0) < 60 ? "amber" : "emerald"}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>{currentRow?.marks_count ?? 0} marks recorded</span>
              <span>
                {history.map((row) => `${row.term} ${row.avg}%`).join(" · ")}
              </span>
            </div>

            <div className="mt-4">
              {canEdit ? <EditSubjectForm subject={subject} departments={departments} /> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
