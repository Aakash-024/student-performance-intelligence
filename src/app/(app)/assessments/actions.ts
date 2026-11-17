"use server";

import { requireStaff } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  success?: string;
}

const TYPES = ["cat1", "cat2", "semester"] as const;

export async function createAssessment(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const { user, profile } = await requireStaff();

  const subjectId = String(formData.get("subject_id") ?? "");
  const termId = String(formData.get("academic_term_id") ?? "");
  const type = String(formData.get("type") ?? "");
  const maxMarks = Number(formData.get("max_marks") ?? 0);
  const weightage = Number(formData.get("weightage_percent") ?? 0);
  const date = String(formData.get("date") ?? "").trim();

  if (!subjectId || !termId) return { error: "Choose a subject and term." };
  if (!TYPES.includes(type as (typeof TYPES)[number])) return { error: "Choose a valid assessment type." };
  if (!(maxMarks > 0)) return { error: "Maximum marks must be greater than zero." };
  if (!(weightage >= 0 && weightage <= 100)) return { error: "Weightage must be between 0 and 100." };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("assessments")
    .insert({
      subject_id: subjectId,
      academic_term_id: termId,
      type,
      max_marks: maxMarks,
      weightage_percent: weightage,
      date: date || null,
    })
    .select("id, subjects(code), academic_terms(name)")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { error: "That subject already has this assessment type in the selected term." };
    }
    return { error: error.message };
  }

  const subjectCode = (created?.subjects as { code?: string } | null)?.code ?? subjectId;
  const termName = (created?.academic_terms as { name?: string } | null)?.name ?? termId;
  await logActivity(supabase, {
    actorId: user.id,
    actorRole: profile?.role === "admin" ? "admin" : "teacher",
    actorName: profile?.full_name || profile?.email || user.id,
    action: "assessment.create",
    entityType: "assessment",
    entityId: created?.id ?? null,
    entityLabel: `${subjectCode} · ${termName} · ${type.toUpperCase()}`,
    summary: `Created ${type.toUpperCase()} assessment for ${subjectCode} (${termName}) — max ${maxMarks}, weight ${weightage}%.`,
    details: { subject_id: subjectId, academic_term_id: termId, type, max_marks: maxMarks, weightage_percent: weightage, date: date || null },
  });

  return { success: "Assessment created." };
}

export async function updateAssessment(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const { user, profile } = await requireStaff();

  const id = String(formData.get("id") ?? "");
  const type = String(formData.get("type") ?? "");
  const maxMarks = Number(formData.get("max_marks") ?? 0);
  const weightage = Number(formData.get("weightage_percent") ?? 0);
  const date = String(formData.get("date") ?? "").trim();

  if (!id) return { error: "Missing assessment." };
  if (!TYPES.includes(type as (typeof TYPES)[number])) return { error: "Choose a valid assessment type." };
  if (!(maxMarks > 0)) return { error: "Maximum marks must be greater than zero." };
  if (!(weightage >= 0 && weightage <= 100)) return { error: "Weightage must be between 0 and 100." };

  const supabase = await createClient();

  const { data: before } = await supabase
    .from("assessments")
    .select("type, max_marks, weightage_percent, date, subjects(code), academic_terms(name)")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("assessments")
    .update({ type, max_marks: maxMarks, weightage_percent: weightage, date: date || null })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "That subject already has this assessment type in the selected term." };
    }
    return { error: error.message };
  }

  const subjectCode = (before?.subjects as { code?: string } | null)?.code ?? id;
  const termName = (before?.academic_terms as { name?: string } | null)?.name ?? "";
  const changes: Record<string, [unknown, unknown]> = {};
  if (before) {
    if (before.type !== type) changes.type = [before.type, type];
    if (Number(before.max_marks) !== maxMarks) changes.max_marks = [before.max_marks, maxMarks];
    if (Number(before.weightage_percent) !== weightage) changes.weightage_percent = [before.weightage_percent, weightage];
    if ((before.date ?? null) !== (date || null)) changes.date = [before.date, date || null];
  }
  await logActivity(supabase, {
    actorId: user.id,
    actorRole: profile?.role === "admin" ? "admin" : "teacher",
    actorName: profile?.full_name || profile?.email || user.id,
    action: "assessment.update",
    entityType: "assessment",
    entityId: id,
    entityLabel: `${subjectCode} · ${termName} · ${type.toUpperCase()}`,
    summary: Object.keys(changes).length
      ? `Edited assessment — changed ${Object.keys(changes).join(", ")}.`
      : "Edited assessment.",
    details: { changes },
  });

  return { success: "Assessment updated." };
}

export async function deleteAssessment(formData: FormData) {
  const { user, profile } = await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("assessments")
    .select("type, subjects(code), academic_terms(name)")
    .eq("id", id)
    .maybeSingle();

  await supabase.from("assessments").delete().eq("id", id);

  const subjectCode = (before?.subjects as { code?: string } | null)?.code ?? id;
  const termName = (before?.academic_terms as { name?: string } | null)?.name ?? "";
  await logActivity(supabase, {
    actorId: user.id,
    actorRole: profile?.role === "admin" ? "admin" : "teacher",
    actorName: profile?.full_name || profile?.email || user.id,
    action: "assessment.delete",
    entityType: "assessment",
    entityId: id,
    entityLabel: `${subjectCode} · ${termName} · ${(before?.type ?? "?").toUpperCase()}`,
    summary: `Deleted the ${String(before?.type ?? "").toUpperCase()} assessment for ${subjectCode} (${termName}) and all of its marks.`,
    details: null,
  });
}

export async function saveMarks(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const { user, profile } = await requireStaff();
  const assessmentId = String(formData.get("assessment_id") ?? "");
  if (!assessmentId) return { error: "Missing assessment." };

  const supabase = await createClient();
  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, max_marks, subject_id, subjects(code), academic_terms(name)")
    .eq("id", assessmentId)
    .maybeSingle();

  if (!assessment) return { error: "Assessment not found." };

  const entries: {
    student_id: string;
    assessment_id: string;
    marks_obtained: number;
    is_absent: boolean;
    entered_by: string;
  }[] = [];

  const studentIds = new Set<string>();
  for (const key of formData.keys()) {
    if (key.startsWith("mark_")) studentIds.add(key.slice(5));
    if (key.startsWith("absent_")) studentIds.add(key.slice(7));
  }

  for (const studentId of studentIds) {
    const absent = formData.get(`absent_${studentId}`) === "on";
    const raw = String(formData.get(`mark_${studentId}`) ?? "").trim();

    if (!absent && raw === "") continue;
    const marks = absent ? 0 : Number(raw);

    if (!absent && (Number.isNaN(marks) || marks < 0)) {
      return { error: `Marks must be a non-negative number (student ${studentId.slice(0, 8)}).` };
    }
    if (!absent && marks > Number(assessment.max_marks)) {
      return {
        error: `Marks cannot exceed the maximum of ${assessment.max_marks} (student ${studentId.slice(0, 8)}).`,
      };
    }

    entries.push({
      student_id: studentId,
      assessment_id: assessmentId,
      marks_obtained: marks,
      is_absent: absent,
      entered_by: user.id,
    });
  }

  if (!entries.length) return { error: "No marks to save. Enter a score or mark absent." };

  // Log corrections: an existing mark whose value or absence flag changes.
  // First-time entries are not corrections. The audit insert is best-effort:
  // a logging failure must never block a legitimate mark save.
  const existing = await supabase
    .from("marks")
    .select("student_id, marks_obtained, is_absent")
    .eq("assessment_id", assessmentId)
    .in("student_id", entries.map((entry) => entry.student_id));
  const previous = new Map(
    (existing.data ?? []).map((row) => [
      row.student_id as string,
      { marks: Number(row.marks_obtained), absent: Boolean(row.is_absent) },
    ]),
  );

  const corrections = entries
    .filter((entry) => {
      const before = previous.get(entry.student_id);
      return (
        before &&
        (before.marks !== entry.marks_obtained || before.absent !== entry.is_absent)
      );
    })
    .map((entry) => ({
      assessment_id: assessmentId,
      student_id: entry.student_id,
      actor_id: user.id,
      actor_role: profile?.role ?? "teacher",
      old_marks: previous.get(entry.student_id)!.marks,
      new_marks: entry.marks_obtained,
      old_is_absent: previous.get(entry.student_id)!.absent,
      new_is_absent: entry.is_absent,
    }));

  const { error } = await supabase
    .from("marks")
    .upsert(entries, { onConflict: "student_id,assessment_id" });

  if (error) {
    if (error.code === "42501") {
      return { error: "You are not assigned to this subject/section, so the database rejected the write." };
    }
    return { error: error.message };
  }

  if (corrections.length) {
    const { error: auditError } = await supabase.from("mark_audit").insert(corrections);
    if (auditError) console.error("[audit] failed to log mark corrections:", auditError.message);
  }

  const subjectCode = (assessment.subjects as { code?: string } | null)?.code ?? assessment.subject_id;
  const termName = (assessment.academic_terms as { name?: string } | null)?.name ?? "";
  await logActivity(supabase, {
    actorId: user.id,
    actorRole: profile?.role === "admin" ? "admin" : "teacher",
    actorName: profile?.full_name || profile?.email || user.id,
    action: "marks.save",
    entityType: "marks",
    entityId: assessmentId,
    entityLabel: `${subjectCode} · ${termName}`,
    summary: `Saved ${entries.length} mark${entries.length === 1 ? "" : "s"} for ${subjectCode} (${termName})${corrections.length ? ` — ${corrections.length} correction${corrections.length === 1 ? "" : "s"} audited` : ""}.`,
    details: { saved: entries.length, corrections: corrections.length },
  });

  // NOTE: return a small state object and let the client refresh.
  // On production builds, action responses that carry revalidatePath re-renders
  // (or a redirect to a large page) can hang open (vercel/next.js#95714):
  // the write commits but useActionState stays pending forever.
  return { success: `Saved ${entries.length} mark${entries.length === 1 ? "" : "s"} as ${profile?.full_name ?? "user"}.` };
}
