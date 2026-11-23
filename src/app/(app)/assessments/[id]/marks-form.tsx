"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";
import { saveMarks, type FormState } from "../actions";
import { useRefreshOnSuccess } from "@/components/use-refresh-on-success";

const initial: FormState = {};

interface Row {
  id: string;
  name: string;
  register_number: string;
  section_name: string;
  marks_obtained: number | null;
  is_absent: boolean;
}

function MarkRow({
  student,
  maxMarks,
  editable,
}: {
  student: Row;
  maxMarks: number;
  editable: boolean;
}) {
  const [absent, setAbsent] = useState(student.is_absent);
  const invalid =
    student.marks_obtained !== null &&
    (student.marks_obtained < 0 || student.marks_obtained > maxMarks);

  return (
    <tr className="hover:bg-brand-panel/60">
      <td className="px-5 py-2.5">
        <p className="font-medium text-brand-text">{student.name}</p>
        <p className="text-xs text-brand-muted">{student.register_number}</p>
      </td>
      <td className="px-3 py-2.5 text-center text-brand-muted">{student.section_name}</td>
      <td className="px-3 py-2.5">
        <input
          key={`${student.id}-${absent ? "a" : "p"}`}
          name={`mark_${student.id}`}
          type="number"
          min={0}
          max={maxMarks}
          step="any"
          defaultValue={student.marks_obtained ?? ""}
          disabled={!editable || absent}
          placeholder="—"
          className="w-28 rounded-lg border border-brand-border px-2.5 py-1.5 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 disabled:cursor-not-allowed disabled:bg-brand-navy-soft disabled:text-brand-muted"
        />
        {invalid ? <p className="mt-1 text-xs text-rose-400">Max is {maxMarks}</p> : null}
      </td>
      <td className="px-3 py-2.5 text-center">
        <input
          name={`absent_${student.id}`}
          type="checkbox"
          checked={absent}
          disabled={!editable}
          onChange={(event) => setAbsent(event.target.checked)}
          className="h-4 w-4 rounded border-brand-border text-rose-400 focus:ring-rose-500"
        />
      </td>
      <td className="px-5 py-2.5 text-right text-xs text-brand-muted">
        {absent
          ? "Absent"
          : student.marks_obtained === null
            ? "Not recorded"
            : `${((student.marks_obtained / maxMarks) * 100).toFixed(1)}%`}
      </td>
    </tr>
  );
}

export function MarksForm({
  assessmentId,
  maxMarks,
  rows,
  editable,
}: {
  assessmentId: string;
  maxMarks: number;
  rows: Row[];
  editable: boolean;
}) {
  const [state, action, pending] = useActionState(saveMarks, initial);
  useRefreshOnSuccess(state);

  return (
    <form action={action}>
      <input type="hidden" name="assessment_id" value={assessmentId} />

      <div className="thin-scroll overflow-x-auto rounded-2xl border border-brand-border bg-brand-navy shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-brand-border bg-brand-panel/70 text-xs uppercase tracking-wide text-brand-muted">
              <th className="px-5 py-3 font-medium">Student</th>
              <th className="px-3 py-3 font-medium text-center">Section</th>
              <th className="px-3 py-3 font-medium">Marks / {maxMarks}</th>
              <th className="px-3 py-3 font-medium text-center">Absent</th>
              <th className="px-5 py-3 font-medium text-right">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {rows.map((student) => (
              <MarkRow
                key={student.id}
                student={student}
                maxMarks={maxMarks}
                editable={editable}
              />
            ))}
          </tbody>
        </table>
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-brand-muted">
          {editable
            ? "Blank fields are skipped. Existing marks are updated in place."
            : "You can view marks but you are not assigned to this class, so the database blocks writes."}
        </p>
        <button
          type="submit"
          disabled={pending || !editable}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {pending ? "Saving…" : "Save marks"}
        </button>
      </div>
    </form>
  );
}
