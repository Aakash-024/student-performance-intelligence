import { CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn, indicatorMeta } from "@/lib/utils";
import type { Indicator } from "@/lib/types";

/**
 * Success banner rendered from a `?flash=` query parameter.
 *
 * Mutating server actions end with redirect(`...?flash=...`) instead of
 * revalidatePath + return state: on production builds, revalidatePath-based
 * action responses can hang open (vercel/next.js#95714), leaving forms stuck
 * in the pending state even though the write committed. Pages are dynamic, so
 * the redirect renders completely fresh data anyway.
 */
export function Flash({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mb-4 flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {message}
    </p>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]",
        className,
      )}
    >
      {title || action ? (
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            {title ? <h2 className="text-sm font-semibold text-slate-900">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={cn("px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  );
}

const tones = {
  indigo: "bg-indigo-50 text-indigo-600 ring-indigo-500/10",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-500/10",
  amber: "bg-amber-50 text-amber-600 ring-amber-500/10",
  rose: "bg-rose-50 text-rose-600 ring-rose-500/10",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/10",
  sky: "bg-sky-50 text-sky-600 ring-sky-500/10",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "indigo",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof tones;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
        </div>
        <span className={cn("grid h-10 w-10 place-items-center rounded-xl ring-1", tones[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {hint ? <div className="mt-3 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export function IndicatorBadge({ indicator }: { indicator: Indicator }) {
  const meta = indicatorMeta[indicator] ?? indicatorMeta.on_track;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        meta.className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ProgressBar({ value, tone = "indigo" }: { value: number; tone?: "indigo" | "emerald" | "amber" | "rose" }) {
  const colors = {
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={cn("h-full rounded-full", colors[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
