/**
 * Shared types for the V2 AI agent layer.
 *
 * Design rule: agents may only *describe* data that was fetched from Postgres
 * through the signed-in user's RLS-scoped client. Every insight therefore
 * carries an `evidence` list pointing back at the concrete numbers used.
 */

export type AgentName =
  | "risk_analysis"
  | "performance_analyst"
  | "recommendations"
  | "teacher_assistant"
  | "report_summary";

export type FactorSeverity = "high" | "medium" | "low";

export interface RiskFactor {
  label: string;
  detail: string;
  severity: FactorSeverity;
}

export interface RiskInsight {
  headline: string;
  summary: string;
  factors: RiskFactor[];
  focus_areas: string[];
  evidence: string[];
}

export interface ChatResult {
  text: string;
  model: string;
  durationMs: number;
}
