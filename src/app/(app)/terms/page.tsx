import { CalendarDays, GraduationCap, Layers, MapPin } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTerms } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { Card, PageHeader, ReadOnlyNote, StatCard } from "@/components/ui";
import { CreateTermForm, DeleteTermForm, EditTermForm } from "./term-form";

export const metadata = { title: "Academic terms" };

export default async function TermsPage() {
  const { profile } = await requireUser();
  const canEdit = profile?.role === "admin" || profile?.role === "teacher";
  const supabase = await createClient();
  const terms = await getTerms(supabase);

  const current = terms.find((term) => term.is_current);
  const years = new Set(terms.map((term) => term.year));
  const maxSemester = terms.reduce((max, term) => Math.max(max, term.semester), 0);

  return (
    <div>
      <PageHeader
        title="Academic terms"
        description="Define the semesters your college runs. Teachers and administrators can add, edit, or remove terms at any time."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Terms" value={terms.length} hint={`${years.size} academic year(s)`} icon={Layers} tone="indigo" />
        <StatCard label="Semesters configured" value={maxSemester || "—"} hint="Highest semester number" icon={GraduationCap} tone="sky" />
        <StatCard label="Current term" value={current ? `Sem ${current.semester}` : "—"} hint={current?.name ?? "None selected"} icon={CalendarDays} tone="emerald" />
        <StatCard label="Enrolment target" value={current ? current.year : "—"} hint="Used when new students are added" icon={MapPin} tone="amber" />
      </div>

      <div className="mt-5">{canEdit ? <CreateTermForm /> : <ReadOnlyNote what="changing terms" />}</div>

      <Card
        title="Configured terms"
        description="Sorted by academic year and semester"
        className="mt-5"
        bodyClassName="px-0 py-0"
      >
        {terms.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No terms yet. Add one above to get started.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {terms.map((term) => (
              <div key={term.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{term.name}</p>
                      {term.is_current ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {term.year} · Semester {term.semester} · {formatDate(term.start_date)} – {formatDate(term.end_date)}
                    </p>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                    Sem {term.semester}
                  </span>
                </div>
                <div className="mt-3">
                  {canEdit ? (
                    <>
                      <EditTermForm term={term} />
                      <DeleteTermForm term={term} />
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
