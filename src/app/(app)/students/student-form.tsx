"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Plus, Save, UserPlus } from "lucide-react";
import { createStudent, updateStudent, type FormState } from "./actions";
import { useRefreshOnSuccess } from "@/components/use-refresh-on-success";
import type { Section } from "@/lib/types";

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

export function CreateStudentForm({ sections }: { sections: Section[] }) {
  const [state, action, pending] = useActionState(createStudent, initial);
  useRefreshOnSuccess(state);

  return (
    <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Add a student</p>
          <p className="text-xs text-slate-500">
            Creates the student record and enrolls them in the current-term subjects for their
            department.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
          <UserPlus className="h-4 w-4" /> New student
        </span>
      </summary>

      <form action={action} className="space-y-3 border-t border-slate-100 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Register number</span>
            <input
              name="register_number"
              required
              maxLength={20}
              placeholder="CSE24031"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Full name</span>
            <input
              name="name"
              required
              placeholder="Student name"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Email (optional)</span>
            <input
              name="email"
              type="email"
              placeholder="student@college.edu"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Section</span>
            <select
              name="section_id"
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  Section {section.name} · Year {section.year}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Year of study</span>
            <input
              name="current_year"
              type="number"
              min={1}
              max={6}
              defaultValue={2}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </label>
        </div>

        <Feedback state={state} />

        <button
          type="submit"
          disabled={pending || sections.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-70"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {pending ? "Saving…" : "Create student"}
        </button>
      </form>
    </details>
  );
}

export function EditStudentForm({
  student,
  sections,
}: {
  student: {
    id: string;
    name: string;
    email: string | null;
    section_id: string;
    current_year: number;
    status: string;
  };
  sections: Section[];
}) {
  const [state, action, pending] = useActionState(updateStudent, initial);
  useRefreshOnSuccess(state);

  return (
    <details className="rounded-xl border border-slate-200 bg-slate-50/60">
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900">
        Edit student record
      </summary>
      <form action={action} className="space-y-2 border-t border-slate-200 px-3 py-3">
        <input type="hidden" name="id" value={student.id} />
        <input
          name="name"
          defaultValue={student.name}
          required
          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500"
        />
        <input
          name="email"
          type="email"
          defaultValue={student.email ?? ""}
          placeholder="student@college.edu"
          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            name="section_id"
            defaultValue={student.section_id}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500"
          >
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                Section {section.name}
              </option>
            ))}
          </select>
          <input
            name="current_year"
            type="number"
            min={1}
            max={6}
            defaultValue={student.current_year}
            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500"
          />
        </div>
        <select
          name="status"
          defaultValue={student.status}
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <Feedback state={state} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-70"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </button>
      </form>
    </details>
  );
}
