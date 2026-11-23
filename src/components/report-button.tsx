"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  buildProgressReportDoc,
  type LogoSlot,
  type ProgressReportData as ReportData,
  type ReportImage,
} from "@/lib/progress-report";
import { progressReportConfig } from "@/lib/report-config";

export type { ReportData };

/**
 * Loads a public image and converts it to a PNG data URL so jsPDF can embed
 * it (jsPDF does not decode webp/svg sources). Returns null when the file is
 * missing so the PDF falls back to a placeholder box.
 */
async function loadImage(src: string): Promise<ReportImage | null> {
  if (!src || typeof document === "undefined") return null;
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Failed to load image ${src}`));
      image.src = src;
    });
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image, 0, 0);
    return {
      src: canvas.toDataURL("image/png"),
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } catch {
    return null;
  }
}

export function ReportButton({ data }: { data: ReportData }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function download() {
    setBusy(true);
    setFailed(false);
    try {
      const [leftImage, rightImage] = await Promise.all([
        loadImage(progressReportConfig.logoPath),
        loadImage(progressReportConfig.emblemPath),
      ]);
      const resolveSlot = (image: ReportImage | null, path: string): LogoSlot =>
        image ?? (path ? null : "empty");

      const doc = await buildProgressReportDoc(data, progressReportConfig, {
        left: resolveSlot(leftImage, progressReportConfig.logoPath),
        right: resolveSlot(rightImage, progressReportConfig.emblemPath),
      });

      const safeName = data.name.replace(/[^a-z0-9]+/gi, "_");
      doc.save(`Progress_Report_${data.registerNumber}_${safeName}.pdf`);
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