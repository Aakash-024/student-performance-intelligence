/**
 * Student Risk Analysis Agent — the first V2 agent.
 *
 * Input: the numeric evidence pack built by context.ts (RLS-scoped).
 * Output: a structured RiskInsight whose claims must be backed by the
 * evidence pack figures. The platform's rule-based indicator remains the
 * source of truth; the agent explains it, it does not replace it.
 */

import { chatComplete, extractJsonObject } from "../provider";
import { RISK_OUTPUT_SCHEMA, systemPrompt } from "../prompts";
import type { FactorSeverity, RiskInsight } from "../types";

const SEVERITIES: FactorSeverity[] = ["high", "medium", "low"];

function asSeverity(value: unknown): FactorSeverity {
  return SEVERITIES.includes(value as FactorSeverity) ? (value as FactorSeverity) : "low";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item)).filter((item) => item.trim().length > 0)
    : [];
}

export async function runRiskAnalysis(evidence: string): Promise<{
  insight: RiskInsight;
  model: string;
  durationMs: number;
}> {
  const result = await chatComplete({
    messages: [
      { role: "system", content: systemPrompt("risk_analysis") },
      {
        role: "user",
        content: `EVIDENCE (the only data you may use):\n\n${evidence}\n\n${RISK_OUTPUT_SCHEMA}`,
      },
    ],
  });

  const parsed = extractJsonObject(result.text) as Partial<RiskInsight>;
  const headline = typeof parsed.headline === "string" ? parsed.headline.trim() : "";
  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";

  if (!headline || !summary) {
    throw new Error("The model returned an unexpected response shape.");
  }

  const factors = (Array.isArray(parsed.factors) ? parsed.factors : []).map((factor) => ({
    label: String(factor?.label ?? "Factor").trim() || "Factor",
    detail: String(factor?.detail ?? "").trim(),
    severity: asSeverity(factor?.severity),
  }));

  return {
    insight: {
      headline,
      summary,
      factors,
      focus_areas: asStringArray(parsed.focus_areas),
      evidence: asStringArray(parsed.evidence),
    },
    model: result.model,
    durationMs: result.durationMs,
  };
}
