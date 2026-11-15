"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";
import { saveAttendance, type FormState } from "../actions";

const initial: FormState = {};

interface Student {
  id: string;
  name: string;
  register_number: string;
  is_present: boolean;
  recorded: boolean;
}

export function AttendanceForm({
  sessionId,
  students,
  editable,
}: {
  sessionId: string;
  students: Student[];
  editable: boolean;
}) {
  const [state, action, pending] = useActionState(saveAttendance, initial);
  const [present, setPresent] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      students.map((student) => [
        student.id,
        student.recorded ? student.is_present : true,
      ]),
    ),
  );

  const presentCount = students.filter((student) => present[student.id]).length;
  const percentage = students.length ? (presentCount / students.length) * 100 : 0;

  function setAll(value: boolean) {
    setPresent(Object.fromEntries(students.map((student) => [student.id, value])));
  }

  return (
    <form action={action}>
      <input type="hidden" name="session_id" value={sessionId} />

      {students.map((student) => (
        <input
          key={`hidden-${student.id}`}
          type="hidden"
          name={`present_${student.id}`}
          value={present[student.id] ? "on" : ""}
        />
      ))}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {presentCount} of {students.length} present · {percentage.toFixed(0)}%
            </p>
            <p className="text-xs text-slate-500">
              {students.some((student) => student.recorded)
                ? "Editing saved attendance for this session."
                : "No attendance saved yet — everyone starts marked present."}
            </p>
          </div>
          {editable ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAll(true)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Mark all present
              </button>
              <button
                type="button"
                onClick={() => setAll(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Mark all absent
              </button>
            </div>
          ) : null}
        </div>

        <div className="thin-scroll max-h-[560px] overflow-y-auto">
          <ul className="divide-y divide-slate-100">
            {students.map((student) => {
              const isPresent = present[student.id];
              return (
                <li
                  key={student.id}
                  className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-slate-50/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{student.name}</p>
                    <p className="text-xs text-slate-500">{student.register_number}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        isPresent
                          ? "text-xs font-medium text-emerald-600"
                          : "text-xs font-medium text-rose-600"
                      }
                    >
                      {isPresent ? "Present" : "Absent"}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isPresent}
                      aria-label={`Toggle attendance for ${student.name}`}
                      disabled={!editable}
                      onClick={() =>
                        setPresent((current) => ({ ...current, [student.id]: !current[student.id] }))
                      }
                      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isPresent ? "bg-emerald-500" : "bg-rose-400"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          isPresent ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {state.error ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {state.success}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {editable
            ? "Saving upserts one attendance record per student in this session."
            : "You can view this session but you are not assigned to this class, so the database blocks writes."}
        </p>
        <button
          type="submit"
          disabled={pending || !editable}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {pending ? "Saving…" : "Save attendance"}
        </button>
      </div>
    </form>
  );
}
