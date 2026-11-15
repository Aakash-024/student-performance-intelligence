"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { createAssessment, deleteAssessment, updateAssessment, type FormState } from "./actions";
import type { AcademicTerm, Assessment, Subject } from "@/lib/types";

const initial: FormState = {};

export function Feedback({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {state.success}
      </p>
    );
  }
  return null;
}

export function CreateAssessmentForm({
  subjects,
  terms,
}: {
  subjects: Subject[];
  terms: AcademicTerm[];
}) {
  const [state, action, pending] = useActionState(createAssessment, initial);
  const current = terms.find((term) => term.is_current) ?? terms[terms.length - 1];

  return (
    <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Configure an assessment</p>
          <p className="text-xs text-slate-500">
            CAT 1, CAT 2, internal, or semester exam with configurable marks and weightage.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
          <Plus className="h-4 w-4" /> New assessment
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
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code} — {subject.name}
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
            <span className="mb-1 block font-medium text-slate-700">Type</span>
            <select
              name="type"
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              <option value="cat1">CAT 1</option>
              <option value="cat2">CAT 2</option>
              <option value="internal">Internal</option>
              <option value="semester">Semester exam</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Maximum marks</span>
            <input
              name="max_marks"
              type="number"
              min={1}
              step="0.5"
              defaultValue={50}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Weightage (%)</span>
            <input
              name="weightage_percent"
              type="number"
              min={0}
              max={100}
              step="0.5"
              defaultValue={20}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Date</span>
            <input
              name="date"
              type="date"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </label>
        </div>

        <Feedback state={state} />

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-70"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {pending ? "Saving…" : "Create assessment"}
        </button>
      </form>
    </details>
  );
}

export function EditAssessmentForm({ assessment }: { assessment: Assessment }) {
  const [state, action, pending] = useActionState(updateAssessment, initial);

  return (
    <details className="rounded-xl border border-slate-200 bg-slate-50/60">
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900">
        Edit configuration
      </summary>
      <form action={action} className="space-y-2 border-t border-slate-200 px-3 py-3">
        <input type="hidden" name="id" value={assessment.id} />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs">
            <span className="mb-1 block text-slate-500">Max marks</span>
            <input
              name="max_marks"
              type="number"
              min={1}
              step="0.5"
              defaultValue={assessment.max_marks}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-slate-500">Weightage %</span>
            <input
              name="weightage_percent"
              type="number"
              min={0}
              max={100}
              step="0.5"
              defaultValue={assessment.weightage_percent}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500"
            />
          </label>
        </div>
        <label className="block text-xs">
          <span className="mb-1 block text-slate-500">Date</span>
          <input
            name="date"
            type="date"
            defaultValue={assessment.date ?? ""}
            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500"
          />
        </label>
        <Feedback state={state} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-70"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </button>

        <button
          formAction={deleteAssessment}
          formNoValidate
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete assessment
        </button>
      </form>
    </details>
  );
}
