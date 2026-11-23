"use client";

import { useActionState, useState } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = {};

const inputClass =
  "w-full rounded-xl border border-brand-border bg-[var(--brand-panel)] py-2.5 pl-10 pr-3 text-sm text-brand-text shadow-sm outline-none transition placeholder:text-brand-muted focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/15";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [email, setEmail] = useState("admin@college.edu");
  const [password, setPassword] = useState("Admin@123");
  const [showPassword, setShowPassword] = useState(false);

  function fill(nextEmail: string, nextPassword: string) {
    setEmail(nextEmail);
    setPassword(nextPassword);
  }

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-brand-text">
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            placeholder="you@college.edu"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-brand-text">
          Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`${inputClass} pr-11`}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-brand-muted transition hover:bg-white/5 hover:text-brand-text"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {state?.error ? (
        <p className="flex items-start gap-2 rounded-xl bg-rose-500/10 px-3 py-2.5 text-sm text-rose-400 ring-1 ring-rose-500/25">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
          </>
        ) : (
          <>
            Sign in
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </>
        )}
      </button>

      <div className="flex items-center justify-between pt-1 text-xs text-brand-muted">
        <span>Quick fill:</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fill("admin@college.edu", "Admin@123")}
            className="rounded-full bg-white/5 px-2.5 py-1 font-medium text-brand-muted ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
          >
            Demo (view-only)
          </button>
          <button
            type="button"
            onClick={() => fill("teacher@college.edu", "Teacher@123")}
            className="rounded-full bg-white/5 px-2.5 py-1 font-medium text-brand-muted ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
          >
            Demo (view-only)
          </button>
        </div>
      </div>
      <p className="text-center text-[11px] text-brand-muted">
        Demo accounts can browse everything but cannot change any data.
      </p>
    </form>
  );
}