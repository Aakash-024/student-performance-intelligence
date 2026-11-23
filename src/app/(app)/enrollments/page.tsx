import { BookOpen, ClipboardCheck, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveStudents, getSections, getSubjects, getTerms } from "@/lib/data";
import { termLabel } from "@/lib/utils";
import { Card, PageHeader, StatCard } from "@/components/ui";
import { EnrollmentMatrix } from "./enrollment-matrix";

export const metadata = { title: "Enrolments" };

export default async function EnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string; section?: string }>;
}) {
  const { profile } = await requireUser();
  const canEdit = profile?.role === "admin" || profile?.role === "teacher";
  const params = await searchParams;
  const supabase = await createClient();

  const [terms, sections, subjects, students] = await Promise.all([
    getTerms(supabase),
    getSections(supabase),
    getSubjects(supabase),
    getActiveStudents(supabase),
  ]);

  const currentTerm = terms.find((term) => term.is_current) ?? terms[terms.length - 1];
  const termId =
    params.term && terms.some((term) => term.id === params.term)
      ? params.term
      : (currentTerm?.id ?? "");
  const sectionId =
    params.section && sections.some((section) => section.id === params.section)
      ? params.section
      : (sections[0]?.id ?? "");

  const sectionStudents = students.filter((student) => student.section_id === sectionId);
  const studentIds = sectionStudents.map((student) => student.id);

  const { data: enrollments } = studentIds.length
    ? await supabase
        .from("enrollments")
        .select("student_id, subject_id")
        .eq("academic_term_id", termId)
        .in("student_id", studentIds)
    : { data: [] };
  const enrolled = (enrollments ?? []).map((row) => `${row.student_id}|${row.subject_id}`);

  const selectedTerm = terms.find((term) => term.id === termId);
  const selectedSection = sections.find((section) => section.id === sectionId);
  const coverage = sectionStudents.length && subjects.length
    ? Math.round((enrolled.length / (sectionStudents.length * subjects.length)) * 100)
    : 0;

  return (
    <div>
      <PageHeader
        title="Enrolments"
        description="Choose which subjects each section takes in a given term. Teachers and administrators can change this at any time."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students in section" value={sectionStudents.length} hint={selectedSection?.name ?? "No section"} icon={Users} tone="indigo" />
        <StatCard label="Subjects available" value={subjects.length} hint="Catalogue size" icon={BookOpen} tone="sky" />
        <StatCard label="Enrolments" value={enrolled.length} hint={`${coverage}% of the grid`} icon={ClipboardCheck} tone="emerald" />
        <StatCard label="Term" value={selectedTerm ? `Sem ${selectedTerm.semester}` : "—"} hint={selectedTerm ? String(selectedTerm.year) : "No term"} icon={ClipboardCheck} tone="amber" />
      </div>

      <Card title="Select scope" description="Pick a term and a section, then tick the subjects they take." className="mt-5">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-brand-text">Term</span>
            <select
              name="term"
              defaultValue={termId}
              className="w-64 rounded-xl border border-brand-border bg-brand-navy px-3 py-2 text-sm outline-none focus:border-brand-blue"
            >
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {termLabel(term.name)} · Sem {term.semester} ({term.year})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-brand-text">Section</span>
            <select
              name="section"
              defaultValue={sectionId}
              className="w-56 rounded-xl border border-brand-border bg-brand-navy px-3 py-2 text-sm outline-none focus:border-brand-blue"
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            View grid
          </button>
        </form>
      </Card>

      {!terms.length || !sections.length || !subjects.length ? (
        <Card title="Set up first" className="mt-5">
          <p className="text-sm text-brand-muted">
            Create a term on the Terms page, add subjects on the Subjects page, then return here to
            enrol each section in the right subjects.
          </p>
        </Card>
      ) : (
        <EnrollmentMatrix
          key={`${termId}-${sectionId}`}
          termId={termId}
          sectionId={sectionId}
          students={sectionStudents.map((student) => ({
            id: student.id,
            name: student.name,
            register_number: student.register_number,
          }))}
          subjects={subjects.map((subject) => ({
            id: subject.id,
            code: subject.code,
            name: subject.name,
          }))}
          enrolled={enrolled}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}
