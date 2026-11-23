"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { addAssignment, createTeacher, removeAssignment, type FormState } from "./actions";
import { useRefreshOnSuccess } from "@/components/use-refresh-on-success";
import type { AcademicTerm, Department, Section, Subject } from "@/lib/types";

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

export function CreateTeacherForm({ departments }: { departments: Department[] }) {
  const [state, action, pending] = useActionState(createTeacher, initial);
  useRefreshOnSuccess(state);

  return (
    <details className="rounded-2xl border border-brand-border bg-brand-navy shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-brand-text">Add a teacher</p>
          <p className="text-xs text-brand-muted">
            Creates a Supabase auth account with the teacher role and an employee profile.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-blue px-3 py-2 text-sm font-medium text-white">
          <UserPlus className="h-4 w-4" /> New teacher
        </span>
      </summary>

      <form action={action} className="space-y-3 border-t border-brand-border px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-brand-text">Full name</span>
            <input
              name="full_name"
              required
              placeholder="Prof. Anita Rao"
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-blue"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-brand-text">Email</span>
            <input
              name="email"
              type="email"
              required
              placeholder="anita.rao@college.edu"
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-blue"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-brand-text">Temporary password</span>
            <input
              name="password"
              type="text"
              required
              minLength={8}
              placeholder="At least 8 characters"
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-blue"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-brand-text">Employee ID</span>
            <input
              name="employee_id"
              required
              placeholder="EMP-CSE-002"
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm uppercase outline-none focus:border-brand-blue"
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
          className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-70"
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
  useRefreshOnSuccess(state);
  const current = terms.find((term) => term.is_current) ?? terms[terms.length - 1];

  return (
    <form action={action} className="mt-3 space-y-2 rounded-xl bg-brand-panel p-3">
      <input type="hidden" name="teacher_profile_id" value={teacherProfileId} />
      <div className="grid gap-2 sm:grid-cols-3">
        <select
          name="subject_id"
          required
          className="rounded-lg border border-brand-border bg-brand-navy px-2.5 py-1.5 text-xs outline-none focus:border-brand-blue"
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
          className="rounded-lg border border-brand-border bg-brand-navy px-2.5 py-1.5 text-xs outline-none focus:border-brand-blue"
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
          className="rounded-lg border border-brand-border bg-brand-navy px-2.5 py-1.5 text-xs outline-none focus:border-brand-blue"
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
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-110 disabled:opacity-70"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        Assign class
      </button>
    </form>
  );
}

export function RemoveAssignmentButton({ id }: { id: string }) {
  const router = useRouter();

  // Plain (stateless) action; refresh explicitly so the chip disappears.
  async function handleRemove(formData: FormData) {
    await removeAssignment(formData);
    router.refresh();
  }

  return (
    <form action={handleRemove}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-md p-1 text-brand-muted transition hover:bg-rose-500/10 hover:text-rose-400"
        aria-label="Remove assignment"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
