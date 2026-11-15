"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildStudentRiskContext } from "@/lib/ai/context";
import { runRiskAnalysis } from "@/lib/ai/agents/risk-analysis";
import { logAiInsight } from "@/lib/ai/audit";
import type { RiskInsight } from "@/lib/ai/types";

export interface AiInsightState {
  error?: string;
  insight?: RiskInsight;
  model?: string;
  durationMs?: number;
}

/**
 * Runs the Student Risk Analysis Agent for one student.
 *
 * Security: the signed-in user's Supabase client builds the evidence pack, so
 * RLS decides what the agent can ever see. Both admins and teachers may use
 * it — a teacher simply gets answers scoped to their own data, exactly like
 * every other page.
 *
 * The agent is advisory only: it writes nothing to academic tables. The only
 * write is the audit row recording that this user ran this agent.
 */
export async function generateRiskInsight(
  _prev: AiInsightState | undefined,
  formData: FormData,
): Promise<AiInsightState> {
  const { user, profile } = await requireUser();
  if (profile?.role !== "admin" && profile?.role !== "teacher") {
    return { error: "You do not have permission to use the AI agents." };
  }

  const studentId = String(formData.get("student_id") ?? "").trim();
  if (!studentId) return { error: "Missing student." };

  const supabase = await createClient();
  const context = await buildStudentRiskContext(supabase, studentId);
  if (!context) return { error: "Student not found." };

  let result: Awaited<ReturnType<typeof runRiskAnalysis>>;
  try {
    result = await runRiskAnalysis(context.evidence);
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "The AI analysis failed." };
  }

  await logAiInsight(supabase, {
    actorId: user.id,
    actorRole: profile.role,
    agent: "risk_analysis",
    studentId: context.studentId,
    model: result.model,
    promptSummary: `Risk analysis for ${context.studentName} (${context.registerNumber}), indicator: ${context.indicatorLabel}.`,
    responseSummary: result.insight.headline,
    durationMs: result.durationMs,
  });

  // Small state object; the panel renders it directly.
  return {
    insight: result.insight,
    model: result.model,
    durationMs: result.durationMs,
  };
}