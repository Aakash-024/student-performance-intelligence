"use client";

import { useActionState } from "react";
import { AlertTriangle, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { generateRiskInsight, type AiInsightState } from "@/app/(app)/students/[id]/ai-actions";
import type { FactorSeverity } from "@/lib/ai/types";

const severityStyles: Record<FactorSeverity, string> = {
  high: "bg-rose-50 text-rose-600 ring-rose-500/10",
  medium: "bg-amber-50 text-amber-600 ring-amber-500/10",
  low: "bg-slate-100 text-slate-600 ring-slate-500/10",
};

const severityLabels: Record<FactorSeverity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function AiInsightPanel({ studentId }: { studentId: string }) {
  const [state, formAction, isPending] = useActionState<AiInsightState | undefined, FormData>(
    generateRiskInsight,
    undefined,
  );

  return (
    <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 shadow-sm shadow-slate-900/[0.03]">
      <div className="flex items-start justify-between gap-3 border-b border-indigo-100/70 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles className="h-4 w-4 text-indigo-500" /> AI insight
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            GLM analysis of this student&apos;s platform data, with the evidence it used
          </p>
        </div>
      </div>

      <div className="px-5 py-4">
        <form action={formAction}>
          <input type="hidden" name="student_id" value={studentId} />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing evidence…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate AI insight
              </>
            )}
          </button>
        </form>

        {state?.error ? (
          <p className="mt-3 flex items-start gap-2 text-sm text-rose-600">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
          </p>
        ) : null}

        {state?.insight ? (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">{state.insight.headline}</p>
              <p className="mt-1 text-sm text-slate-600">{state.insight.summary}</p>
            </div>

            {state.insight.factors.length ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Contributing factors
                </p>
                {state.insight.factors.map((factor, index) => (
                  <div
                    key={`${factor.label}-${index}`}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-800">{factor.label}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${severityStyles[factor.severity]}`}
                      >
                        {severityLabels[factor.severity]}
                      </span>
                    </div>
                    {factor.detail ? (
                      <p className="mt-1 text-xs text-slate-600">{factor.detail}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {state.insight.focus_areas.length ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Suggested focus areas
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {state.insight.focus_areas.map((area, index) => (
                    <li key={index} className="flex gap-2 text-sm text-slate-600">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {state.insight.evidence.length ? (
              <details className="group rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                <summary className="cursor-pointer text-xs font-medium text-slate-600">
                  Evidence used ({state.insight.evidence.length})
                </summary>
                <ul className="mt-2 space-y-1">
                  {state.insight.evidence.map((item, index) => (
                    <li key={index} className="text-xs text-slate-500">
                      {item}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}

            <p className="flex items-start gap-1.5 border-t border-indigo-100/70 pt-3 text-[11px] text-slate-500">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-400" />
              {state.model ?? "GLM"} · {((state.durationMs ?? 0) / 1000).toFixed(1)}s · Generated
              from your platform data — verify before acting. Advisory only; nothing is written to
              student records.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}