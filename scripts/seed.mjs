/**
 * ACADNEX deterministic reseed script.
 *
 * Reads the synthetic CSVs in data/generated and writes them to Supabase over
 * the PostgREST API using the server-only secret key. It wipes the academic
 * tables first so the deterministic UUIDs from data/generate_data.py are the
 * single source of truth.
 *
 * Usage: npm run seed
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const text = readFileSync(join(root, ".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv();

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;
if (!BASE || !KEY) throw new Error("Missing Supabase env in .env.local");

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

function parseCsv(file) {
  const text = readFileSync(join(root, "data", "generated", file), "utf8").trim();
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((cols) => Object.fromEntries(head.map((h, i) => [h, cols[i]])));
}

const bools = (v) => String(v).toLowerCase() === "true";

const TABLES = [
  { name: "departments", file: "departments.csv", map: (r) => r },
  { name: "sections", file: "sections.csv", map: (r) => ({ ...r, year: Number(r.year) }) },
  { name: "subjects", file: "subjects.csv", map: (r) => ({ ...r, credits: Number(r.credits) }) },
  {
    name: "academic_terms",
    file: "academic_terms.csv",
    map: (r) => ({ ...r, year: Number(r.year), semester: Number(r.semester), is_current: bools(r.is_current) }),
  },
  { name: "students", file: "students.csv", map: (r) => ({ ...r, current_year: Number(r.current_year) }) },
  {
    name: "assessments",
    file: "assessments.csv",
    map: (r) => ({ ...r, max_marks: Number(r.max_marks), weightage_percent: Number(r.weightage_percent) }),
  },
  { name: "enrollments", file: "enrollments.csv", map: (r) => r },
  {
    name: "marks",
    file: "marks.csv",
    map: (r) => ({ ...r, marks_obtained: Number(r.marks_obtained), is_absent: bools(r.is_absent) }),
  },
  {
    name: "attendance_sessions",
    file: "attendance_sessions.csv",
    map: (r) => ({ ...r, period_number: Number(r.period_number) }),
  },
  {
    name: "attendance_records",
    file: "attendance_records.csv",
    map: (r) => ({ ...r, is_present: bools(r.is_present) }),
  },
];

async function api(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${init.method || "GET"} ${path} -> ${res.status}: ${body.slice(0, 500)}`);
  }
  return res;
}

async function wipe() {
  // Remove the throwaway auth probe user created while diagnosing GoTrue.
  const list = await api("/auth/v1/admin/users?per_page=200");
  const { users = [] } = await list.json();
  for (const u of users) {
    if (u.email === "probe1@college.edu") {
      await api(`/auth/v1/admin/users/${u.id}`, { method: "DELETE" });
      console.log("  removed probe auth user");
    }
  }

  const order = [
    "attendance_records",
    "attendance_sessions",
    "marks",
    "assessments",
    "enrollments",
    "students",
    "teacher_assignments",
    "teacher_profiles",
    "subjects",
    "sections",
    "academic_terms",
    "departments",
  ];
  for (const table of order) {
    await api(`/rest/v1/${table}?id=not.is.null`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
  }
  console.log("  wiped academic tables");
}

async function insertTable({ name, file, map }, batchSize = 1000) {
  const rows = parseCsv(file).map(map);
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    await api(`/rest/v1/${name}`, {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(chunk),
    });
    process.stdout.write(`\r  ${name}: ${Math.min(i + batchSize, rows.length)}/${rows.length}`);
  }
  process.stdout.write("\n");
  return rows.length;
}

async function count(table) {
  const res = await api(`/rest/v1/${table}?select=id&limit=0`, {
    headers: { Prefer: "count=exact" },
  });
  return res.headers.get("content-range");
}

async function main() {
  console.log("ACADNEX reseed ->", BASE);
  console.log("1. Wipe");
  await wipe();

  console.log("2. Insert");
  const inserted = {};
  for (const spec of TABLES) inserted[spec.name] = await insertTable(spec);

  console.log("3. Teacher profile + assignments");
  const profiles = await (await api("/rest/v1/profiles?select=id,email,role")).json();
  const teacher = profiles.find((p) => p.email === "teacher@college.edu");
  if (!teacher) throw new Error("teacher profile missing");

  const dept = parseCsv("departments.csv").find((d) => d.code === "CSE");
  await api("/rest/v1/teacher_profiles", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: teacher.id,
      department_id: dept.id,
      employee_id: "EMP-CSE-001",
    }),
  }).then((r) => r.json());

  const teacherRows = await (await api(`/rest/v1/teacher_profiles?select=id&user_id=eq.${teacher.id}`)).json();
  const teacherProfileId = teacherRows[0].id;

  const subjects = parseCsv("subjects.csv");
  const sections = parseCsv("sections.csv");
  const terms = parseCsv("academic_terms.csv");
  const assignments = [];
  for (const subject of subjects) {
    for (const section of sections) {
      for (const term of terms) {
        assignments.push({
          teacher_profile_id: teacherProfileId,
          subject_id: subject.id,
          section_id: section.id,
          academic_term_id: term.id,
        });
      }
    }
  }
  await api("/rest/v1/teacher_assignments", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(assignments),
  });
  console.log(`  ${assignments.length} teacher assignments`);

  // Attribute the synthetic records to the demo teacher for realistic audit fields.
  await api(`/rest/v1/marks?entered_by=is.null`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ entered_by: teacher.id }),
  });
  await api(`/rest/v1/attendance_sessions?taken_by=is.null`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ taken_by: teacher.id }),
  });

  console.log("4. Verify");
  let ok = true;
  for (const spec of TABLES) {
    const range = await count(spec.name);
    const n = Number((range || "*/0").split("/")[1]);
    const good = n === inserted[spec.name];
    ok = ok && good;
    console.log(`  ${good ? "OK " : "BAD"} ${spec.name}: ${n}/${inserted[spec.name]}`);
  }
  console.log(`  teacher_assignments: ${(await count("teacher_assignments")).split("/")[1]}`);
  if (!ok) throw new Error("Row count mismatch");
  console.log("Done.");
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
