import type { LucideIcon } from "lucide-react";
import { Eye } from "lucide-react";
import { cn, indicatorMeta } from "@/lib/utils";
import type { Indicator } from "@/lib/types";

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
        <h1 className="text-2xl font-semibold tracking-tight text-brand-text">{title}</h1>
        {description ? <p className="mt-1 text-sm text-brand-muted">{description}</p> : null}
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
        "brand-panel rounded-2xl",
        className,
      )}
    >
      {title || action ? (
        <div className="flex items-start justify-between gap-3 border-b border-brand-border px-5 py-4">
          <div>
            {title ? <h2 className="text-sm font-semibold text-brand-text">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-brand-muted">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={cn("px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  );
}

const tones = {
  indigo: "bg-brand-blue/15 text-brand-cyan ring-brand-blue/30",
  emerald: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/25",
  amber: "bg-amber-500/10 text-amber-400 ring-amber-500/25",
  rose: "bg-rose-500/10 text-rose-400 ring-rose-500/25",
  slate: "bg-slate-500/10 text-brand-muted ring-slate-400/20",
  sky: "bg-sky-500/10 text-sky-400 ring-sky-500/25",
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
    <div className="brand-panel rounded-2xl p-5 transition hover:border-brand-blue/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-brand-text">{value}</p>
        </div>
        <span className={cn("grid h-10 w-10 place-items-center rounded-xl ring-1", tones[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {hint ? <div className="mt-3 text-xs text-brand-muted">{hint}</div> : null}
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-brand-border bg-brand-panel/60 px-6 py-12 text-center">
      <span className="h-1.5 w-10 rounded-full bg-brand-cyan/60" aria-hidden />
      <p className="mt-4 text-sm font-medium text-brand-text">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-brand-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "indigo",
}: {
  value: number;
  tone?: "indigo" | "emerald" | "amber" | "rose";
}) {
  const colors = {
    indigo: "bg-brand-blue",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-navy-soft">
      <div
        className={cn("h-full rounded-full", colors[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/**
 * Shown instead of edit forms for read-only accounts (the public demo
 * viewers). The database also enforces this: every write policy requires the
 * admin or teacher role, so hiding the form is UX, not the security boundary.
 */
export function ReadOnlyNote({ what = "editing" }: { what?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-brand-border bg-brand-panel/60 px-4 py-3 text-sm text-brand-muted">
      <Eye className="h-4 w-4 shrink-0 text-brand-muted" />
      <span>
        Demo accounts have view-only access — {what} is disabled. Sign in with a staff account to
        make changes.
      </span>
    </div>
  );
}
