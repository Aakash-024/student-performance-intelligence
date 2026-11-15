"use server";

import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  success?: string;
}

const TYPES = ["cat1", "cat2", "internal", "semester"] as const;

export async function createAssessment(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

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
  const { error } = await supabase.from("assessments").insert({
    subject_id: subjectId,
    academic_term_id: termId,
    type,
    max_marks: maxMarks,
    weightage_percent: weightage,
    date: date || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That subject already has this assessment type in the selected term." };
    }
    return { error: error.message };
  }

  redirect(`/assessments?flash=${encodeURIComponent("Assessment created.")}`);
}

export async function updateAssessment(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const maxMarks = Number(formData.get("max_marks") ?? 0);
  const weightage = Number(formData.get("weightage_percent") ?? 0);
  const date = String(formData.get("date") ?? "").trim();

  if (!id) return { error: "Missing assessment." };
  if (!(maxMarks > 0)) return { error: "Maximum marks must be greater than zero." };
  if (!(weightage >= 0 && weightage <= 100)) return { error: "Weightage must be between 0 and 100." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("assessments")
    .update({ max_marks: maxMarks, weightage_percent: weightage, date: date || null })
    .eq("id", id);

  if (error) return { error: error.message };

  redirect(`/assessments?flash=${encodeURIComponent("Assessment updated.")}`);
}

export async function deleteAssessment(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("assessments").delete().eq("id", id);
  redirect(`/assessments?flash=${encodeURIComponent("Assessment deleted.")}`);
}

export async function saveMarks(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const { user, profile } = await requireUser();
  const assessmentId = String(formData.get("assessment_id") ?? "");
  if (!assessmentId) return { error: "Missing assessment." };

  const supabase = await createClient();
  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, max_marks, subject_id")
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

  const { error } = await supabase
    .from("marks")
    .upsert(entries, { onConflict: "student_id,assessment_id" });

  if (error) {
    if (error.code === "42501") {
      return { error: "You are not assigned to this subject/section, so the database rejected the write." };
    }
    return { error: error.message };
  }

  redirect(
    `/assessments/${assessmentId}?flash=${encodeURIComponent(
      `Saved ${entries.length} mark${entries.length === 1 ? "" : "s"} as ${profile?.full_name ?? "user"}.`,
    )}`,
  );
}
