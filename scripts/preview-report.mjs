// Renders a sample ACADNEX progress report PDF with realistic data so the
// layout can be reviewed without running the app. Usage:
//   node scripts/preview-report.mjs [outPath]
import { writeFileSync } from "node:fs";
import { buildProgressReportDoc, formatDotDate, toAcademicYear } from "../src/lib/progress-report.ts";

const config = {
  institutionName: "ACADNEX",
  institutionSubline: "Academic Performance Intelligence Platform",
  institutionTagline: "Academic Intelligence. Elevated.",
  degree: "B.TECH",
  departmentName: "Artificial Intelligence and Data Science",
  departmentCode: "AI & DS",
  reportTitle: "STUDENT PROGRESS REPORT",
  passThresholdPercent: 50,
  classAdvisor: "",
  classCoAdvisor: "",
  yearCoordinator: "",
  hod: "",
};

// All exams are out of 100 — marks are printed exactly as recorded.
const exam = (marks, absent = false) => ({
  marks: absent ? null : marks,
  maxMarks: 100,
  absent,
});

const data = {
  name: "Aryan Maharaj",
  registerNumber: "2024CSEA001",
  year: 2,
  section: "AI & DS-A",
  departmentName: "Computer Science and Engineering",
  departmentCode: "AI & DS",
  course: "B.TECH (AI & DS)",
  semester: 2,
  academicYear: toAcademicYear(2025),
  attendancePercent: 86.7,
  attendanceFrom: formatDotDate("2026-01-10"),
  attendanceTo: formatDotDate("2026-06-10"),
  subjects: [
    { code: "CS201", name: "Data Structures and Algorithms", cat1: exam(78), cat2: exam(81), semester: exam(76) },
    { code: "CS202", name: "Object Oriented Programming", cat1: exam(84), cat2: exam(80), semester: exam(88) },
    { code: "CS203", name: "Database Management Systems", cat1: exam(90), cat2: exam(87), semester: exam(91) },
    { code: "CS204", name: "Computer Networks", cat1: exam(46), cat2: exam(52), semester: exam(58) },
    { code: "CS205", name: "Data Structures Lab", cat1: exam(95), cat2: exam(93), semester: exam(96) },
    { code: "CS206", name: "Discrete Mathematics", cat1: exam(0, true), cat2: exam(64), semester: null },
  ],
  reportDate: formatDotDate(new Date().toISOString().slice(0, 10)),
};

const doc = await buildProgressReportDoc(data, config);
const bytes = doc.output("arraybuffer");
const out = process.argv[2] ?? "sample-report.pdf";
writeFileSync(out, Buffer.from(bytes));
console.log(`wrote ${out} (${bytes.byteLength.toLocaleString()} bytes)`);
