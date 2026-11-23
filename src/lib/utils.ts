import type { Indicator } from "./types";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatPercent(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${Number(value).toFixed(digits)}%`;
}

export function formatScore(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export const indicatorMeta: Record<
  Indicator,
  { label: string; className: string; dot: string }
> = {
  high_performer: {
    label: "High performer",
    className: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/25",
    dot: "bg-emerald-400",
  },
  improving: {
    label: "Improving",
    className: "bg-sky-500/10 text-sky-400 ring-sky-500/25",
    dot: "bg-sky-400",
  },
  on_track: {
    label: "On track",
    className: "bg-slate-500/10 text-brand-muted ring-slate-400/20",
    dot: "bg-slate-400",
  },
  declining: {
    label: "Declining",
    className: "bg-amber-500/10 text-amber-400 ring-amber-500/25",
    dot: "bg-amber-400",
  },
  at_risk: {
    label: "At risk",
    className: "bg-rose-500/10 text-rose-400 ring-rose-500/25",
    dot: "bg-rose-400",
  },
};

export const INDICATOR_ORDER: Indicator[] = [
  "high_performer",
  "improving",
  "on_track",
  "declining",
  "at_risk",
];

export function assessmentLabel(type: string) {
  const map: Record<string, string> = {
    cat1: "CAT 1",
    cat2: "CAT 2",
    semester: "Semester exam",
  };
  return map[type] ?? type;
}

export function termLabel(name: string) {
  return name.replace("Semester", "Sem");
}
