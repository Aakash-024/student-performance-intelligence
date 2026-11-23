// Renders a sample progress report PDF with realistic data so the layout can
// be reviewed without running the app. Usage: node scripts/preview-report.mjs [outPath]
import { writeFileSync, readFileSync } from "node:fs";
import { buildProgressReportDoc, formatDotDate, toAcademicYear } from "../src/lib/progress-report.ts";

const config = {
  collegeName: "SRM VALLIAMMAI ENGINEERING COLLEGE",
  collegeSubline: "(An Autonomous Institution)",
  collegeAddress: "SRM NAGAR, KATTANKULATHUR - 603 203.",
  logoPath: "",
  emblemPath: "",
  degree: "B.TECH",
  departmentName: "Artificial Intelligence and Data Science",
  departmentCode: "AI & DS",
  assessmentTitle: "CONTINUOUS ASSESSMENT TEST - I",
  assessmentShort: "CAT-I",
  passThresholdPercent: 50,
  classAdvisor: "",
  classCoAdvisor: "",
  yearCoordinator: "",
  hod: "",
};

const data = {
  name: "Aryan Maharaj",
  registerNumber: "2024CSEA001",
  year: 2,
  section: "AI & DS-A",
  departmentName: "Computer Science and Engineering",
  departmentCode: "CSE",
  course: "B.TECH (CSE)",
  semester: 4,
  academicYear: toAcademicYear(2025),
  attendancePercent: 96.34,
  attendanceFrom: formatDotDate("2026-01-10"),
  attendanceTo: formatDotDate("2026-06-10"),
  subjects: [
    { code: "CS201", name: "Data Structures and Algorithms", marks: 90, maxMarks: 100, absent: false },
    { code: "CS202", name: "Object Oriented Programming", marks: 78, maxMarks: 100, absent: false },
    { code: "CS203", name: "Database Management Systems", marks: 86, maxMarks: 100, absent: false },
    { code: "CS204", name: "Computer Networks", marks: 48, maxMarks: 100, absent: false },
    { code: "CS205", name: "Data Structures Lab", marks: 96, maxMarks: 100, absent: false },
    { code: "CS206", name: "Discrete Mathematics", marks: null, maxMarks: 100, absent: true },
  ],
  reportDate: formatDotDate(new Date().toISOString().slice(0, 10)),
};

const logoPath = new URL("../public/srm-logo.png", import.meta.url);
const logoBuffer = readFileSync(logoPath);
const leftLogo = logoBuffer.length
  ? { src: `data:image/png;base64,${logoBuffer.toString("base64")}`, width: 500, height: 450 }
  : null;

const doc = await buildProgressReportDoc(data, config, { left: leftLogo, right: "empty" });
const out = process.argv[2] ?? "sample-progress-report.pdf";
writeFileSync(out, Buffer.from(doc.output("arraybuffer")));
console.log("wrote", out);
