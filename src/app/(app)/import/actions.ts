"use server";

import { requireStaff } from "@/lib/auth";
import { cell, columnIndex, parseCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";
import { enrollStudentsInCurrentTerm } from "@/lib/student-enrollment";

export type ImportStatus = "ready" | "update" | "error" | "skipped";

export interface ImportRowView {
  line: number;
  label: string;
  detail: string;
  status: ImportStatus;
  message: string;
}

export interface ImportCounts {
  ready: number;
  update: number;
  error: number;
  skipped: number;
}

export interface PreviewState {
  csv: string;
  rows: ImportRowView[];
  counts: ImportCounts;
  error?: string;
}

export interface CommitState {
  error?: string;
  success?: string;
}

const MAX_ROWS = 2000;
const CHUNK_SIZE = 200;

const REGISTER = ["register_number", "reg_number", "roll_number", "register_no", "regno"];
const NAME = ["name", "student_name", "full_name"];
const EMAIL = ["email", "email_id"];
const SECTION = ["section", "section_name", "class"];
const SECTION_ID = ["section_id"];
const DEPARTMENT = ["department", "department_code", "dept"];
const YEAR = ["current_year", "year", "year_of_study"];
const STATUS = ["status"];
const STUDENT_ID = ["student_id"];
const SUBJECT_CODE = ["subject_code", "subject", "code"];
const TERM = ["term", "term_name", "academic_term", "semester_name"];
const TERM_YEAR = ["year"];
const SEMESTER = ["semester"];
const ASSESSMENT = ["assessment", "assessment_type", "type", "exam"];
const ASSESSMENT_ID = ["assessment_id"];
const MARKS = ["marks_obtained", "marks", "score"];
const ABSENT = ["is_absent", "absent"];

type Supabase = Awaited<ReturnType<typeof createClient>>;

interface StudentRecord {
  register_number: string;
  name: string;
  email: string | null;
  section_id: string;
  current_year: number;
  status: "active" | "inactive";
}

interface StudentRow {
  view: ImportRowView;
  record?: StudentRecord;
}

interface MarkRecord {
  student_id: string;
  assessment_id: string;
  marks_obtained: number;
  is_absent: boolean;
}

interface MarkRow {
  view: ImportRowView;
  record?: MarkRecord;
}

interface StudentBuild {
  rows: StudentRow[];
  error?: string;
  sectionsById?: Map<string, { id: string; name: string; year: number; department_id: string }>;
}

interface MarkBuild {
  rows: MarkRow[];
  error?: string;
}

function hasAny(columns: Map<string, number>, aliases: string[]): boolean {
  return aliases.some((alias) => columns.has(alias));
}

function countsOf(rows: { view: ImportRowView }[]): ImportCounts {
  return rows.reduce<ImportCounts>(
    (counts, row) => {
      counts[row.view.status] += 1;
      return counts;
    },
    { ready: 0, update: 0, error: 0, skipped: 0 },
  );
}

function toView(rows: { view: ImportRowView }[]): ImportRowView[] {
  return rows.map((row) => row.view);
}

function view(
  line: number,
  label: string,
  detail: string,
  status: ImportStatus,
  message: string,
): ImportRowView {
  return { line, label, detail, status, message };
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function readCsv(formData: FormData): string {
  return String(formData.get("csv") ?? "");
}

/** The upload form posts a File; the commit form posts the same text back. */
async function readUpload(formData: FormData): Promise<string> {
  const file = formData.get("file");
  if (file instanceof File && file.size) return file.text();
  return readCsv(formData);
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normaliseAssessmentType(raw: string): "cat1" | "cat2" | "semester" | null {
  const value = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (value === "cat1" || value === "catone") return "cat1";
  if (value === "cat2" || value === "cattwo") return "cat2";
  if (value === "semester" || value === "sem" || value === "semesterexam") return "semester";
  return null;
}

function parseAbsent(raw: string): boolean | null {
  const value = raw.trim().toLowerCase();
  if (!value || ["false", "no", "n", "0", "present", "p"].includes(value)) return false;
  if (["true", "yes", "y", "1", "absent", "a"].includes(value)) return true;
  return null;
}

/** Validate student rows against the live catalogue without writing anything. */
async function buildStudents(supabase: Supabase, csv: string): Promise<StudentBuild> {
  const document = parseCsv(csv);
  if (!document.header.length) return { rows: [], error: "The file has no header row." };
  if (!document.rows.length) return { rows: [], error: "The file has no data rows." };
  if (document.rows.length > MAX_ROWS) {
    return { rows: [], error: `This file has more than ${MAX_ROWS} rows. Split it into smaller files.` };
  }

  const columns = columnIndex(document.header);
  if (
    !hasAny(columns, REGISTER) ||
    !hasAny(columns, NAME) ||
    (!hasAny(columns, SECTION) && !hasAny(columns, SECTION_ID)) ||
    !hasAny(columns, YEAR)
  ) {
    return {
      rows: [],
      error:
        "Students CSV needs register_number, name, section (or section_id) and current_year columns. Download the template to check the format.",
    };
  }

  const [{ data: sections }, { data: departments }, { data: existingStudents }] =
    await Promise.all([
      supabase.from("sections").select("id, name, year, department_id"),
      supabase.from("departments").select("id, code, name"),
      supabase.from("students").select("register_number"),
    ]);

  const sectionsById = new Map(
    (sections ?? []).map((section) => [
      section.id as string,
      {
        id: section.id as string,
        name: section.name as string,
        year: Number(section.year),
        department_id: section.department_id as string,
      },
    ]),
  );
  const departmentsById = new Map(
    (departments ?? []).map((department) => [department.id as string, department]),
  );
  const existingRegisters = new Set(
    (existingStudents ?? []).map((student) => String(student.register_number).toUpperCase()),
  );

  const rows: StudentRow[] = [];
  const seen = new Map<string, number>();

  for (const dataRow of document.rows) {
    const values = dataRow.values;
    const registerNumber = cell(values, columns, REGISTER).toUpperCase();
    const name = cell(values, columns, NAME);
    const label = registerNumber || name || `Row ${dataRow.line}`;
    const email = cell(values, columns, EMAIL).toLowerCase();
    const rawSectionId = cell(values, columns, SECTION_ID);
    const sectionName = cell(values, columns, SECTION);
    const department = cell(values, columns, DEPARTMENT);
    const rawYear = cell(values, columns, YEAR);
    const rawStatus = cell(values, columns, STATUS).toLowerCase() || "active";

    const addError = (message: string, detail = "") => {
      rows.push({ view: view(dataRow.line, label, detail, "error", message) });
    };

    if (!registerNumber || !/^[A-Z0-9-]{4,20}$/.test(registerNumber)) {
      addError("Register number must be 4–20 letters, digits or hyphens.");
      continue;
    }
    if (seen.has(registerNumber)) {
      addError(`Duplicate register number in this file (first seen on line ${seen.get(registerNumber)}).`);
      continue;
    }
    seen.set(registerNumber, dataRow.line);
    if (!name) {
      addError("Name is required.");
      continue;
    }
    if (email && !validEmail(email)) {
      addError("Enter a valid email address or leave it blank.");
      continue;
    }
    if (rawStatus !== "active" && rawStatus !== "inactive") {
      addError("Status must be active or inactive (blank means active).");
      continue;
    }

    // Resolve by id when supplied; otherwise by name, with department and year
    // as tie-breakers for colleges that reuse section letters across departments.
    let section = rawSectionId ? sectionsById.get(rawSectionId) : undefined;
    let sectionProblem = rawSectionId && !section ? "That section_id does not exist." : "";
    if (!rawSectionId) {
      let matches = (sections ?? []).filter(
        (candidate) => candidate.name.toLowerCase() === sectionName.toLowerCase(),
      );
      if (!matches.length) {
        sectionProblem = `Section "${sectionName}" does not exist. Ask an admin to create it first.`;
      } else {
        if (department && matches.length > 1) {
          matches = matches.filter((candidate) => {
            const info = departmentsById.get(candidate.department_id);
            return (
              info &&
              (String(info.code).toLowerCase() === department.toLowerCase() ||
                String(info.name).toLowerCase() === department.toLowerCase())
            );
          });
        }
        if (matches.length > 1 && rawYear) {
          const numericYear = Number(rawYear);
          if (Number.isInteger(numericYear)) {
            matches = matches.filter((candidate) => candidate.year === numericYear);
          }
        }
        if (matches.length === 1) section = matches[0];
        else if (!matches.length) sectionProblem = `No section matches "${sectionName}" with that department.`;
        else sectionProblem = `Section "${sectionName}" is ambiguous. Add a department column.`;
      }
    }
    if (sectionProblem || !section) {
      addError(sectionProblem || "Section could not be resolved.");
      continue;
    }

    const year = rawYear ? Number(rawYear) : Number(section.year);
    if (!Number.isInteger(year) || year < 1 || year > 6) {
      addError("Year of study must be a whole number between 1 and 6.", `Section ${section.name}`);
      continue;
    }

    const departmentInfo = departmentsById.get(section.department_id);
    const detail = `Section ${section.name}${departmentInfo ? ` · ${departmentInfo.code}` : ""} · Year ${year}`;
    const isUpdate = existingRegisters.has(registerNumber);

    rows.push({
      view: view(
        dataRow.line,
        label,
        detail,
        isUpdate ? "update" : "ready",
        isUpdate ? "Existing student — details will be updated." : "New student.",
      ),
      record: {
        register_number: registerNumber,
        name,
        email: email || null,
        section_id: section.id,
        current_year: year,
        status: rawStatus as "active" | "inactive",
      },
    });
  }

  return { rows, sectionsById };
}

/** Validate mark rows against students, subjects, terms and assessments. */
async function buildMarks(
  supabase: Supabase,
  csv: string,
  userId: string,
  role: string | undefined,
): Promise<MarkBuild> {
  const document = parseCsv(csv);
  if (!document.header.length) return { rows: [], error: "The file has no header row." };
  if (!document.rows.length) return { rows: [], error: "The file has no data rows." };
  if (document.rows.length > MAX_ROWS) {
    return { rows: [], error: `This file has more than ${MAX_ROWS} rows. Split it into smaller files.` };
  }

  const columns = columnIndex(document.header);
  if (
    (!hasAny(columns, REGISTER) && !hasAny(columns, STUDENT_ID)) ||
    !hasAny(columns, MARKS) ||
    (!hasAny(columns, ASSESSMENT_ID) &&
      (!hasAny(columns, SUBJECT_CODE) ||
        !hasAny(columns, ASSESSMENT) ||
        (!hasAny(columns, TERM) && !hasAny(columns, SEMESTER))))
  ) {
    return {
      rows: [],
      error:
        "Marks CSV needs register_number (or student_id), subject_code, term, assessment and marks_obtained columns. Download the template to check the format.",
    };
  }

  const [{ data: students }, { data: subjects }, { data: terms }, { data: assessments }] =
    await Promise.all([
      supabase.from("students").select("id, register_number, section_id"),
      supabase.from("subjects").select("id, code, name"),
      supabase.from("academic_terms").select("id, name, year, semester"),
      supabase.from("assessments").select("id, subject_id, academic_term_id, type, max_marks"),
    ]);

  const studentByRegister = new Map(
    (students ?? []).map((student) => [String(student.register_number).toUpperCase(), student]),
  );
  const studentById = new Map((students ?? []).map((student) => [student.id as string, student]));
  const subjectByCode = new Map(
    (subjects ?? []).map((subject) => [String(subject.code).toLowerCase(), subject]),
  );
  const termByName = new Map(
    (terms ?? []).map((term) => [String(term.name).toLowerCase(), term]),
  );
  const termByNumber = new Map(
    (terms ?? []).map((term) => [`${term.year}|${term.semester}`, term]),
  );
  const assessmentById = new Map((assessments ?? []).map((assessment) => [assessment.id as string, assessment]));
  const assessmentByKey = new Map(
    (assessments ?? []).map((assessment) => [
      `${assessment.subject_id}|${assessment.academic_term_id}|${assessment.type}`,
      assessment,
    ]),
  );

  // Teachers can only write marks for classes assigned to them. Mirror the
  // database's teacher_has_assignment(subject_id, section_id) check here so the
  // whole import is not rejected because of one unassigned row.
  const allowedPairs = new Set<string>();
  if (role === "teacher") {
    const { data: teacherProfile } = await supabase
      .from("teacher_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (teacherProfile) {
      const { data: assignments } = await supabase
        .from("teacher_assignments")
        .select("subject_id, section_id")
        .eq("teacher_profile_id", teacherProfile.id);
      for (const assignment of assignments ?? []) {
        allowedPairs.add(`${assignment.subject_id}|${assignment.section_id}`);
      }
    }
  }

  const { data: existingMarks } = await supabase
    .from("marks")
    .select("student_id, assessment_id, marks_obtained, is_absent");
  const previousMarks = new Map(
    (existingMarks ?? []).map((mark) => [
      `${mark.student_id}|${mark.assessment_id}`,
      { marks: Number(mark.marks_obtained), absent: Boolean(mark.is_absent) },
    ]),
  );

  const rows: MarkRow[] = [];
  const seen = new Map<string, number>();

  for (const dataRow of document.rows) {
    const values = dataRow.values;
    const registerNumber = cell(values, columns, REGISTER).toUpperCase();
    const rawStudentId = cell(values, columns, STUDENT_ID);
    const label = registerNumber || (rawStudentId ? rawStudentId.slice(0, 8) : `Row ${dataRow.line}`);
    const addError = (message: string, detail = "") => {
      rows.push({ view: view(dataRow.line, label, detail, "error", message) });
    };

    const student = registerNumber
      ? studentByRegister.get(registerNumber)
      : studentById.get(rawStudentId);
    if (!student) {
      addError("Student not found. Check the register number or add the student first.");
      continue;
    }

    const rawAssessmentId = cell(values, columns, ASSESSMENT_ID);
    let assessment = rawAssessmentId ? assessmentById.get(rawAssessmentId) : undefined;
    let assessmentProblem = rawAssessmentId && !assessment ? "That assessment_id does not exist." : "";
    let detail = "";

    if (!rawAssessmentId) {
      const subjectCode = cell(values, columns, SUBJECT_CODE).toLowerCase();
      const subject = subjectByCode.get(subjectCode);
      const rawType = cell(values, columns, ASSESSMENT);
      const type = normaliseAssessmentType(rawType);
      const typeLabel = type ? { cat1: "CAT 1", cat2: "CAT 2", semester: "Semester" }[type] : rawType;

      const termName = cell(values, columns, TERM).toLowerCase();
      const rawYear = cell(values, columns, TERM_YEAR);
      const rawSemester = cell(values, columns, SEMESTER);
      let term = termName ? termByName.get(termName) : undefined;
      if (!termName && rawYear && rawSemester) {
        term = termByNumber.get(`${Number(rawYear)}|${Number(rawSemester)}`);
      }

      if (!subject) assessmentProblem = `Subject code "${subjectCode}" does not exist.`;
      else if (!type) assessmentProblem = `Assessment "${rawType}" is invalid. Use CAT 1, CAT 2 or Semester.`;
      else if (!term) assessmentProblem = "Term not found. Use its exact name, or year + semester columns.";
      else {
        assessment = assessmentByKey.get(`${subject.id}|${term.id}|${type}`);
        if (!assessment) {
          assessmentProblem = `No ${typeLabel} assessment exists for ${subjectCode} in ${term.name}. Create it on the Assessments page first.`;
        } else {
          detail = `${subject.code} · ${term.name} · ${typeLabel}`;
        }
      }
    } else if (assessment) {
      const subject = (subjects ?? []).find((item) => item.id === assessment!.subject_id);
      const term = (terms ?? []).find((item) => item.id === assessment!.academic_term_id);
      detail = `${subject?.code ?? "—"} · ${term?.name ?? "—"} · ${String(assessment.type).toUpperCase()}`;
    }

    if (assessmentProblem || !assessment) {
      addError(assessmentProblem || "Assessment could not be resolved.");
      continue;
    }

    const pairKey = `${student.id}|${assessment.id}`;
    if (seen.has(pairKey)) {
      addError(`Duplicate mark in this file (first seen on line ${seen.get(pairKey)}).`, detail);
      continue;
    }
    seen.set(pairKey, dataRow.line);

    if (role === "teacher" && !allowedPairs.has(`${assessment.subject_id}|${student.section_id}`)) {
      rows.push({
        view: view(
          dataRow.line,
          label,
          detail,
          "skipped",
          "You are not assigned to this subject/section, so the database would reject this mark.",
        ),
      });
      continue;
    }

    const absent = parseAbsent(cell(values, columns, ABSENT));
    if (absent === null) {
      addError("is_absent must be true/false, yes/no or 1/0.", detail);
      continue;
    }
    const rawMarks = cell(values, columns, MARKS);
    const marks = absent ? 0 : Number(rawMarks);
    const maxMarks = Number(assessment.max_marks);
    if (!absent && (!rawMarks || !Number.isFinite(marks) || marks < 0 || marks > maxMarks)) {
      addError(`Marks must be between 0 and ${maxMarks}, or mark the student absent.`, detail);
      continue;
    }

    const before = previousMarks.get(pairKey);
    const changed =
      before && (before.marks !== marks || before.absent !== absent);
    rows.push({
      view: view(
        dataRow.line,
        label,
        `${detail} · ${absent ? "Absent" : `${marks}/${maxMarks}`}`,
        changed ? "update" : "ready",
        changed ? "Existing mark — correction will be audited." : "New mark.",
      ),
      record: { student_id: student.id, assessment_id: assessment.id, marks_obtained: marks, is_absent: absent },
    });
  }

  return { rows };
}

/** Preview a students CSV. Nothing is written. */
export async function previewStudents(_prev: PreviewState | undefined, formData: FormData): Promise<PreviewState> {
  await requireStaff();
  const csv = await readUpload(formData);
  const supabase = await createClient();
  const built = await buildStudents(supabase, csv);
  if (built.error) return { csv, rows: [], counts: countsOf([]), error: built.error };
  return { csv, rows: toView(built.rows), counts: countsOf(built.rows) };
}

/** Preview a marks CSV. Nothing is written. */
export async function previewMarks(_prev: PreviewState | undefined, formData: FormData): Promise<PreviewState> {
  const { user, profile } = await requireStaff();
  const csv = await readUpload(formData);
  const supabase = await createClient();
  const built = await buildMarks(supabase, csv, user.id, profile?.role);
  if (built.error) return { csv, rows: [], counts: countsOf([]), error: built.error };
  return { csv, rows: toView(built.rows), counts: countsOf(built.rows) };
}

/** Re-validates the CSV, then inserts/updates students and enrols them. */
export async function commitStudents(_prev: CommitState | undefined, formData: FormData): Promise<CommitState> {
  await requireStaff();
  const csv = readCsv(formData);
  if (!csv) return { error: "Nothing to import. Upload a CSV first." };

  const supabase = await createClient();
  const built = await buildStudents(supabase, csv);
  if (built.error) return { error: built.error };

  const records = built.rows.flatMap((row) => (row.record ? [row.record] : []));
  if (!records.length) {
    return { error: "No valid rows to import. Fix the errors shown in the preview." };
  }

  let imported: { id: string; register_number: string; section_id: string }[] = [];
  for (const batch of chunks(records, CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from("students")
      .upsert(batch, { onConflict: "register_number" })
      .select("id, register_number, section_id");
    if (error) return { error: error.message };
    imported = imported.concat(data ?? []);
  }

  const departmentBySection = built.sectionsById ?? new Map();
  const enrolments = await enrollStudentsInCurrentTerm(
    supabase,
    imported.map((student) => ({
      id: student.id,
      department_id: departmentBySection.get(student.section_id)?.department_id ?? "",
    })).filter((student) => student.department_id),
  );
  if (enrolments.error) {
    return { error: `Students saved, but enrolment failed: ${enrolments.error}` };
  }

  const created = built.rows.filter((row) => row.view.status === "ready").length;
  const updated = built.rows.filter((row) => row.view.status === "update").length;
  return {
    success: `Imported ${created} new student${created === 1 ? "" : "s"}, updated ${updated}. Added ${enrolments.enrolled} current-term enrolment${enrolments.enrolled === 1 ? "" : "s"}.`,
  };
}

/** Re-validates the CSV, then upserts marks and logs any corrections. */
export async function commitMarks(_prev: CommitState | undefined, formData: FormData): Promise<CommitState> {
  const { user, profile } = await requireStaff();
  const csv = readCsv(formData);
  if (!csv) return { error: "Nothing to import. Upload a CSV first." };

  const supabase = await createClient();
  const built = await buildMarks(supabase, csv, user.id, profile?.role);
  if (built.error) return { error: built.error };

  const records = built.rows.flatMap((row) => (row.record ? [row.record] : []));
  if (!records.length) {
    return { error: "No valid rows to import. Fix the errors shown in the preview." };
  }

  const { data: existingMarks } = await supabase
    .from("marks")
    .select("student_id, assessment_id, marks_obtained, is_absent")
    .in("assessment_id", [...new Set(records.map((record) => record.assessment_id))])
    .in("student_id", [...new Set(records.map((record) => record.student_id))]);
  const previous = new Map(
    (existingMarks ?? []).map((mark) => [
      `${mark.student_id}|${mark.assessment_id}`,
      { marks: Number(mark.marks_obtained), absent: Boolean(mark.is_absent) },
    ]),
  );

  const payload = records.map((record) => ({
    ...record,
    entered_by: user.id,
  }));
  for (const batch of chunks(payload, CHUNK_SIZE)) {
    const { error } = await supabase
      .from("marks")
      .upsert(batch, { onConflict: "student_id,assessment_id" });
    if (error) {
      if (error.code === "42501") {
        return { error: "The database rejected a mark because you are not assigned to that subject/section." };
      }
      return { error: error.message };
    }
  }

  const corrections = records.flatMap((record) => {
    const before = previous.get(`${record.student_id}|${record.assessment_id}`);
    if (!before || (before.marks === record.marks_obtained && before.absent === record.is_absent)) {
      return [];
    }
    return [{
      assessment_id: record.assessment_id,
      student_id: record.student_id,
      actor_id: user.id,
      actor_role: profile?.role ?? "teacher",
      old_marks: before.marks,
      new_marks: record.marks_obtained,
      old_is_absent: before.absent,
      new_is_absent: record.is_absent,
    }];
  });

  for (const batch of chunks(corrections, CHUNK_SIZE)) {
    const { error } = await supabase.from("mark_audit").insert(batch);
    // Logging is best-effort: never undo a valid mark save because audit failed.
    if (error) console.error("[audit] failed to log imported mark corrections:", error.message);
  }

  const added = records.filter(
    (record) => !previous.has(`${record.student_id}|${record.assessment_id}`),
  ).length;
  const corrected = records.length - added;
  const skipped = built.rows.filter((row) => row.view.status === "skipped").length;
  return {
    success: `Imported ${added} mark${added === 1 ? "" : "s"}, corrected ${corrected}${skipped ? `, skipped ${skipped} unassigned` : ""}.`,
  };
}
