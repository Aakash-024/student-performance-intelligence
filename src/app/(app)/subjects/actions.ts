"use server";

import { requireStaff } from "@/lib/auth";
import { diffChanges, logActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  success?: string;
}

const SUBJECT_TYPES = ["theory", "lab", "elective"] as const;

function cleanCode(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function codeProblem(code: string): string | null {
  if (!code) return "Code is required.";
  if (!/^[A-Z0-9]{2,12}$/.test(code)) {
    return "Code must be 2-12 characters, letters and digits only.";
  }
  return null;
}

function detailsProblem(name: string, departmentId: string, credits: number, type: string) {
  if (!name) return "Name is required.";
  if (!departmentId) return "Department is required.";
  if (!Number.isInteger(credits) || credits < 1 || credits > 10) {
    return "Credits must be a whole number between 1 and 10.";
  }
  if (!SUBJECT_TYPES.includes(type as (typeof SUBJECT_TYPES)[number])) {
    return "Choose a valid subject type.";
  }
  return null;
}

export async function createSubject(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const { user, profile } = await requireStaff();

  const code = cleanCode(formData.get("code"));
  const name = String(formData.get("name") ?? "").trim();
  const departmentId = String(formData.get("department_id") ?? "").trim();
  const credits = Number(formData.get("credits") ?? 0);
  const type = String(formData.get("type") ?? "theory");

  const problem = codeProblem(code) ?? detailsProblem(name, departmentId, credits, type);
  if (problem) return { error: problem };

  const supabase = await createClient();
  const { error } = await supabase.from("subjects").insert({
    code,
    name,
    department_id: departmentId,
    credits,
    type,
  });

  if (error) {
    if (error.code === "23505") return { error: `Subject code ${code} already exists.` };
    return { error: error.message };
  }

  await logActivity(supabase, {
    actorId: user.id,
    actorRole: profile?.role === "admin" ? "admin" : "teacher",
    actorName: profile?.full_name || profile?.email || user.id,
    action: "subject.create",
    entityType: "subject",
    entityLabel: `${code} — ${name}`,
    summary: `Created subject ${code} — ${name}.`,
    details: { code, name, department_id: departmentId, credits, type },
  });

  return { success: `${code} — ${name} created.` };
}

export async function updateSubject(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const { user, profile } = await requireStaff();

  const id = String(formData.get("id") ?? "").trim();
  const code = cleanCode(formData.get("code"));
  const name = String(formData.get("name") ?? "").trim();
  const departmentId = String(formData.get("department_id") ?? "").trim();
  const credits = Number(formData.get("credits") ?? 0);
  const type = String(formData.get("type") ?? "theory");

  if (!id) return { error: "Missing subject." };
  const problem = codeProblem(code) ?? detailsProblem(name, departmentId, credits, type);
  if (problem) return { error: problem };

  const supabase = await createClient();

  const { data: before } = await supabase
    .from("subjects")
    .select("code, name, department_id, credits, type")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("subjects")
    .update({ code, name, department_id: departmentId, credits, type })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: `Subject code ${code} already exists.` };
    return { error: error.message };
  }

  const changes = before
    ? diffChanges(
        { code: before.code, name: before.name, department_id: before.department_id, credits: before.credits, type: before.type },
        { code, name, department_id: departmentId, credits, type },
      )
    : {};
  await logActivity(supabase, {
    actorId: user.id,
    actorRole: profile?.role === "admin" ? "admin" : "teacher",
    actorName: profile?.full_name || profile?.email || user.id,
    action: "subject.update",
    entityType: "subject",
    entityId: id,
    entityLabel: `${code} — ${name}`,
    summary: Object.keys(changes).length
      ? `Edited subject — changed ${Object.keys(changes).join(", ")}.`
      : "Edited subject.",
    details: { changes },
  });

  return { success: `${code} — ${name} updated.` };
}

export async function deleteSubject(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const { user, profile } = await requireStaff();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Missing subject." };

  const supabase = await createClient();

  const [{ count: assessmentCount }, { count: enrollmentCount }, { data: subject }] = await Promise.all([
    supabase.from("assessments").select("id", { count: "exact", head: true }).eq("subject_id", id),
    supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("subject_id", id),
    supabase.from("subjects").select("code, name").eq("id", id).maybeSingle(),
  ]);

  if ((assessmentCount ?? 0) > 0 || (enrollmentCount ?? 0) > 0) {
    return {
      error: "This subject still has assessments or enrolments. Remove those first.",
    };
  }

  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) return { error: error.message };

  await logActivity(supabase, {
    actorId: user.id,
    actorRole: profile?.role === "admin" ? "admin" : "teacher",
    actorName: profile?.full_name || profile?.email || user.id,
    action: "subject.delete",
    entityType: "subject",
    entityId: id,
    entityLabel: subject ? `${subject.code} — ${subject.name}` : id,
    summary: `Deleted subject ${subject?.code ?? id}.`,
    details: null,
  });

  return { success: "Subject deleted." };
}
