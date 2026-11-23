"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Save, UserPlus } from "lucide-react";
import { useRefreshOnSuccess } from "@/components/use-refresh-on-success";
import { createAccount, resetPassword, updateRole, type FormState } from "./actions";

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

export function CreateAccountForm() {
  const [state, action, pending] = useActionState(createAccount, initial);
  useRefreshOnSuccess(state);

  return (
    <details className="rounded-2xl border border-brand-border bg-brand-navy shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-brand-text">Add a staff account</p>
          <p className="text-xs text-brand-muted">
            Creates a login with the email and password you set. The person signs in immediately.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-blue px-3 py-2 text-sm font-medium text-white">
          <UserPlus className="h-4 w-4" /> New account
        </span>
      </summary>

      <form action={action} className="space-y-3 border-t border-brand-border px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-brand-text">Full name</span>
            <input
              name="full_name"
              required
              placeholder="Priya Sharma"
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/15"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-brand-text">Email</span>
            <input
              name="email"
              type="email"
              required
              placeholder="priya@college.edu"
              className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-blue"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-brand-text">Password</span>
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
            <span className="mb-1 block font-medium text-brand-text">Role</span>
            <select
              name="role"
              defaultValue="teacher"
              className="w-full rounded-xl border border-brand-border bg-brand-navy px-3 py-2 text-sm outline-none focus:border-brand-blue"
            >
              <option value="teacher">Teacher — edit structure, enter marks for assigned classes</option>
              <option value="admin">Administrator — full control incl. accounts</option>
              <option value="viewer">Viewer — read-only (for showcase visitors)</option>
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
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>
    </details>
  );
}

export function AccountRowActions({
  user,
  isSelf,
}: {
  user: { id: string; email: string; role: string };
  isSelf: boolean;
}) {
  const [passwordState, passwordAction, passwordPending] = useActionState(resetPassword, initial);
  const [roleState, roleAction, rolePending] = useActionState(updateRole, initial);
  useRefreshOnSuccess(passwordState);
  useRefreshOnSuccess(roleState);

  return (
    <div className="mt-3 flex flex-wrap items-start gap-3">
      <form action={passwordAction} className="flex items-end gap-2">
        <input type="hidden" name="user_id" value={user.id} />
        <input type="hidden" name="email" value={user.email} />
        <label className="text-xs">
          <span className="mb-1 block font-medium text-brand-muted">New password</span>
          <input
            name="password"
            type="text"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="w-52 rounded-lg border border-brand-border px-2.5 py-1.5 text-sm outline-none focus:border-brand-blue"
          />
        </label>
        <button
          type="submit"
          disabled={passwordPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border px-2.5 py-2 text-xs font-medium text-brand-text transition hover:border-brand-cyan/60 hover:text-brand-cyan disabled:opacity-70"
        >
          {passwordPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
          Reset password
        </button>
      </form>

      {!isSelf ? (
        <form action={roleAction} className="flex items-end gap-2">
          <input type="hidden" name="user_id" value={user.id} />
          <input type="hidden" name="email" value={user.email} />
          <label className="text-xs">
            <span className="mb-1 block font-medium text-brand-muted">Change role</span>
            <select
              name="role"
              defaultValue={user.role}
              className="rounded-lg border border-brand-border bg-brand-navy px-2.5 py-1.5 text-sm outline-none focus:border-brand-blue"
            >
              <option value="teacher">Teacher</option>
              <option value="admin">Administrator</option>
              <option value="viewer">Viewer (read-only)</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={rolePending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border px-2.5 py-2 text-xs font-medium text-brand-text transition hover:border-brand-cyan/60 hover:text-brand-cyan disabled:opacity-70"
          >
            {rolePending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save role
          </button>
        </form>
      ) : (
        <p className="pb-1 text-xs text-brand-muted">This is your account — role changes are blocked to prevent lock-out.</p>
      )}

      <div className="w-full space-y-2">
        <Feedback state={passwordState} />
        <Feedback state={roleState} />
      </div>
    </div>
  );
}