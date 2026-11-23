import { FileUp, ShieldCheck } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { ImportForm } from "./import-form";

export const metadata = { title: "Import" };

export default async function ImportPage() {
  await requireStaff();

  return (
    <div>
      <PageHeader
        title="Import data"
        description="Upload a CSV of students or marks. Every row is checked before anything is saved."
      />

      <Card bodyClassName="px-5 py-4">
        <div className="flex gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-blue/10 text-brand-cyan ring-1 ring-brand-blue/30">
            <FileUp className="h-4 w-4" />
          </span>
          <div className="text-sm text-brand-muted">
            <p className="font-medium text-brand-text">Two-step import</p>
            <p className="mt-1 text-xs text-brand-muted">
              Validate first to see a per-row preview, then confirm the import. Nothing is written
              during validation, and the file is checked again when you confirm. Download a template
              below to see the exact column names.
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-brand-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Mark corrections are written to the same audit trail as manual edits.
            </p>
          </div>
        </div>
      </Card>

      <div className="mt-5">
        <ImportForm />
      </div>
    </div>
  );
}
