import { BookOpen, Building2, GraduationCap, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getAllAssignments,
  getDepartments,
  getSections,
  getSubjects,
  getTeachers,
  getTerms,
} from "@/lib/data";
import { termLabel } from "@/lib/utils";
import { Badge, Card, EmptyState, Flash, PageHeader, StatCard } from "@/components/ui";
import { AssignClassForm, CreateTeacherForm, RemoveAssignmentButton } from "./teacher-form";

export const metadata = { title: "Teachers" };

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ flash?: string }>;
}) {
  const { flash } = await searchParams;
  await requireAdmin();
  const supabase = await createClient();

  const [teachers, assignments, departments, subjects, sections, terms] = await Promise.all([
    getTeachers(supabase),
    getAllAssignments(supabase),
    getDepartments(supabase),
    getSubjects(supabase),
    getSections(supabase),
    getTerms(supabase),
  ]);

  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const sectionById = new Map(sections.map((section) => [section.id, section]));
  const termById = new Map(terms.map((term) => [term.id, term]));
  const departmentById = new Map(departments.map((department) => [department.id, department]));

  const assignmentsByTeacher = new Map<string, typeof assignments>();
  for (const assignment of assignments) {
    const bucket = assignmentsByTeacher.get(assignment.teacher_profile_id);
    if (bucket) bucket.push(assignment);
    else assignmentsByTeacher.set(assignment.teacher_profile_id, [assignment]);
  }

  const coveredSections = new Set(assignments.map((assignment) => assignment.section_id));
  const coveredSubjects = new Set(assignments.map((assignment) => assignment.subject_id));

  return (
    <div>
      <PageHeader
        title="Teachers"
        description="Create teacher accounts and control exactly which classes they can grade and mark attendance for."
      />

      <Flash message={flash} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Teachers" value={teachers.length} hint={`${assignments.length} class assignments`} icon={Users} tone="indigo" />
        <StatCard label="Sections covered" value={coveredSections.size} hint={`of ${sections.length} sections`} icon={Building2} tone="emerald" />
        <StatCard label="Subjects covered" value={coveredSubjects.size} hint={`of ${subjects.length} subjects`} icon={BookOpen} tone="sky" />
        <StatCard label="Departments" value={departments.length} hint="Across the institution" icon={GraduationCap} tone="amber" />
      </div>

      <div className="mt-5">
        <CreateTeacherForm departments={departments} />
      </div>

      <div className="mt-5 space-y-4">
        {teachers.length === 0 ? (
          <Card>
            <EmptyState
              title="No teachers yet"
              description="Create a teacher account above, then assign the classes they teach."
            />
          </Card>
        ) : (
          teachers.map((teacher) => {
            const rows = assignmentsByTeacher.get(teacher.id) ?? [];
            const department = departmentById.get(teacher.department_id);
            return (
              <Card
                key={teacher.id}
                title={teacher.profiles?.full_name ?? "Teacher"}
                description={`${teacher.employee_id}${department ? ` · ${department.code}` : ""} · ${teacher.profiles?.email ?? ""}`}
                action={<Badge tone="slate">{rows.length} classes</Badge>}
              >
                {rows.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No classes assigned yet. Use the form below to grant grading access.
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {rows.map((assignment) => {
                      const subject = subjectById.get(assignment.subject_id);
                      const section = sectionById.get(assignment.section_id);
                      const term = termById.get(assignment.academic_term_id);
                      return (
                        <li
                          key={assignment.id}
                          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-1.5 text-xs text-slate-700"
                        >
                          <span className="font-medium">
                            {subject?.code ?? "—"} · Section {section?.name ?? "—"}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500">
                            {termLabel(term?.name ?? "—")}
                          </span>
                          <RemoveAssignmentButton id={assignment.id} />
                        </li>
                      );
                    })}
                  </ul>
                )}

                <AssignClassForm
                  teacherProfileId={teacher.id}
                  subjects={subjects}
                  sections={sections}
                  terms={terms}
                />
              </Card>
            );
          })
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Assignments are enforced in Postgres: RLS policies only allow a teacher to write marks and
        attendance for the subject, section, and term rows listed above.
      </p>
    </div>
  );
}
