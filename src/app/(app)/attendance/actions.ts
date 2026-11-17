"use server";

import { requireStaff } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  success?: string;
  /** Set by createSession so the client can navigate to the new session. */
  sessionId?: string;
}

export async function createSession(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const { user, profile } = await requireStaff();

  const subjectId = String(formData.get("subject_id") ?? "");
  const sectionId = String(formData.get("section_id") ?? "");
  const termId = String(formData.get("academic_term_id") ?? "");
  const sessionDate = String(formData.get("session_date") ?? "").trim();
  const period = Number(formData.get("period_number") ?? 0);

  if (!subjectId || !sectionId || !termId) return { error: "Choose a subject, section, and term." };
  if (!sessionDate) return { error: "Choose a session date." };
  if (!Number.isInteger(period) || period < 1 || period > 10) {
    return { error: "Period must be a whole number between 1 and 10." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("attendance_sessions")
    .insert({
      subject_id: subjectId,
      section_id: sectionId,
      academic_term_id: termId,
      session_date: sessionDate,
      period_number: period,
      taken_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "A session already exists for that subject, section, date, and period." };
    }
    if (error.code === "42501") {
      return { error: "You are not assigned to this subject/section, so the database rejected the write." };
    }
    return { error: error.message };
  }

  const [subjectInfo, sectionInfo, termInfo] = await Promise.all([
    supabase.from("subjects").select("code").eq("id", subjectId).maybeSingle(),
    supabase.from("sections").select("name").eq("id", sectionId).maybeSingle(),
    supabase.from("academic_terms").select("name").eq("id", termId).maybeSingle(),
  ]);
  const label = `${subjectInfo.data?.code ?? subjectId} · Section ${sectionInfo.data?.name ?? "—"} · ${termInfo.data?.name ?? ""}`.trim();
  await logActivity(supabase, {
    actorId: user.id,
    actorRole: profile?.role === "admin" ? "admin" : "teacher",
    actorName: profile?.full_name || profile?.email || user.id,
    action: "attendance.session_create",
    entityType: "attendance_session",
    entityId: data.id,
    entityLabel: label,
    summary: `Created attendance session — ${label}, ${sessionDate}, period ${period}.`,
    details: { session_date: sessionDate, period_number: period },
  });

  return { success: "Session created.", sessionId: data.id };
}

export async function saveAttendance(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const { user, profile } = await requireStaff();

  const sessionId = String(formData.get("session_id") ?? "");
  if (!sessionId) return { error: "Missing session." };

  const supabase = await createClient();

  const { count } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  if (!count) return { error: "No active students found." };

  const present = new Set<string>();
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("present_") && value === "on") present.add(key.slice(8));
  }

  const { data: session } = await supabase
    .from("attendance_sessions")
    .select("section_id, session_date")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return { error: "Session not found." };

  const { data: students } = await supabase
    .from("students")
    .select("id")
    .eq("section_id", session.section_id)
    .eq("status", "active");

  const rows = (students ?? []).map((student) => ({
    attendance_session_id: sessionId,
    student_id: student.id as string,
    is_present: present.has(student.id as string),
  }));

  if (!rows.length) return { error: "No students are enrolled in this section." };

  const { error } = await supabase
    .from("attendance_records")
    .upsert(rows, { onConflict: "attendance_session_id,student_id" });

  if (error) {
    if (error.code === "42501") {
      return { error: "You are not assigned to this class, so the database rejected the write." };
    }
    return { error: error.message };
  }

  const sessionDate = new Date(session.session_date).toISOString().slice(0, 10);
  await logActivity(supabase, {
    actorId: user.id,
    actorRole: profile?.role === "admin" ? "admin" : "teacher",
    actorName: profile?.full_name || profile?.email || user.id,
    action: "attendance.save",
    entityType: "attendance",
    entityId: sessionId,
    entityLabel: `Session ${sessionId.slice(0, 8)} · ${sessionDate}`,
    summary: `Saved attendance for ${rows.length} students — ${present.size} present, ${rows.length - present.size} absent.`,
    details: { present: present.size, absent: rows.length - present.size },
  });

  // NOTE: small state object + client refresh (see assessments/actions.ts note).
  return {
    success: `Saved attendance for ${rows.length} students · ${present.size} present, ${rows.length - present.size} absent.`,
  };
}
