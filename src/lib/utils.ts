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
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  improving: {
    label: "Improving",
    className: "bg-sky-50 text-sky-700 ring-sky-600/20",
    dot: "bg-sky-500",
  },
  on_track: {
    label: "On track",
    className: "bg-slate-100 text-slate-700 ring-slate-500/20",
    dot: "bg-slate-400",
  },
  declining: {
    label: "Declining",
    className: "bg-amber-50 text-amber-800 ring-amber-600/20",
    dot: "bg-amber-500",
  },
  at_risk: {
    label: "At risk",
    className: "bg-rose-50 text-rose-700 ring-rose-600/20",
    dot: "bg-rose-500",
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
    internal: "Internal",
    semester: "Semester exam",
  };
  return map[type] ?? type;
}

export function termLabel(name: string) {
  return name.replace("Semester", "Sem");
}
