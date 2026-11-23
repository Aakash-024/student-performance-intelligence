"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";
import { saveEnrollments, type FormState } from "./actions";
import { useRefreshOnSuccess } from "@/components/use-refresh-on-success";
import { ReadOnlyNote } from "@/components/ui";

const initial: FormState = {};

interface MatrixStudent {
  id: string;
  name: string;
  register_number: string;
}

interface MatrixSubject {
  id: string;
  code: string;
  name: string;
}

export function EnrollmentMatrix({
  termId,
  sectionId,
  students,
  subjects,
  enrolled,
  canEdit = true,
}: {
  termId: string;
  sectionId: string;
  students: MatrixStudent[];
  subjects: MatrixSubject[];
  enrolled: string[];
  canEdit?: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(enrolled));
  const [state, action, pending] = useActionState(saveEnrollments, initial);
  useRefreshOnSuccess(state);

  function toggle(pair: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(pair)) next.delete(pair);
      else next.add(pair);
      return next;
    });
  }

  function toggleColumn(subjectId: string) {
    const pairs = students.map((student) => `${student.id}|${subjectId}`);
    const allOn = pairs.every((pair) => selected.has(pair));
    setSelected((previous) => {
      const next = new Set(previous);
      pairs.forEach((pair) => (allOn ? next.delete(pair) : next.add(pair)));
      return next;
    });
  }

  return (
    <form action={action} className="mt-5">
      <input type="hidden" name="term_id" value={termId} />
      <input type="hidden" name="section_id" value={sectionId} />

      <div className="thin-scroll overflow-x-auto rounded-2xl border border-brand-border bg-brand-navy shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-brand-border bg-brand-panel/70 text-xs uppercase tracking-wide text-brand-muted">
              <th className="sticky left-0 z-10 bg-brand-panel/95 px-5 py-3 font-medium">Student</th>
              {subjects.map((subject) => {
                const pairs = students.map((student) => `${student.id}|${subject.id}`);
                const allOn = pairs.length > 0 && pairs.every((pair) => selected.has(pair));
                return (
                  <th key={subject.id} className="px-3 py-3 text-center font-medium">
                    <div className="whitespace-nowrap">{subject.code}</div>
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => toggleColumn(subject.id)}
                        className="mt-1 text-[10px] font-semibold normal-case tracking-normal text-brand-cyan hover:text-brand-blue"
                      >
                        {allOn ? "Clear all" : "Select all"}
                      </button>
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-brand-panel/60">
                <td className="sticky left-0 z-10 bg-brand-navy px-5 py-2.5">
                  <div className="text-sm font-medium text-brand-text">{student.name}</div>
                  <div className="text-[11px] text-brand-muted">{student.register_number}</div>
                </td>
                {subjects.map((subject) => {
                  const pair = `${student.id}|${subject.id}`;
                  return (
                    <td key={subject.id} className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        name="enroll"
                        value={pair}
                        checked={selected.has(pair)}
                        onChange={() => toggle(pair)}
                        disabled={!canEdit}
                        className="h-4 w-4 rounded border-brand-border text-brand-cyan focus:ring-brand-blue disabled:opacity-60"
                        aria-label={`${subject.code} for ${student.name}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {canEdit ? (
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-70"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {pending ? "Saving…" : "Save enrolments"}
          </button>
        ) : (
          <ReadOnlyNote what="changing enrolments" />
        )}
        <span className="text-xs text-brand-muted">
          {selected.size} of {students.length * subjects.length} selections
        </span>
      </div>

      {state.error ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-400 ring-1 ring-rose-500/25">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400 ring-1 ring-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {state.success}
        </p>
      ) : null}
    </form>
  );
}
