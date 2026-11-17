"use server";

import { requireStaff } from "@/lib/auth";
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
  await requireStaff();

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

  return { success: `${code} — ${name} created.` };
}

export async function updateSubject(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();

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
  const { error } = await supabase
    .from("subjects")
    .update({ code, name, department_id: departmentId, credits, type })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: `Subject code ${code} already exists.` };
    return { error: error.message };
  }

  return { success: `${code} — ${name} updated.` };
}

export async function deleteSubject(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Missing subject." };

  const supabase = await createClient();

  const [{ count: assessmentCount }, { count: enrollmentCount }] = await Promise.all([
    supabase.from("assessments").select("id", { count: "exact", head: true }).eq("subject_id", id),
    supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("subject_id", id),
  ]);

  if ((assessmentCount ?? 0) > 0 || (enrollmentCount ?? 0) > 0) {
    return {
      error: "This subject still has assessments or enrolments. Remove those first.",
    };
  }

  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) return { error: error.message };

  return { success: "Subject deleted." };
}
