"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createAssessment, deleteAssessment, updateAssessment, type FormState } from "./actions";
import { useRefreshOnSuccess } from "@/components/use-refresh-on-success";
import type { AcademicTerm, Assessment, Subject } from "@/lib/types";

const initial: FormState = {};

export function Feedback({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-400 ring-1 ring-rose-500/25">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400 ring-1 ring-emerald-200">
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
  useRefreshOnSuccess(state);
  const current = terms.find((term) => term.is_current) ?? terms[terms.length - 1];

  return (
    <details className="rounded-2xl border border-brand-border bg-brand-navy shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-brand-text">Configure an assessment</p>
          <p className="text-xs text-brand-muted">
            CAT 1, CAT 2, or semester exam with configurable marks and weightage.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-blue px-3 py-2 text-sm font-medium text-white">
          <Plus className="h-4 w-4" /> New assessment
        </span>
      </summary>

      <form action={action} className="space-y-3 border-t border-brand-border px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-brand-text">Subject</span>
            <select
              name="subject_id"
              required
              className="w-full rounded-xl border border-brand-border bg-brand-navy px-3 py-2 text-sm outline-none focus:border-brand-blue"
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code} — {subject.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-brand-text">Term</span>
            <select
              name="academic_term_id"
              required
              defaultValue={current?.id}
              className="w-full rounded-xl border border-brand-border bg-brand-navy px-3 py-2 text-sm outline-none focus:border-brand-blue"
            >
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-brand-text">Type</span>
            <select
              name="type"
              required
              className="w-full rounded-xl border border-brand-border bg-brand-navy px-3 py-2 text-sm outline-none focus:border-brand-blue"
            >
              <option value="cat1">CAT 1</option>
              <option value="cat2">CAT 2</option>
              <option value="semester">Semester exam</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-brand-text">Maximum marks</span>
            <input
              name="max_marks"
              type="number"
              min={1}
              step="0.5"
              defaultValue={100}
              required
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-blue"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-brand-text">Weightage (%)</span>
            <input
              name="weightage_percent"
              type="number"
              min={0}
              max={100}
              step="0.5"
              defaultValue={20}
              required
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-blue"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-brand-text">Date</span>
            <input
              name="date"
              type="date"
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-blue"
            />
          </label>
        </div>

        <Feedback state={state} />

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-70"
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
  useRefreshOnSuccess(state);
  const router = useRouter();

  // Deleting returns no state; refresh explicitly so the list drops the row.
  // Marks and audit rows cascade with the assessment, so warn first.
  async function handleDelete(formData: FormData) {
    if (!window.confirm("Delete this assessment and all marks recorded for it?")) return;
    await deleteAssessment(formData);
    router.refresh();
  }

  return (
    <details className="rounded-xl border border-brand-border bg-brand-panel/60">
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-brand-muted hover:text-brand-text">
        Edit configuration
      </summary>
      <form action={action} className="space-y-2 border-t border-brand-border px-3 py-3">
        <input type="hidden" name="id" value={assessment.id} />
        <label className="block text-xs">
          <span className="mb-1 block text-brand-muted">Type</span>
          <select
            name="type"
            defaultValue={assessment.type}
            className="w-full rounded-lg border border-brand-border bg-brand-navy px-2.5 py-1.5 text-sm outline-none focus:border-brand-blue"
          >
            <option value="cat1">CAT 1</option>
            <option value="cat2">CAT 2</option>
            <option value="semester">Semester exam</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs">
            <span className="mb-1 block text-brand-muted">Max marks</span>
            <input
              name="max_marks"
              type="number"
              min={1}
              step="0.5"
              defaultValue={assessment.max_marks}
              className="w-full rounded-lg border border-brand-border px-2.5 py-1.5 text-sm outline-none focus:border-brand-blue"
            />
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-brand-muted">Weightage %</span>
            <input
              name="weightage_percent"
              type="number"
              min={0}
              max={100}
              step="0.5"
              defaultValue={assessment.weightage_percent}
              className="w-full rounded-lg border border-brand-border px-2.5 py-1.5 text-sm outline-none focus:border-brand-blue"
            />
          </label>
        </div>
        <label className="block text-xs">
          <span className="mb-1 block text-brand-muted">Date</span>
          <input
            name="date"
            type="date"
            defaultValue={assessment.date ?? ""}
            className="w-full rounded-lg border border-brand-border px-2.5 py-1.5 text-sm outline-none focus:border-brand-blue"
          />
        </label>
        <Feedback state={state} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-medium text-white disabled:opacity-70"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </button>

        <button formAction={handleDelete} formNoValidate className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-400 transition hover:bg-rose-500/10">
          <Trash2 className="h-3.5 w-3.5" /> Delete assessment
        </button>
      </form>
    </details>
  );
}
