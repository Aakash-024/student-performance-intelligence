"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Plus, Save, Trash2 } from "lucide-react";
import {
  createTerm,
  deleteTerm,
  updateTerm,
  type FormState,
} from "./actions";
import { useRefreshOnSuccess } from "@/components/use-refresh-on-success";
import type { AcademicTerm } from "@/lib/types";

const initial: FormState = {};

function Feedback({ state }: { state: FormState }) {
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

function TermFields({ term }: { term?: AcademicTerm }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm sm:col-span-2">
        <span className="mb-1 block font-medium text-slate-700">Term name</span>
        <input
          name="name"
          required
          maxLength={80}
          defaultValue={term?.name}
          placeholder="Even Semester 2024-25"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-slate-700">Academic year</span>
        <input
          name="year"
          type="number"
          min={2000}
          max={2100}
          required
          defaultValue={term?.year ?? new Date().getFullYear()}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-slate-700">Semester (1-8)</span>
        <input
          name="semester"
          type="number"
          min={1}
          max={8}
          required
          defaultValue={term?.semester ?? 1}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-slate-700">Start date</span>
        <input
          name="start_date"
          type="date"
          required
          defaultValue={term?.start_date}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-slate-700">End date</span>
        <input
          name="end_date"
          type="date"
          required
          defaultValue={term?.end_date}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
        <input
          name="is_current"
          type="checkbox"
          defaultChecked={term?.is_current ?? false}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        Current term (used for new student enrolments)
      </label>
    </div>
  );
}

export function CreateTermForm() {
  const [state, action, pending] = useActionState(createTerm, initial);
  useRefreshOnSuccess(state);

  return (
    <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Add a term</p>
          <p className="text-xs text-slate-500">
            Define semesters for any academic year (up to 8 per year).
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
          <Plus className="h-4 w-4" /> New term
        </span>
      </summary>

      <form action={action} className="space-y-3 border-t border-slate-100 px-5 py-4">
        <TermFields />
        <Feedback state={state} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-70"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {pending ? "Saving…" : "Create term"}
        </button>
      </form>
    </details>
  );
}

export function EditTermForm({ term }: { term: AcademicTerm }) {
  const [state, action, pending] = useActionState(updateTerm, initial);
  useRefreshOnSuccess(state);

  return (
    <details className="rounded-xl border border-slate-200 bg-slate-50/60">
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900">
        Edit details
      </summary>
      <form action={action} className="space-y-3 border-t border-slate-200 px-3 py-3">
        <input type="hidden" name="id" value={term.id} />
        <TermFields term={term} />
        <Feedback state={state} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-70"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </button>
      </form>
    </details>
  );
}

export function DeleteTermForm({ term }: { term: AcademicTerm }) {
  const [state, action, pending] = useActionState(deleteTerm, initial);
  useRefreshOnSuccess(state);

  return (
    <form action={action} className="mt-2">
      <input type="hidden" name="id" value={term.id} />
      <Feedback state={state} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-70"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete term
      </button>
    </form>
  );
}
