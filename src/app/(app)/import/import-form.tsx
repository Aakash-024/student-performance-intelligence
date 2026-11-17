"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { useRefreshOnSuccess } from "@/components/use-refresh-on-success";
import {
  commitMarks as commitMarksAction,
  commitStudents as commitStudentsAction,
  previewMarks as previewMarksAction,
  previewStudents as previewStudentsAction,
  type CommitState,
  type ImportRowView,
  type ImportStatus,
  type PreviewState,
} from "./actions";

const emptyPreview: PreviewState = {
  csv: "",
  rows: [],
  counts: { ready: 0, update: 0, error: 0, skipped: 0 },
};
const emptyCommit: CommitState = {};

const statusStyle: Record<ImportStatus, string> = {
  ready: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  update: "bg-sky-50 text-sky-700 ring-sky-200",
  error: "bg-rose-50 text-rose-700 ring-rose-200",
  skipped: "bg-amber-50 text-amber-700 ring-amber-200",
};

function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {message}
    </p>
  );
}

function SuccessMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {message}
    </p>
  );
}

function PreviewTable({ rows }: { rows: ImportRowView[] }) {
  return (
    <div className="thin-scroll mt-3 max-h-96 overflow-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2 font-medium">Line</th>
            <th className="px-3 py-2 font-medium">Record</th>
            <th className="px-3 py-2 font-medium">Details</th>
            <th className="px-3 py-2 font-medium">Result</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.slice(0, 100).map((row) => (
            <tr key={row.line} className="bg-white">
              <td className="px-3 py-2 text-slate-400">{row.line}</td>
              <td className="px-3 py-2 font-medium text-slate-800">{row.label}</td>
              <td className="px-3 py-2 text-xs text-slate-500">{row.detail}</td>
              <td className="px-3 py-2">
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ring-1 ${statusStyle[row.status]}`}>
                  {row.status}
                </span>
                <span className="ml-2 text-xs text-slate-500">{row.message}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 100 ? (
        <p className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Showing the first 100 of {rows.length} rows. All valid rows will be imported.
        </p>
      ) : null}
    </div>
  );
}

function ImportFlow({ kind }: { kind: "students" | "marks" }) {
  const isStudents = kind === "students";

  // Explicit state instead of useActionState so that validating a new file can
  // clear the previous commit result (otherwise the Import button stays hidden
  // after the first import).
  const [preview, setPreview] = useState<PreviewState>(emptyPreview);
  const [previewing, setPreviewing] = useState(false);
  const [commit, setCommit] = useState<CommitState>(emptyCommit);
  const [committing, setCommitting] = useState(false);

  useRefreshOnSuccess(commit);

  async function handlePreview(formData: FormData) {
    setPreviewing(true);
    const result = await (isStudents ? previewStudentsAction : previewMarksAction)(undefined, formData);
    setPreview(result);
    setCommit(emptyCommit);
    setPreviewing(false);
  }

  async function handleCommit(formData: FormData) {
    setCommitting(true);
    const result = await (isStudents ? commitStudentsAction : commitMarksAction)(undefined, formData);
    setCommit(result);
    setCommitting(false);
  }

  const valid = preview.counts.ready + preview.counts.update;
  const columns = isStudents
    ? "register_number, name, email, section, current_year, status"
    : "register_number, subject_code, term, assessment, marks_obtained, is_absent";
  const help = isStudents
    ? "Existing register numbers are updated; new ones are created and enrolled in the current term. Sections must already exist."
    : "Use CAT 1, CAT 2 or Semester as the assessment. Existing marks become audited corrections; marks for classes you are not assigned to are skipped.";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {isStudents ? "Student list" : "Marks list"}
            </h2>
            <p className="mt-1 max-w-2xl text-xs text-slate-500">{help}</p>
            <code className="mt-2 block break-all rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600">
              {columns}
            </code>
          </div>
          <a
            href={`/api/import/template?type=${kind}`}
            download
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
          >
            <Download className="h-3.5 w-3.5" /> Download template
          </a>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <form action={handlePreview} className="flex flex-wrap items-end gap-3">
            <label className="min-w-64 flex-1 text-sm">
              <span className="mb-1 block font-medium text-slate-700">CSV file</span>
              <input
                type="file"
                name="file"
                accept=".csv,text/csv"
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-white"
              />
            </label>
            <button
              type="submit"
              disabled={previewing}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-70"
            >
              {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {previewing ? "Checking…" : "Validate file"}
            </button>
          </form>
        </div>
        <div className="mt-3 space-y-2">
          <ErrorMessage message={preview.error} />
          <ErrorMessage message={commit.error} />
          <SuccessMessage message={commit.success} />
        </div>
      </div>

      {preview.rows.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                {preview.counts.ready} new
              </span>
              <span className="rounded-full bg-sky-50 px-2.5 py-1 font-medium text-sky-700">
                {preview.counts.update} update
              </span>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                {preview.counts.skipped} skipped
              </span>
              <span className="rounded-full bg-rose-50 px-2.5 py-1 font-medium text-rose-700">
                {preview.counts.error} errors
              </span>
            </div>
            {!commit.success ? (
              <form action={handleCommit}>
                <input type="hidden" name="csv" value={preview.csv} />
                <button
                  type="submit"
                  disabled={committing || valid === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-70"
                >
                  {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                  {committing ? "Importing…" : `Import ${valid} valid row${valid === 1 ? "" : "s"}`}
                </button>
              </form>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            The file is validated again when you click Import. Rows with errors or skipped rows are not written.
          </p>
          <PreviewTable rows={preview.rows} />
        </div>
      ) : null}
    </div>
  );
}

export function ImportForm() {
  const [tab, setTab] = useState<"students" | "marks">("students");

  return (
    <div>
      <div className="mb-5 inline-flex rounded-xl bg-slate-100 p-1">
        {(["students", "marks"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${
              tab === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      <ImportFlow key={tab} kind={tab} />
    </div>
  );
}