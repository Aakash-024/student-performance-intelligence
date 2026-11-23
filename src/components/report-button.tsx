"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  buildProgressReportDoc,
  type ProgressReportData as ReportData,
} from "@/lib/progress-report";
import { progressReportConfig } from "@/lib/report-config";

export type { ReportData };

export function ReportButton({ data }: { data: ReportData }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function download() {
    setBusy(true);
    setFailed(false);
    try {
      const doc = await buildProgressReportDoc(data, progressReportConfig);
      const safeName = data.name.replace(/[^a-z0-9]+/gi, "_");
      doc.save(`ACADNEX_Progress_Report_${data.registerNumber}_${safeName}.pdf`);
    } catch (error) {
      console.error("Progress report generation failed:", error);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={busy}
      title={failed ? "PDF generation failed — see browser console for details" : undefined}
      className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-70 ${
        failed ? "bg-rose-500 hover:brightness-110" : "bg-brand-blue hover:brightness-110"
      }`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {busy ? "Preparing PDF…" : failed ? "PDF failed — retry" : "Download report"}
    </button>
  );
}