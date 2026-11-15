"use server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  success?: string;
}

const SUBJECT_TYPES = ["theory", "lab", "elective"] as const;

export async function createSubject(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const departmentId = String(formData.get("department_id") ?? "").trim();
  const credits = Number(formData.get("credits") ?? 0);
  const type = String(formData.get("type") ?? "theory");

  if (!code || !name || !departmentId) {
    return { error: "Code, name, and department are required." };
  }
  if (!/^[A-Z0-9]{2,12}$/.test(code)) {
    return { error: "Code must be 2-12 characters, letters and digits only." };
  }
  if (!Number.isInteger(credits) || credits < 1 || credits > 10) {
    return { error: "Credits must be a whole number between 1 and 10." };
  }
  if (!SUBJECT_TYPES.includes(type as (typeof SUBJECT_TYPES)[number])) {
    return { error: "Choose a valid subject type." };
  }

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
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const credits = Number(formData.get("credits") ?? 0);
  const type = String(formData.get("type") ?? "theory");

  if (!id) return { error: "Missing subject." };
  if (!name) return { error: "Name is required." };
  if (!Number.isInteger(credits) || credits < 1 || credits > 10) {
    return { error: "Credits must be a whole number between 1 and 10." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("subjects")
    .update({ name, credits, type })
    .eq("id", id);

  if (error) return { error: error.message };

  return { success: "Subject updated." };
}
