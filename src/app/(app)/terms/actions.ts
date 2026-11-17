"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  success?: string;
}

interface TermInput {
  id: string;
  name: string;
  year: number;
  semester: number;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

function readInput(formData: FormData): TermInput {
  return {
    id: String(formData.get("id") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    year: Number(formData.get("year") ?? 0),
    semester: Number(formData.get("semester") ?? 0),
    startDate: String(formData.get("start_date") ?? "").trim(),
    endDate: String(formData.get("end_date") ?? "").trim(),
    isCurrent: formData.get("is_current") === "on",
  };
}

function validate(input: TermInput): string | null {
  if (!input.name) return "Term name is required.";
  if (!Number.isInteger(input.year) || input.year < 2000 || input.year > 2100) {
    return "Year must be a whole number between 2000 and 2100.";
  }
  if (!Number.isInteger(input.semester) || input.semester < 1 || input.semester > 8) {
    return "Semester must be a whole number between 1 and 8.";
  }
  if (!input.startDate || !input.endDate) return "Start and end dates are required.";
  if (Number.isNaN(Date.parse(input.startDate)) || Number.isNaN(Date.parse(input.endDate))) {
    return "Enter valid dates.";
  }
  if (input.endDate <= input.startDate) return "End date must be after the start date.";
  return null;
}

/** Keep at most one current term so student enrolment stays unambiguous. */
async function clearCurrent(supabase: Awaited<ReturnType<typeof createClient>>, exceptId?: string) {
  let query = supabase.from("academic_terms").update({ is_current: false }).gt("year", 0);
  if (exceptId) query = query.neq("id", exceptId);
  await query;
}

export async function createTerm(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const input = readInput(formData);
  const problem = validate(input);
  if (problem) return { error: problem };

  const supabase = await createClient();
  if (input.isCurrent) await clearCurrent(supabase);

  const { error } = await supabase.from("academic_terms").insert({
    name: input.name,
    year: input.year,
    semester: input.semester,
    start_date: input.startDate,
    end_date: input.endDate,
    is_current: input.isCurrent,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: `Semester ${input.semester} of ${input.year} already exists.` };
    }
    return { error: error.message };
  }

  return { success: `${input.name} created.` };
}

export async function updateTerm(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const input = readInput(formData);
  if (!input.id) return { error: "Missing term." };
  const problem = validate(input);
  if (problem) return { error: problem };

  const supabase = await createClient();
  if (input.isCurrent) await clearCurrent(supabase, input.id);

  const { error } = await supabase
    .from("academic_terms")
    .update({
      name: input.name,
      year: input.year,
      semester: input.semester,
      start_date: input.startDate,
      end_date: input.endDate,
      is_current: input.isCurrent,
    })
    .eq("id", input.id);

  if (error) {
    if (error.code === "23505") {
      return { error: `Semester ${input.semester} of ${input.year} already exists.` };
    }
    return { error: error.message };
  }

  return { success: "Term updated." };
}

export async function deleteTerm(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Missing term." };

  const supabase = await createClient();
  const { error } = await supabase.from("academic_terms").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return { error: "This term has assessments, attendance, or enrolments. Remove those first." };
    }
    return { error: error.message };
  }

  return { success: "Term deleted." };
}
