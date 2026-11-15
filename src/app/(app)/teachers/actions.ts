"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface FormState {
  error?: string;
  success?: string;
}

export async function createTeacher(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const employeeId = String(formData.get("employee_id") ?? "").trim().toUpperCase();
  const departmentId = String(formData.get("department_id") ?? "").trim();

  if (!email || !password || !fullName || !employeeId || !departmentId) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (!/^EMP-[A-Z0-9-]{2,20}$/.test(employeeId)) {
    return { error: "Employee ID must look like EMP-CSE-002." };
  }

  const admin = createAdminClient();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "teacher" },
  });

  if (authError || !created.user) {
    return { error: authError?.message ?? "Could not create the auth user." };
  }

  const supabase = await createClient();
  const { error: profileError } = await supabase.from("teacher_profiles").insert({
    user_id: created.user.id,
    department_id: departmentId,
    employee_id: employeeId,
  });

  if (profileError) {
    // Roll back the auth user so we do not leave a teacher without a profile.
    await admin.auth.admin.deleteUser(created.user.id);
    if (profileError.code === "23505") {
      return { error: `Employee ID ${employeeId} is already in use.` };
    }
    return { error: profileError.message };
  }

  redirect(
    `/teachers?flash=${encodeURIComponent(`${fullName} (${email}) can now sign in as a teacher.`)}`,
  );
}

export async function addAssignment(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const teacherProfileId = String(formData.get("teacher_profile_id") ?? "");
  const subjectId = String(formData.get("subject_id") ?? "");
  const sectionId = String(formData.get("section_id") ?? "");
  const termId = String(formData.get("academic_term_id") ?? "");

  if (!teacherProfileId || !subjectId || !sectionId || !termId) {
    return { error: "Choose a subject, section, and term." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("teacher_assignments").insert({
    teacher_profile_id: teacherProfileId,
    subject_id: subjectId,
    section_id: sectionId,
    academic_term_id: termId,
  });

  if (error) {
    if (error.code === "23505") return { error: "That class is already assigned to this teacher." };
    return { error: error.message };
  }

  redirect(`/teachers?flash=${encodeURIComponent("Class assigned.")}`);
}

export async function removeAssignment(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("teacher_assignments").delete().eq("id", id);
  redirect(`/teachers?flash=${encodeURIComponent("Assignment removed.")}`);
}
