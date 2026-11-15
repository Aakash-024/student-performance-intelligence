export type Role = "admin" | "teacher";

export type Indicator =
  | "at_risk"
  | "declining"
  | "improving"
  | "high_performer"
  | "on_track";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface StudentOverview {
  student_id: string;
  register_number: string;
  name: string;
  email: string | null;
  section_id: string;
  section_name: string;
  year: number;
  avg_percentage: number;
  attendance_percentage: number;
  previous_percentage: number | null;
  subjects_passed: number;
  subjects_count: number;
  change: number;
  indicator: Indicator;
}

export interface SubjectTermPerformance {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  academic_term_id: string;
  avg_percentage: number;
  pass_rate: number;
  marks_count: number;
}

export interface SectionTermPerformance {
  section_id: string;
  section_name: string;
  academic_term_id: string;
  avg_percentage: number;
  attendance_percentage: number;
  student_count: number;
}

export interface StudentSubjectPerformance {
  student_id: string;
  subject_id: string;
  academic_term_id: string;
  percentage: number;
  assessments_taken: number;
}

export interface AcademicTerm {
  id: string;
  name: string;
  year: number;
  semester: number;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface Section {
  id: string;
  department_id: string;
  name: string;
  year: number;
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  department_id: string;
  credits: number;
  type: "theory" | "lab" | "elective";
}

export interface Assessment {
  id: string;
  subject_id: string;
  academic_term_id: string;
  type: "cat1" | "cat2" | "internal" | "semester";
  max_marks: number;
  weightage_percent: number;
  date: string | null;
  subjects?: Pick<Subject, "code" | "name"> | null;
  academic_terms?: Pick<AcademicTerm, "name"> | null;
}

export interface AssessmentSummary {
  assessment_id: string;
  subject_id: string;
  academic_term_id: string;
  marks_count: number;
  absent_count: number;
  avg_percentage: number | null;
}

export interface TeacherAssignment {
  id: string;
  teacher_profile_id: string;
  subject_id: string;
  section_id: string;
  academic_term_id: string;
}

export interface TeacherProfile {
  id: string;
  user_id: string;
  department_id: string;
  employee_id: string;
  profiles?: Pick<Profile, "full_name" | "email" | "role"> | null;
}
