import type { jsPDF } from "jspdf";

/**
 * ACADNEX student progress report (A4, print-friendly).
 *
 * Layout engine kept free of browser-only APIs (except jsPDF itself) so it can
 * be rendered from a Node script (`scripts/preview-report.mjs`) as well as in
 * the client. Branding is drawn as vectors — no image assets required.
 *
 * Data integrity: every mark is printed exactly as recorded (all exams are
 * out of 100); percentages are only ever computed as (marks / max) × 100.
 */

export interface ReportExamMark {
  /** Marks obtained, or null when nothing was recorded. */
  marks: number | null;
  maxMarks: number;
  absent: boolean;
}

export interface ReportSubjectMark {
  code: string;
  name: string;
  cat1: ReportExamMark | null;
  cat2: ReportExamMark | null;
  semester: ReportExamMark | null;
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

export interface ProgressReportConfig {
  /** Issuing identity on the letterhead. Set to the college's own name to
   *  issue reports under the institution's letterhead instead. */
  institutionName: string;
  institutionSubline: string;
  institutionTagline: string;
  degree: string;
  /** When set, overrides the department name from the database on the PDF. */
  departmentName?: string;
  /** When set, overrides the department code (course, HOD line, section). */
  departmentCode?: string;
  /** Title banner, e.g. "STUDENT PROGRESS REPORT". */
  reportTitle: string;
  passThresholdPercent: number;
  classAdvisor: string;
  classCoAdvisor: string;
  yearCoordinator: string;
  hod: string;
}

// ---- ACADNEX palette (print-safe values mirror the app tokens) -----------
const NAVY: [number, number, number] = [13, 20, 38];
const BLUE: [number, number, number] = [37, 99, 235];
const CYAN: [number, number, number] = [34, 211, 238];
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];
const RULE: [number, number, number] = [203, 213, 225];

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

/**
 * Draws the ACADNEX mark (rounded tile, ascending bars, rising data line)
 * with jsPDF primitives so the PDF needs no image assets.
 */
function drawBrandMark(doc: jsPDF, x: number, y: number, size: number) {
  const u = size / 64; // one geometry unit
  doc.setFillColor(...NAVY);
  doc.roundedRect(x, y, size, size, 14 * u, 14 * u, "F");
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(1.5 * u);
  doc.roundedRect(x + 0.75 * u, y + 0.75 * u, size - 1.5 * u, size - 1.5 * u, 13.25 * u, 13.25 * u);

  doc.setFillColor(...BLUE);
  doc.roundedRect(x + 13 * u, y + 36 * u, 8 * u, 15 * u, 2.5 * u, 2.5 * u, "F");
  doc.roundedRect(x + 27 * u, y + 28 * u, 8 * u, 23 * u, 2.5 * u, 2.5 * u, "F");
  doc.setFillColor(...CYAN);
  doc.roundedRect(x + 41 * u, y + 18 * u, 8 * u, 33 * u, 2.5 * u, 2.5 * u, "F");

  doc.setDrawColor(...CYAN);
  doc.setLineWidth(2.75 * u);
  doc.line(x + 14 * u, y + 41 * u, x + 28 * u, y + 31 * u);
  doc.line(x + 28 * u, y + 31 * u, x + 43 * u, y + 21 * u);
  doc.line(x + 43 * u, y + 21 * u, x + 52 * u, y + 10 * u);

  doc.setFillColor(...CYAN);
  doc.circle(x + 52 * u, y + 10 * u, 3.6 * u, "F");
}

/** Draws the letterhead brand block and returns the y where content can start. */
function drawLetterhead(doc: jsPDF, config: ProgressReportConfig, departmentName: string): number {
  const W = doc.internal.pageSize.getWidth();
  const M = 36;

  drawBrandMark(doc, M, 40, 46);

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(config.institutionName, M + 56, 56, { charSpace: 1.4 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(config.institutionSubline.toUpperCase(), M + 56, 68, { charSpace: 0.6 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BLUE);
  doc.text(config.institutionTagline.toUpperCase(), M + 56, 80, { charSpace: 0.8 });

  // Right side: issuing department.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(`DEPARTMENT OF ${departmentName.toUpperCase()}`, W - M, 56, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("Academic analytics · Attendance · Early warnings", W - M, 68, { align: "right" });

  // Brand rule.
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(1.2);
  doc.line(M, 96, W - M, 96);
  doc.setDrawColor(...CYAN);
  doc.setLineWidth(1.2);
  doc.line(M, 96, M + 64, 96);

  return 112;
}

/** Brand mark + tagline footer with page numbering on every page. */
function drawPageFooters(doc: jsPDF) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 36;
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    drawBrandMark(doc, M, H - 40, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("ACADNEX · Academic Intelligence. Elevated.", M + 20, H - 30);
    doc.text(`Page ${page} of ${total}`, W - M, H - 30, { align: "right" });
  }
}

export async function buildProgressReportDoc(
  data: ProgressReportData,
  config: ProgressReportConfig,
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
    textColor: INK,
    lineColor: RULE,
    lineWidth: 0.75,
    cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
  };
  const margin = { left: M, right: M };

  // ---- Page frame ----------------------------------------------------------
  doc.setDrawColor(...RULE);
  doc.setLineWidth(1);
  doc.rect(22, 22, W - 44, H - 44);

  drawLetterhead(doc, config, departmentName);

  // ---- Report banner ---------------------------------------------------------
  doc.setFillColor(...NAVY);
  doc.roundedRect(M, 112, contentW, 26, 4, 4, "F");
  doc.setFillColor(...CYAN);
  doc.rect(M, 112, 5, 26, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(config.reportTitle, W / 2, 128.5, { align: "center", charSpace: 1.2 });
  doc.setTextColor(...INK);

  // ---- Student info table ----------------------------------------------------
  autoTable(doc, {
    startY: 150,
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

  // ---- Assessment performance banner ------------------------------------------
  const barY = lastY() + 18;
  const oddEven = data.semester % 2 === 1 ? "ODD" : "EVEN";
  const barTitle = `ASSESSMENT PERFORMANCE (${shortAcademicYear(data.academicYear)} ${oddEven} SEMESTER - ${romanNumeral(data.semester)})`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  let barHeight = 26;
  const titleLines =
    doc.getTextWidth(barTitle) > contentW - 24
      ? (doc.splitTextToSize(barTitle, contentW - 24) as string[])
      : [barTitle];
  barHeight += (titleLines.length - 1) * 11;
  doc.setFillColor(232, 238, 246);
  doc.rect(M, barY, contentW, barHeight, "F");
  doc.setTextColor(...INK);
  titleLines.forEach((line, index) => {
    doc.text(line, W / 2, barY + 16.5 + index * 11, { align: "center" });
  });

  // ---- Marks table: CAT 1 / CAT 2 / Semester ----------------------------------
  // A subject passes when the average of its recorded exam percentages meets
  // the configured threshold. Marks are printed exactly as recorded (out of 100).
  const examPct = (exam: ReportExamMark | null): number | null => {
    if (!exam || exam.maxMarks <= 0) return null;
    if (exam.absent || exam.marks === null) return 0;
    return (exam.marks / exam.maxMarks) * 100;
  };
  const formatExam = (exam: ReportExamMark | null): string => {
    if (!exam) return "—";
    if (exam.absent) return "ABSENT";
    return exam.marks === null ? "—" : number(exam.marks);
  };

  const subjectResults = data.subjects.map((subject) => {
    const pcts = [examPct(subject.cat1), examPct(subject.cat2), examPct(subject.semester)].filter(
      (pct): pct is number => pct !== null,
    );
    const avg = pcts.length > 0 ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null;
    return {
      subject,
      avg,
      result:
        avg === null
          ? "—"
          : avg >= config.passThresholdPercent
            ? "PASS"
            : "FAIL",
    };
  });

  const recorded = subjectResults.filter(
    ({ subject }) => subject.cat1 || subject.cat2 || subject.semester,
  );
  const totalMarks = recorded.reduce(
    (sum, { subject }) =>
      sum +
      [subject.cat1, subject.cat2, subject.semester].reduce(
        (acc, exam) => acc + (exam && !exam.absent ? (exam.marks ?? 0) : 0),
        0,
      ),
    0,
  );
  const totalMax = recorded.reduce(
    (sum, { subject }) =>
      sum +
      [subject.cat1, subject.cat2, subject.semester].reduce(
        (acc, exam) => acc + (exam ? exam.maxMarks : 0),
        0,
      ),
    0,
  );
  const totalPercent = totalMax > 0 ? (totalMarks / totalMax) * 100 : 0;
  const failedCount = subjectResults.filter(({ result }) => result === "FAIL").length;

  autoTable(doc, {
    startY: barY + barHeight,
    margin,
    theme: "grid",
    styles: baseStyles,
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 150 },
      1: { cellWidth: 64 },
      2: { cellWidth: 58, halign: "center" },
      3: { cellWidth: 58, halign: "center" },
      4: { cellWidth: 62, halign: "center" },
      5: { cellWidth: contentW - 392, halign: "center" },
    },
    head: [["Subjects", "Subject Code", "CAT 1", "CAT 2", "Semester", "Result (Pass / Fail)"]],
    body: subjectResults.map(({ subject, result }) => [
      subject.name,
      subject.code,
      formatExam(subject.cat1),
      formatExam(subject.cat2),
      formatExam(subject.semester),
      result,
    ]),
  });

  // ---- Overall performance summary ---------------------------------------------
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
      [
        "Overall Performance (All Assessments / Percentage)",
        `${number(totalMarks)} / ${totalPercent.toFixed(2)} %`,
      ],
      ["Number of Subjects Failed", String(failedCount)],
      [semesterArrearLabel, "0"],
      [
        `Attendance % (${data.attendanceFrom} to ${data.attendanceTo})`,
        `${number(data.attendancePercent)} %`,
      ],
    ],
  });

  // ---- Remarks by class advisor (page 1, if it still fits) ----------------------
  const remarksHeight = 110;
  if (lastY() + 26 + remarksHeight > H - 70) {
    doc.addPage();
    doc.setDrawColor(...RULE);
    doc.setLineWidth(1);
    doc.rect(22, 22, W - 44, H - 44);
  }
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

  // ---- Acknowledgement slip (always page 2) --------------------------------------
  doc.addPage();
  doc.setDrawColor(...RULE);
  doc.setLineWidth(1);
  doc.rect(22, 22, W - 44, H - 44);

  drawBrandMark(doc, M, 40, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(config.institutionName, M + 38, 54, { charSpace: 1.2 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(config.institutionSubline.toUpperCase(), M + 38, 65, { charSpace: 0.5 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  doc.text(`ACKNOWLEDGEMENT FOR ${config.reportTitle}`, W / 2, 104, { align: "center", charSpace: 0.8 });

  autoTable(doc, {
    startY: 118,
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

  // ---- Footer notes ----------------------------------------------------------------
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  const footerY = Math.max(lastY() + 18, H - 96);
  const returnTo = [
    config.classAdvisor,
    "The Class Advisor",
    `${romanNumeral(data.year)} Year ${data.section}`,
  ]
    .filter(Boolean)
    .join(", ");
  doc.text(`Please return to : ${returnTo}`, M, footerY);
  doc.text("Note : Please return the form duly filled and signed for further review to HOD.", M, footerY + 12);

  doc.setDrawColor(...CYAN);
  doc.setLineWidth(1);
  doc.line(M, H - 62, W - M, H - 62);

  drawPageFooters(doc);
  doc.setTextColor(...INK);

  return doc;
}

/** "2026-2027" → "2026-27" for the marks-table banner. */
function shortAcademicYear(academicYear: string): string {
  const match = academicYear.match(/^(\d{4})-(\d{4})$/);
  if (!match) return academicYear;
  return `${match[1]}-${match[2]?.slice(2)}`;
}
