"use server";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  success?: string;
}

/**
 * Reconciles the subject set for every student in one section for one term.
 * Checked pairs are added; unchecked pairs that were already enrolled are
 * removed. Nothing outside the selected section/term is touched.
 */
export async function saveEnrollments(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();

  const termId = String(formData.get("term_id") ?? "").trim();
  const sectionId = String(formData.get("section_id") ?? "").trim();
  if (!termId || !sectionId) return { error: "Choose a term and a section." };

  const desired = new Set(
    formData
      .getAll("enroll")
      .map(String)
      .filter((value) => value.includes("|")),
  );

  const supabase = await createClient();

  const { data: students } = await supabase
    .from("students")
    .select("id")
    .eq("section_id", sectionId)
    .eq("status", "active");
  const studentIds = (students ?? []).map((student) => student.id as string);
  if (!studentIds.length) return { error: "This section has no active students." };

  const { data: current } = await supabase
    .from("enrollments")
    .select("id, student_id, subject_id")
    .eq("academic_term_id", termId)
    .in("student_id", studentIds);

  const currentRows = current ?? [];
  const toDelete = currentRows
    .filter((row) => !desired.has(`${row.student_id}|${row.subject_id}`))
    .map((row) => row.id as string);
  const existing = new Set(
    currentRows.map((row) => `${row.student_id}|${row.subject_id}`),
  );
  const toInsert = [...desired]
    .filter((pair) => !existing.has(pair) && studentIds.includes(pair.split("|")[0]))
    .map((pair) => {
      const [student_id, subject_id] = pair.split("|");
      return { student_id, subject_id, academic_term_id: termId };
    });

  if (!toDelete.length && !toInsert.length) return { success: "No changes needed." };

  if (toDelete.length) {
    const { error } = await supabase.from("enrollments").delete().in("id", toDelete);
    if (error) return { error: error.message };
  }
  if (toInsert.length) {
    const { error } = await supabase
      .from("enrollments")
      .upsert(toInsert, { onConflict: "student_id,subject_id,academic_term_id" });
    if (error) return { error: error.message };
  }

  return {
    success: `Enrolments updated — ${toInsert.length} added, ${toDelete.length} removed.`,
  };
}
