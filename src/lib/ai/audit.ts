/**
 * Audit logging for the V2 AI agents.
 *
 * Every agent run is appended to `ai_insights` (migration 006) so staff can
 * later review what was asked, which model answered and for whom. Logging is
 * best-effort: a failed insert is reported to the server console but must not
 * break the user's insight — the row simply will not exist.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentName } from "./types";

export async function logAiInsight(
  supabase: SupabaseClient,
  entry: {
    actorId: string;
    actorRole: "admin" | "teacher";
    agent: AgentName;
    studentId?: string | null;
    model: string;
    promptSummary: string;
    responseSummary: string;
    durationMs?: number;
  },
) {
  const { error } = await supabase.from("ai_insights").insert({
    actor_id: entry.actorId,
    actor_role: entry.actorRole,
    agent: entry.agent,
    student_id: entry.studentId ?? null,
    model: entry.model,
    prompt_summary: entry.promptSummary,
    response_summary: entry.responseSummary,
    duration_ms: entry.durationMs ?? null,
  });

  if (error) {
    console.error("[ai] failed to write ai_insights row:", error.message);
  }
}
