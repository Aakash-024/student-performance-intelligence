"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type { Indicator } from "@/lib/types";
import { indicatorMeta } from "@/lib/utils";

export interface ReportData {
  name: string;
  registerNumber: string;
  email: string | null;
  section: string;
  year: number;
  indicator: Indicator;
  average: number;
  attendance: number;
  previousAverage: number | null;
  change: number;
  subjectsPassed: number;
  subjectsCount: number;
  rank: number;
  cohort: number;
  term: string;
  subjects: { code: string; name: string; current: number; previous: number | null }[];
  attendanceByTerm: { term: string; percentage: number; sessions: number }[];
}

export function ReportButton({ data }: { data: ReportData }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const mod = await import("jspdf-autotable");
      const autoTable =
        (mod as unknown as { default?: typeof import("jspdf-autotable").default }).default ??
        (mod as unknown as { autoTable: typeof import("jspdf-autotable").default }).autoTable;

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 92, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Student Performance Report", 40, 40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(199, 210, 254);
      doc.text("SPIP · Student Performance Intelligence Platform", 40, 58);
      doc.text(new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }), 40, 72);

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text(data.name, 40, 124);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `${data.registerNumber} · Section ${data.section} · Year ${data.year}${data.email ? ` · ${data.email}` : ""}`,
        40,
        140,
      );
      doc.text(`${data.term} · Generated from live database records`, 40, 154);

      autoTable(doc, {
        startY: 174,
        head: [["Overall average", "Attendance", "Subjects passed", "Class rank", "Indicator"]],
        body: [
          [
            `${data.average.toFixed(1)}%`,
            `${data.attendance.toFixed(1)}%`,
            `${data.subjectsPassed}/${data.subjectsCount}`,
            `${data.rank} of ${data.cohort}`,
            indicatorMeta[data.indicator].label,
          ],
        ],
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8 },
      });

      const afterSummary = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

      autoTable(doc, {
        startY: afterSummary + 22,
        head: [["Subject", "Code", "Current term", "Previous term", "Change"]],
        body: data.subjects.map((subject) => [
          subject.name,
          subject.code,
          `${subject.current.toFixed(1)}%`,
          subject.previous === null ? "—" : `${subject.previous.toFixed(1)}%`,
          subject.previous === null ? "—" : `${subject.current - subject.previous >= 0 ? "+" : ""}${(subject.current - subject.previous).toFixed(1)}`,
        ]),
        theme: "striped",
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8 },
      });

      const afterSubjects = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

      autoTable(doc, {
        startY: afterSubjects + 22,
        head: [["Attendance by term", "Sessions", "Attendance"]],
        body: data.attendanceByTerm.map((row) => [
          row.term,
          String(row.sessions),
          `${row.percentage.toFixed(1)}%`,
        ]),
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 8 },
      });

      const afterAttendance = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("How this student is classified", 40, afterAttendance + 26);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      const rules = [
        `Indicator: ${indicatorMeta[data.indicator].label}`,
        "At risk: average < 40% or attendance < 60%.",
        "Declining / improving: change of 5+ points versus the previous term.",
        "High performer: average >= 75% and attendance >= 85%.",
        `Term-over-term change: ${data.change >= 0 ? "+" : ""}${data.change.toFixed(1)} points.`,
      ];
      doc.text(rules, 40, afterAttendance + 42, { lineHeightFactor: 1.5 });

      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setDrawColor(226, 232, 240);
      doc.line(40, pageHeight - 46, pageWidth - 40, pageHeight - 46);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        "Synthetic data for demonstration. Generated by SPIP.",
        40,
        pageHeight - 30,
      );

      const safeName = data.name.replace(/[^a-z0-9]+/gi, "_");
      doc.save(`SPIP_${data.registerNumber}_${safeName}.pdf`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {busy ? "Preparing PDF…" : "Download report"}
    </button>
  );
}
