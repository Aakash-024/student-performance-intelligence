"use server";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { enrollStudentsInCurrentTerm } from "@/lib/student-enrollment";

export interface FormState {
  error?: string;
  success?: string;
}

/**
 * Creates a student and enrolls them in every subject belonging to their
 * section's department for the current academic term, so that marks entry and
 * analytics work immediately after the student is added.
 */
export async function createStudent(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();

  const registerNumber = String(formData.get("register_number") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const sectionId = String(formData.get("section_id") ?? "").trim();
  const currentYear = Number(formData.get("current_year") ?? 0);

  if (!registerNumber || !name || !sectionId) {
    return { error: "Register number, name, and section are required." };
  }
  if (!/^[A-Z0-9-]{4,20}$/.test(registerNumber)) {
    return { error: "Register number must be 4-20 characters (letters, digits, hyphens)." };
  }
  if (!Number.isInteger(currentYear) || currentYear < 1 || currentYear > 6) {
    return { error: "Year of study must be a whole number between 1 and 6." };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address or leave it blank." };
  }

  const supabase = await createClient();

  const { data: section } = await supabase
    .from("sections")
    .select("id, department_id")
    .eq("id", sectionId)
    .maybeSingle();

  if (!section) return { error: "That section does not exist." };

  const { data: created, error } = await supabase
    .from("students")
    .insert({
      register_number: registerNumber,
      name,
      email: email || null,
      section_id: sectionId,
      current_year: currentYear,
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: `Register number ${registerNumber} already exists.` };
    return { error: error.message };
  }

  const { error: enrollError } = await enrollStudentsInCurrentTerm(supabase, [
    { id: created.id, department_id: section.department_id },
  ]);

  if (enrollError) {
    // The student exists; report the partial failure instead of hiding it.
    return {
      error: `Student created, but enrolling them in subjects failed: ${enrollError}`,
    };
  }

  // Small state + client refresh; see assessments/actions.ts for why not redirect.
  return { success: `${name} (${registerNumber}) added and enrolled in the current term.` };
}

export async function updateStudent(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const sectionId = String(formData.get("section_id") ?? "").trim();
  const currentYear = Number(formData.get("current_year") ?? 0);
  const status = String(formData.get("status") ?? "active");

  if (!id) return { error: "Missing student." };
  if (!name || !sectionId) return { error: "Name and section are required." };
  if (!Number.isInteger(currentYear) || currentYear < 1 || currentYear > 6) {
    return { error: "Year of study must be a whole number between 1 and 6." };
  }
  if (status !== "active" && status !== "inactive") {
    return { error: "Status must be active or inactive." };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address or leave it blank." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({
      name,
      email: email || null,
      section_id: sectionId,
      current_year: currentYear,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  return { success: "Student record updated." };
}
