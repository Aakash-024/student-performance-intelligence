import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface ActivityEntry {
  actorId: string;
  actorRole: "admin" | "teacher";
  actorName: string;
  /** Dotted action, e.g. "student.update", "marks.save", "import.students". */
  action: string;
  entityType: string;
  entityId?: string | null;
  /** Human-readable name, stored so the log survives deletions. */
  entityLabel: string;
  summary: string;
  /** Structured before/after or counts payload. */
  details?: Record<string, unknown> | null;
}

/**
 * Records one activity-log row. Best-effort on purpose: a logging failure must
 * never block or undo the user's actual write (same policy as mark_audit).
 */
export async function logActivity(
  supabase: Supabase,
  entry: ActivityEntry,
): Promise<void> {
  const { error } = await supabase.from("activity_log").insert({
    actor_id: entry.actorId,
    actor_role: entry.actorRole,
    actor_name: entry.actorName,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    entity_label: entry.entityLabel,
    summary: entry.summary,
    details: entry.details ?? null,
  });
  if (error) console.error("[activity] failed to log:", error.message);
}

/** Builds a { field: [before, after] } map for edit summaries. */
export function diffChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, [unknown, unknown]> {
  const changes: Record<string, [unknown, unknown]> = {};
  for (const key of Object.keys(after)) {
    if (before[key] !== after[key]) changes[key] = [before[key], after[key]];
  }
  return changes;
}
