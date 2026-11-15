import type { jsPDF } from "jspdf";

/**
 * Draws the college progress-report PDF (SRM Valliammai format).
 * Kept free of browser-only APIs (except jsPDF itself) so the layout can be
 * rendered in a Node script for preview/testing as well as in the client.
 */

export interface ReportSubjectMark {
  code: string;
  name: string;
  /** Marks obtained, or null when no CAT-I mark was recorded. */
  marks: number | null;
  maxMarks: number;
  absent: boolean;
}

export interface ProgressReportData {
  name: string;
  registerNumber: string;
  /** Year of study, e.g. 2 → "II Year" in the footer. */
  year: number;
  /** Section display name including department, e.g. "CSE-A". */
  section: string;
  departmentName: string;
  departmentCode: string;
  /** e.g. "B.TECH (CSE)". */
  course: string;
  /** Semester number of the current term (1-based). */
  semester: number;
  /** e.g. "2025-2026". */
  academicYear: string;
  attendancePercent: number;
  /** Attendance window labels, e.g. "10.01.26". */
  attendanceFrom: string;
  attendanceTo: string;
  subjects: ReportSubjectMark[];
  /** Report issue date, e.g. "15.11.26". */
  reportDate: string;
}

export interface ReportImage {
  /** Data URL (or image URL supported by jsPDF addImage). */
  src: string;
  width: number;
  height: number;
}

export interface ProgressReportConfig {
  collegeName: string;
  collegeSubline: string;
  collegeAddress: string;
  /** Path under /public for the left logo. Empty string skips it entirely. */
  logoPath: string;
  /** Path under /public for the right emblem. Empty string leaves the slot empty. */
  emblemPath: string;
  degree: string;
  /** When set, overrides the department name from the database on the PDF. */
  departmentName?: string;
  /** When set, overrides the department code (course, HOD line, section). */
  departmentCode?: string;
  assessmentTitle: string;
  assessmentShort: string;
  passThresholdPercent: number;
  classAdvisor: string;
  classCoAdvisor: string;
  yearCoordinator: string;
  hod: string;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export function romanNumeral(value: number): string {
  return ROMAN[value - 1] ?? String(value);
}

/** "2026-01-10" → "10.01.26"; returns the input unchanged when not ISO. */
export function formatDotDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parts = iso.split("-");
  const [year, month, day] = parts;
  if (!year || !month || !day) return iso;
  return `${day}.${month}.${year.slice(2)}`;
}

/** Term year 2025 → academic year "2025-2026". */
export function toAcademicYear(year: number): string {
  return `${year}-${year + 1}`;
}

type AutoTableFunction = (doc: jsPDF, options: Record<string, unknown>) => void;

type CellHook = {
  section?: string;
  column?: { index: number };
  cell: { styles: Record<string, unknown> };
};

interface LastAutoTable {
  lastAutoTable: { finalY: number };
}

function number(value: number): string {
  return String(Number(value.toFixed(2)));
}

/** A logo slot: an image, null (failed to load → placeholder box), or "empty" (nothing drawn). */
export type LogoSlot = ReportImage | null | "empty";

function drawImageSlot(
  doc: jsPDF,
  slot: LogoSlot | undefined,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
) {
  if (slot === "empty") return;
  const image = slot;
  if (image) {
    const scale = Math.min(maxW / image.width, maxH / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    try {
      doc.addImage(image.src, "PNG", x + (maxW - width) / 2, y + (maxH - height) / 2, width, height);
      return;
    } catch {
      // Fall through to the placeholder if the image cannot be embedded.
    }
  }
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.75);
  doc.rect(x, y, maxW, maxH);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("LOGO", x + maxW / 2, y + maxH / 2 + 2, { align: "center" });
  doc.setTextColor(20, 20, 20);
}

export async function buildProgressReportDoc(
  data: ProgressReportData,
  config: ProgressReportConfig,
  logos: { left?: LogoSlot; right?: LogoSlot } = {},
): Promise<jsPDF> {
  const { jsPDF } = await import("jspdf");
  const mod = (await import("jspdf-autotable")) as unknown as {
    default?: AutoTableFunction;
    autoTable?: AutoTableFunction;
  };
  const autoTable = mod.default ?? mod.autoTable;
  if (!autoTable) throw new Error("jspdf-autotable could not be loaded");

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 36;
  const contentW = W - M * 2;

  // Config overrides win over database-derived values so the letterhead can
  // be fixed in report-config.ts without touching the seed data.
  const departmentName = config.departmentName || data.departmentName;
  const departmentCode = config.departmentCode || data.departmentCode;
  const course = `${config.degree} (${departmentCode})`;
  const lastY = () => (doc as unknown as LastAutoTable).lastAutoTable.finalY;

  const baseStyles = {
    font: "helvetica",
    fontSize: 9,
    textColor: [20, 20, 20] as [number, number, number],
    lineColor: [60, 60, 60] as [number, number, number],
    lineWidth: 0.75,
    cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
  };
  const margin = { left: M, right: M };

  // ---- Page border ---------------------------------------------------------
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(1);
  doc.rect(22, 22, W - 44, H - 44);

  // ---- Header --------------------------------------------------------------
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(config.collegeName, W / 2, 58, { align: "center" });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.text(config.collegeSubline, W / 2, 71, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(config.collegeAddress, W / 2, 83, { align: "center" });
  doc.setFontSize(9.5);
  doc.text(`DEPARTMENT OF ${departmentName.toUpperCase()}`, W / 2, 96, { align: "center" });

  drawImageSlot(doc, logos.left, M, 42, 54, 54);
  drawImageSlot(doc, logos.right, W - M - 48, 42, 48, 54);

  // ---- "PROGRESS REPORT" banner ---------------------------------------------
  doc.setFillColor(217, 217, 217);
  doc.rect(M, 112, contentW, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("PROGRESS REPORT", W / 2, 126.5, { align: "center" });

  // ---- Student info table ----------------------------------------------------
  autoTable(doc, {
    startY: 148,
    margin,
    theme: "grid",
    styles: baseStyles,
    columnStyles: {
      0: { cellWidth: 105 },
      1: { cellWidth: 190 },
      2: { cellWidth: 105 },
      3: { cellWidth: contentW - 400 },
    },
    didParseCell: (hook: CellHook) => {
      if (hook.section === "body" && (hook.column?.index === 0 || hook.column?.index === 2)) {
        hook.cell.styles.fontStyle = "bold";
      }
    },
    body: [
      ["Name :", data.name, "Date :", data.reportDate],
      ["Academic Year :", data.academicYear, "Reg. No. :", data.registerNumber],
      [
        "Course :",
        course,
        "Semester / Section :",
        `${romanNumeral(data.semester)} / ${data.section}`,
      ],
    ],
  });

  // ---- CAT-I marks table -----------------------------------------------------
  const barY = lastY() + 18;
  const oddEven = data.semester % 2 === 1 ? "ODD" : "EVEN";
  const barTitle = `${config.assessmentTitle} MARKS (${shortAcademicYear(data.academicYear)} ${oddEven} SEMESTER - ${romanNumeral(data.semester)})`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  let barHeight = 26;
  const titleLines =
    doc.getTextWidth(barTitle) > contentW - 24
      ? (doc.splitTextToSize(barTitle, contentW - 24) as string[])
      : [barTitle];
  barHeight += (titleLines.length - 1) * 11;
  doc.setFillColor(214, 229, 247);
  doc.rect(M, barY, contentW, barHeight, "F");
  doc.setTextColor(20, 20, 20);
  titleLines.forEach((line, index) => {
    doc.text(line, W / 2, barY + 16.5 + index * 11, { align: "center" });
  });

  const markedSubjects = data.subjects.filter((subject) => subject.maxMarks > 0);
  const totalMarks = markedSubjects.reduce(
    (sum, subject) => sum + (subject.absent ? 0 : (subject.marks ?? 0)),
    0,
  );
  const totalMax = markedSubjects.reduce((sum, subject) => sum + subject.maxMarks, 0);
  const totalPercent = totalMax > 0 ? (totalMarks / totalMax) * 100 : 0;
  const failedCount = markedSubjects.filter((subject) => {
    if (subject.absent || subject.marks === null) return false;
    return (subject.marks / subject.maxMarks) * 100 < config.passThresholdPercent;
  }).length;

  autoTable(doc, {
    startY: barY + barHeight,
    margin,
    theme: "grid",
    styles: baseStyles,
    headStyles: { fillColor: [232, 238, 246], textColor: [20, 20, 20], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 246 },
      1: { cellWidth: 118 },
      2: { cellWidth: 76, halign: "center" },
      3: { cellWidth: contentW - 440, halign: "center" },
    },
    head: [["Subjects", "Subject Code", `${config.assessmentShort} Marks`, "Result (Pass / Fail)"]],
    body: data.subjects.map((subject) => [
      subject.name,
      subject.code,
      subject.absent ? "ABSENT" : subject.marks === null ? "—" : number(subject.marks),
      subject.absent
        ? "ABSENT"
        : subject.marks === null
          ? "—"
          : (subject.marks / subject.maxMarks) * 100 >= config.passThresholdPercent
            ? "PASS"
            : "FAIL",
    ]),
  });

  // ---- Summary rows ----------------------------------------------------------
  const semesterArrearLabel =
    data.semester > 1 ? `End Semester Arrear (Up to ${romanNumeral(data.semester - 1)} Sem)` : "End Semester Arrear";

  autoTable(doc, {
    startY: lastY() + 24,
    margin,
    theme: "grid",
    styles: baseStyles,
    columnStyles: {
      0: { cellWidth: 366 },
      1: { cellWidth: contentW - 366, halign: "right" },
    },
    didParseCell: (hook: CellHook) => {
      if (hook.section === "body" && hook.column?.index === 0) {
        hook.cell.styles.fontStyle = "bold";
      }
    },
    body: [
      [`Total ${config.assessmentShort} Marks / Percentage`, `${number(totalMarks)} / ${totalPercent.toFixed(2)} %`],
      ["Number of Subjects Failed", String(failedCount)],
      [semesterArrearLabel, "0"],
      [
        `Attendance % (${data.attendanceFrom} to ${data.attendanceTo})`,
        `${number(data.attendancePercent)} %`,
      ],
    ],
  });

  // ---- Remarks by class advisor ----------------------------------------------
  const remarksLeft = `Remarks by Class Advisor:\n\n\n\n\n\nClass Advisor : ${config.classAdvisor}`;
  const remarksRight = [
    `Class Co-Advisor :  ${config.classCoAdvisor}`,
    "",
    `Year Coordinator :  ${config.yearCoordinator}`,
    "",
    "",
    `HOD / ${departmentCode} :  ${config.hod}`,
  ].join("\n");
  autoTable(doc, {
    startY: lastY() + 26,
    margin,
    theme: "grid",
    styles: { ...baseStyles, minCellHeight: 88, valign: "top" },
    columnStyles: {
      0: { cellWidth: 316 },
      1: { cellWidth: contentW - 316 },
    },
    body: [[remarksLeft, remarksRight]],
  });

  // ---- Acknowledgement slip ----------------------------------------------------
  const dividerY = lastY() + 18;
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.75);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(M, dividerY, W - M, dividerY);
  doc.setLineDashPattern([], 0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(`ACKNOWLEDGEMENT FOR ${config.assessmentTitle}`, W / 2, dividerY + 18, { align: "center" });

  autoTable(doc, {
    startY: dividerY + 28,
    margin,
    theme: "grid",
    styles: baseStyles,
    columnStyles: {
      0: { cellWidth: 105 },
      1: { cellWidth: 190 },
      2: { cellWidth: 95 },
      3: { cellWidth: contentW - 390 },
    },
    didParseCell: (hook: CellHook) => {
      if (hook.section === "body" && hook.column?.index === 0) {
        hook.cell.styles.fontStyle = "bold";
      }
    },
    body: [
      ["Name of the Student", data.name, "Date :", data.reportDate],
      ["Branch", course, "Reg. No. :", data.registerNumber],
      ["Parents' Remarks", "", "Semester :", `${romanNumeral(data.semester)} / ${data.section}`],
      [
        "Signature",
        { content: "", colSpan: 3, styles: { minCellHeight: 30 } },
      ],
    ],
  });

  // ---- Footer notes --------------------------------------------------------------
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);
  const footerY = Math.max(lastY() + 18, H - 52);
  const returnTo = [
    config.classAdvisor,
    "The Class Advisor",
    `${romanNumeral(data.year)} Year ${data.section}`,
  ]
    .filter(Boolean)
    .join(", ");
  doc.text(`Please return to : ${returnTo}`, M, footerY);
  doc.text("Note : Please return the form duly filled and signed for further review to HOD.", M, footerY + 12);
  doc.setTextColor(20, 20, 20);

  return doc;
}

/** "2026-2027" → "2026-27" for the marks-table banner. */
function shortAcademicYear(academicYear: string): string {
  const match = academicYear.match(/^(\d{4})-(\d{4})$/);
  if (!match) return academicYear;
  return `${match[1]}-${match[2]?.slice(2)}`;
}
