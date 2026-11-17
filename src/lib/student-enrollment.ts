import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const CHUNK_SIZE = 200;

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

/**
 * Enrol students in every subject of their department for the current term.
 * Already-enrolled pairs are skipped, so calling this repeatedly (for example
 * during an import that includes existing students) is safe.
 */
export async function enrollStudentsInCurrentTerm(
  supabase: Supabase,
  students: { id: string; department_id: string }[],
): Promise<{ enrolled: number; error?: string }> {
  if (!students.length) return { enrolled: 0 };

  const { data: term } = await supabase
    .from("academic_terms")
    .select("id")
    .eq("is_current", true)
    .maybeSingle();
  if (!term) return { enrolled: 0 };

  const departmentIds = [...new Set(students.map((student) => student.department_id))];
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, department_id")
    .in("department_id", departmentIds);
  if (!subjects?.length) return { enrolled: 0 };

  const byDepartment = new Map<string, string[]>();
  for (const subject of subjects) {
    const list = byDepartment.get(subject.department_id) ?? [];
    list.push(subject.id as string);
    byDepartment.set(subject.department_id, list);
  }

  const studentIds = students.map((student) => student.id);
  const { data: existing } = await supabase
    .from("enrollments")
    .select("student_id, subject_id")
    .eq("academic_term_id", term.id)
    .in("student_id", studentIds);
  const existingPairs = new Set(
    (existing ?? []).map((row) => `${row.student_id}|${row.subject_id}`),
  );

  const rows: { student_id: string; subject_id: string; academic_term_id: string }[] = [];
  for (const student of students) {
    for (const subjectId of byDepartment.get(student.department_id) ?? []) {
      const pair = `${student.id}|${subjectId}`;
      if (existingPairs.has(pair)) continue;
      rows.push({ student_id: student.id, subject_id: subjectId, academic_term_id: term.id });
    }
  }

  let enrolled = 0;
  for (const batch of chunks(rows, CHUNK_SIZE)) {
    const { error } = await supabase.from("enrollments").insert(batch);
    if (error) return { enrolled, error: error.message };
    enrolled += batch.length;
  }
  return { enrolled };
}
