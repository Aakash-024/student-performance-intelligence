import { getCurrentUser } from "@/lib/auth";

const templates = {
  students: [
    "register_number,name,email,section,current_year,status",
    "2024CSEZ999,Aarav Sharma,aarav@college.edu,A,2,active",
    "2024CSEZ998,Priya Nair,priya@college.edu,B,2,active",
  ].join("\n"),
  marks: [
    "register_number,subject_code,term,assessment,marks_obtained,is_absent",
    "2024CSEA001,CS201,Semester 3,CAT 1,22,false",
    "2024CSEA001,CS201,Semester 3,CAT 2,19,false",
    "2024CSEA001,CS201,Semester 3,Semester,44,false",
  ].join("\n"),
};

export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current) return new Response("Unauthorized", { status: 401 });

  const kind = new URL(request.url).searchParams.get("type") === "marks" ? "marks" : "students";
  return new Response(`${templates[kind]}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="spip-${kind}-template.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
