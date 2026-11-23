"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { createSubject, deleteSubject, updateSubject, type FormState } from "./actions";
import { useRefreshOnSuccess } from "@/components/use-refresh-on-success";
import type { Department, Subject } from "@/lib/types";

const initial: FormState = {};

function Feedback({ state }: { state: FormState }) {
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

export function CreateSubjectForm({ departments }: { departments: Department[] }) {
  const [state, action, pending] = useActionState(createSubject, initial);
  useRefreshOnSuccess(state);

  return (
    <details className="group rounded-2xl border border-brand-border bg-brand-navy shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-brand-text">Add a subject</p>
          <p className="text-xs text-brand-muted">
            Register a new subject. Teachers and administrators can edit it later.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-blue px-3 py-2 text-sm font-medium text-white">
          <Plus className="h-4 w-4" /> New subject
        </span>
      </summary>

      <form action={action} className="space-y-3 border-t border-brand-border px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-brand-text">Code</span>
            <input
              name="code"
              required
              maxLength={12}
              placeholder="CS206"
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm uppercase outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/15"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-brand-text">Name</span>
            <input
              name="name"
              required
              placeholder="Operating Systems"
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/15"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-brand-text">Department</span>
            <select
              name="department_id"
              required
              className="w-full rounded-xl border border-brand-border bg-brand-navy px-3 py-2 text-sm outline-none focus:border-brand-blue"
            >
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-brand-text">Credits</span>
              <input
                name="credits"
                type="number"
                min={1}
                max={10}
                defaultValue={3}
                required
                className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-blue"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-brand-text">Type</span>
              <select
                name="type"
                className="w-full rounded-xl border border-brand-border bg-brand-navy px-3 py-2 text-sm outline-none focus:border-brand-blue"
              >
                <option value="theory">Theory</option>
                <option value="lab">Lab</option>
                <option value="elective">Elective</option>
              </select>
            </label>
          </div>
        </div>

        <Feedback state={state} />

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-70"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {pending ? "Saving…" : "Create subject"}
        </button>
      </form>
    </details>
  );
}

export function EditSubjectForm({
  subject,
  departments,
}: {
  subject: Subject;
  departments: Department[];
}) {
  const [state, action, pending] = useActionState(updateSubject, initial);
  useRefreshOnSuccess(state);

  return (
    <details className="rounded-xl border border-brand-border bg-brand-panel/60">
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-brand-muted hover:text-brand-text">
        Edit code, name &amp; details
      </summary>
      <form action={action} className="space-y-2 border-t border-brand-border px-3 py-3">
        <input type="hidden" name="id" value={subject.id} />
        <div className="grid grid-cols-2 gap-2">
          <input
            name="code"
            defaultValue={subject.code}
            required
            maxLength={12}
            className="w-full rounded-lg border border-brand-border px-2.5 py-1.5 text-sm uppercase outline-none focus:border-brand-blue"
          />
          <input
            name="name"
            defaultValue={subject.name}
            required
            className="w-full rounded-lg border border-brand-border px-2.5 py-1.5 text-sm outline-none focus:border-brand-blue"
          />
        </div>
        <select
          name="department_id"
          defaultValue={subject.department_id}
          className="w-full rounded-lg border border-brand-border bg-brand-navy px-2.5 py-1.5 text-sm outline-none focus:border-brand-blue"
        >
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input
            name="credits"
            type="number"
            min={1}
            max={10}
            defaultValue={subject.credits}
            className="w-full rounded-lg border border-brand-border px-2.5 py-1.5 text-sm outline-none focus:border-brand-blue"
          />
          <select
            name="type"
            defaultValue={subject.type}
            className="w-full rounded-lg border border-brand-border bg-brand-navy px-2.5 py-1.5 text-sm outline-none focus:border-brand-blue"
          >
            <option value="theory">Theory</option>
            <option value="lab">Lab</option>
            <option value="elective">Elective</option>
          </select>
        </div>
        <Feedback state={state} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-medium text-white disabled:opacity-70"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </button>
      </form>
      <DeleteSubjectForm subject={subject} />
    </details>
  );
}

function DeleteSubjectForm({ subject }: { subject: Subject }) {
  const [state, action, pending] = useActionState(deleteSubject, initial);
  useRefreshOnSuccess(state);

  return (
    <form action={action} className="border-t border-brand-border px-3 py-2">
      <input type="hidden" name="id" value={subject.id} />
      <Feedback state={state} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-rose-400 transition hover:bg-rose-500/10 disabled:opacity-70"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete subject
      </button>
    </form>
  );
}
