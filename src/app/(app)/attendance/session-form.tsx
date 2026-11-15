"use client";

import { useActionState, useEffect } from "react";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSession, type FormState } from "./actions";
import type { AcademicTerm, Section, Subject, TeacherAssignment } from "@/lib/types";

const initial: FormState = {};

export function CreateSessionForm({
  subjects,
  sections,
  terms,
  assignments,
  isAdmin,
}: {
  subjects: Subject[];
  sections: Section[];
  terms: AcademicTerm[];
  assignments: TeacherAssignment[];
  isAdmin: boolean;
}) {
  const [state, action, pending] = useActionState(createSession, initial);
  const router = useRouter();
  const current = terms.find((term) => term.is_current) ?? terms[terms.length - 1];

  // Navigate to the new session with a normal client navigation (a plain RSC
  // GET, which is reliable on production) instead of a redirect inside the
  // action, whose large response can hang (vercel/next.js#95714).
  useEffect(() => {
    if (state.success && state.sessionId) router.push(`/attendance/${state.sessionId}`);
  }, [state, router]);

  const allowedSubjectIds = isAdmin
    ? null
    : new Set(assignments.map((assignment) => assignment.subject_id));
  const allowedSectionIds = isAdmin
    ? null
    : new Set(assignments.map((assignment) => assignment.section_id));

  const subjectOptions = subjects.filter(
    (subject) => !allowedSubjectIds || allowedSubjectIds.has(subject.id),
  );
  const sectionOptions = sections.filter(
    (section) => !allowedSectionIds || allowedSectionIds.has(section.id),
  );

  return (
    <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Start an attendance session</p>
          <p className="text-xs text-slate-500">
            Pick a class, date and period, then mark students present or absent.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
          <Plus className="h-4 w-4" /> New session
        </span>
      </summary>

      <form action={action} className="space-y-3 border-t border-slate-100 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Subject</span>
            <select
              name="subject_id"
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code} — {subject.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Section</span>
            <select
              name="section_id"
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              {sectionOptions.map((section) => (
                <option key={section.id} value={section.id}>
                  Section {section.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Term</span>
            <select
              name="academic_term_id"
              required
              defaultValue={current?.id}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Date</span>
            <input
              name="session_date"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Period</span>
            <input
              name="period_number"
              type="number"
              min={1}
              max={10}
              defaultValue={1}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </label>
        </div>

        {state.error ? (
          <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || subjectOptions.length === 0 || sectionOptions.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {pending ? "Creating…" : "Create session"}
        </button>
      </form>
    </details>
  );
}
