import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AcademicTerm,
  Assessment,
  AssessmentSummary,
  Department,
  Section,
  SectionTermPerformance,
  StudentOverview,
  StudentSubjectPerformance,
  Subject,
  SubjectTermPerformance,
  TeacherAssignment,
} from "./types";

type Client = SupabaseClient;

export async function getTerms(supabase: Client): Promise<AcademicTerm[]> {
  const { data } = await supabase
    .from("academic_terms")
    .select("*")
    .order("year", { ascending: true })
    .order("semester", { ascending: true });
  return (data ?? []) as AcademicTerm[];
}

export async function getSections(supabase: Client): Promise<Section[]> {
  const { data } = await supabase
    .from("sections")
    .select("id, department_id, name, year")
    .order("name", { ascending: true });
  return (data ?? []) as Section[];
}

export async function getDepartments(supabase: Client): Promise<Department[]> {
  const { data } = await supabase
    .from("departments")
    .select("id, name, code")
    .order("name", { ascending: true });
  return (data ?? []) as Department[];
}

export async function getSubjects(supabase: Client): Promise<Subject[]> {
  const { data } = await supabase.from("subjects").select("*").order("code", { ascending: true });
  return (data ?? []) as Subject[];
}

export async function getStudentOverview(
  supabase: Client,
  options?: { sectionId?: string; indicator?: string; search?: string },
): Promise<StudentOverview[]> {
  let query = supabase.from("v_student_overview").select("*").order("avg_percentage", {
    ascending: false,
  });

  if (options?.sectionId) query = query.eq("section_id", options.sectionId);
  if (options?.indicator) query = query.eq("indicator", options.indicator);
  if (options?.search) {
    const term = options.search.replace(/[%,()]/g, "").trim();
    if (term) query = query.or(`name.ilike.%${term}%,register_number.ilike.%${term}%`);
  }

  const { data } = await query;
  return (data ?? []) as StudentOverview[];
}

export async function getSubjectPerformance(
  supabase: Client,
  termId?: string,
): Promise<SubjectTermPerformance[]> {
  let query = supabase.from("v_subject_term_performance").select("*");
  if (termId) query = query.eq("academic_term_id", termId);
  const { data } = await query;
  return (data ?? []) as SubjectTermPerformance[];
}

export async function getSectionPerformance(
  supabase: Client,
  termId?: string,
): Promise<SectionTermPerformance[]> {
  let query = supabase.from("v_section_term_performance").select("*");
  if (termId) query = query.eq("academic_term_id", termId);
  const { data } = await query;
  return (data ?? []) as SectionTermPerformance[];
}

export async function getAssessments(supabase: Client): Promise<Assessment[]> {
  const { data } = await supabase
    .from("assessments")
    .select("*, subjects(code, name), academic_terms(name)")
    .order("date", { ascending: false });
  return (data ?? []) as Assessment[];
}

export async function getAssessmentSummaries(supabase: Client): Promise<AssessmentSummary[]> {
  const { data } = await supabase.from("v_assessment_summary").select("*");
  return (data ?? []) as AssessmentSummary[];
}

export interface RecentActivityRow {
  id: string;
  created_at: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_label: string;
  summary: string;
}

/**
 * Newest activity-log entries for dashboard "recent updates" surfaces.
 * The activity_log table is append-only (migration 013) and readable by any
 * signed-in staff member; viewers also have read access to keep the dashboard
 * working in demo mode.
 */
export async function getRecentActivity(
  supabase: Client,
  limit = 8,
): Promise<RecentActivityRow[]> {
  const { data } = await supabase
    .from("activity_log")
    .select(
      "id, created_at, actor_name, action, entity_type, entity_label, summary",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as RecentActivityRow[];
}

export async function getMarkAudit(supabase: Client, assessmentId: string) {
  const { data } = await supabase
    .from("mark_audit")
    .select("id, created_at, student_id, actor_id, actor_role, old_marks, new_marks, old_is_absent, new_is_absent")
    .eq("assessment_id", assessmentId)
    .order("created_at", { ascending: false })
    .limit(12);
  return (data ?? []) as {
    id: string;
    created_at: string;
    student_id: string;
    actor_id: string;
    actor_role: string;
    old_marks: number | null;
    new_marks: number;
    old_is_absent: boolean;
    new_is_absent: boolean;
  }[];
}

export async function getActiveStudents(
  supabase: Client,
): Promise<{ id: string; name: string; register_number: string; section_id: string }[]> {
  const { data } = await supabase
    .from("students")
    .select("id, name, register_number, section_id")
    .eq("status", "active")
    .order("register_number", { ascending: true });
  return (data ?? []) as {
    id: string;
    name: string;
    register_number: string;
    section_id: string;
  }[];
}

export async function getSessions(supabase: Client): Promise<
  {
    id: string;
    subject_id: string;
    section_id: string;
    academic_term_id: string;
    session_date: string;
    period_number: number;
    student_count: number;
    present_count: number;
  }[]
> {
  const { data } = await supabase
    .from("v_session_attendance_summary")
    .select(
      "id:session_id, subject_id, section_id, academic_term_id, session_date, period_number, student_count, present_count",
    )
    .order("session_date", { ascending: false });
  return (data ?? []) as {
    id: string;
    subject_id: string;
    section_id: string;
    academic_term_id: string;
    session_date: string;
    period_number: number;
    student_count: number;
    present_count: number;
  }[];
}

export async function getTeacherContext(supabase: Client, userId: string) {
  const { data: teacher } = await supabase
    .from("teacher_profiles")
    .select("id, department_id, employee_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!teacher) {
    return { teacherProfileId: null, departmentId: null, assignments: [] as TeacherAssignment[] };
  }

  const { data: assignments } = await supabase
    .from("teacher_assignments")
    .select("*")
    .eq("teacher_profile_id", teacher.id);

  return {
    teacherProfileId: teacher.id as string,
    departmentId: teacher.department_id as string,
    assignments: (assignments ?? []) as TeacherAssignment[],
  };
}

export async function getStudentDetail(supabase: Client, studentId: string) {
  const { data: student } = await supabase
    .from("students")
    .select("*, sections(name, year)")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) return null;

  const [{ data: overview }, { data: subjectRows }, { data: attendanceRows }, { data: marks }] =
    await Promise.all([
      supabase.from("v_student_overview").select("*").eq("student_id", studentId).maybeSingle(),
      supabase
        .from("v_student_subject_performance")
        .select("*")
        .eq("student_id", studentId),
      supabase
        .from("v_student_term_attendance")
        .select("*")
        .eq("student_id", studentId),
      supabase
        .from("marks")
        .select(
          "marks_obtained, is_absent, assessments(type, max_marks, date, subject_id, academic_terms(name))",
        )
        .eq("student_id", studentId),
    ]);

  return {
    student: student as {
      id: string;
      register_number: string;
      name: string;
      email: string | null;
      status: string;
      current_year: number;
      section_id: string;
      sections: { name: string; year: number } | null;
    },
    overview: (overview ?? null) as StudentOverview | null,
    subjectPerformance: (subjectRows ?? []) as StudentSubjectPerformance[],
    attendance: (attendanceRows ?? []) as {
      academic_term_id: string;
      attendance_percentage: number;
      sessions_count: number;
    }[],
    marks: (marks ?? []) as unknown as {
      marks_obtained: number;
      is_absent: boolean;
      assessments: {
        type: string;
        max_marks: number;
        date: string | null;
        subject_id: string;
        academic_terms: { name: string } | null;
      } | null;
    }[],
  };
}

export async function getTeachers(supabase: Client) {
  const { data } = await supabase
    .from("teacher_profiles")
    .select("id, user_id, department_id, employee_id, profiles(full_name, email)")
    .order("employee_id", { ascending: true });
  return (data ?? []) as unknown as {
    id: string;
    user_id: string;
    department_id: string;
    employee_id: string;
    profiles: { full_name: string; email: string } | null;
  }[];
}

export async function getAllAssignments(supabase: Client): Promise<TeacherAssignment[]> {
  const { data } = await supabase
    .from("teacher_assignments")
    .select("*")
    .order("created_at", { ascending: true });
  return (data ?? []) as TeacherAssignment[];
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function groupBy<T>(rows: T[], key: (row: T) => string) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const bucket = map.get(k);
    if (bucket) bucket.push(row);
    else map.set(k, [row]);
  }
  return map;
}
