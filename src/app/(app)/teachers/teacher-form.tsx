"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { addAssignment, createTeacher, removeAssignment, type FormState } from "./actions";
import type { AcademicTerm, Department, Section, Subject } from "@/lib/types";

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

export function CreateTeacherForm({ departments }: { departments: Department[] }) {
  const [state, action, pending] = useActionState(createTeacher, initial);

  return (
    <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Add a teacher</p>
          <p className="text-xs text-slate-500">
            Creates a Supabase auth account with the teacher role and an employee profile.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
          <UserPlus className="h-4 w-4" /> New teacher
        </span>
      </summary>

      <form action={action} className="space-y-3 border-t border-slate-100 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Full name</span>
            <input
              name="full_name"
              required
              placeholder="Prof. Anita Rao"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Email</span>
            <input
              name="email"
              type="email"
              required
              placeholder="anita.rao@college.edu"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Temporary password</span>
            <input
              name="password"
              type="text"
              required
              minLength={8}
              placeholder="At least 8 characters"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Employee ID</span>
            <input
              name="employee_id"
              required
              placeholder="EMP-CSE-002"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-indigo-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Department</span>
            <select
              name="department_id"
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code} — {department.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <Feedback state={state} />

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-70"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          {pending ? "Creating…" : "Create teacher account"}
        </button>
      </form>
    </details>
  );
}

export function AssignClassForm({
  teacherProfileId,
  subjects,
  sections,
  terms,
}: {
  teacherProfileId: string;
  subjects: Subject[];
  sections: Section[];
  terms: AcademicTerm[];
}) {
  const [state, action, pending] = useActionState(addAssignment, initial);
  const current = terms.find((term) => term.is_current) ?? terms[terms.length - 1];

  return (
    <form action={action} className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3">
      <input type="hidden" name="teacher_profile_id" value={teacherProfileId} />
      <div className="grid gap-2 sm:grid-cols-3">
        <select
          name="subject_id"
          required
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"
        >
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.code}
            </option>
          ))}
        </select>
        <select
          name="section_id"
          required
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"
        >
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              Section {section.name}
            </option>
          ))}
        </select>
        <select
          name="academic_term_id"
          required
          defaultValue={current?.id}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"
        >
          {terms.map((term) => (
            <option key={term.id} value={term.id}>
              {term.name}
            </option>
          ))}
        </select>
      </div>
      <Feedback state={state} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:opacity-70"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        Assign class
      </button>
    </form>
  );
}

export function RemoveAssignmentButton({ id }: { id: string }) {
  return (
    <form action={removeAssignment}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
        aria-label="Remove assignment"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
