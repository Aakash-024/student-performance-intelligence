import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";

export const metadata = { title: "Activity" };

const ENTITY_TYPES = [
  { value: "student", label: "Students" },
  { value: "term", label: "Terms" },
  { value: "subject", label: "Subjects" },
  { value: "enrollment", label: "Enrolments" },
  { value: "assessment", label: "Assessments" },
  { value: "marks", label: "Marks" },
  { value: "attendance", label: "Attendance" },
  { value: "import", label: "CSV imports" },
  { value: "account", label: "Accounts" },
] as const;

const changeTone: Record<string, string> = {
  create: "bg-emerald-50 text-emerald-700",
  session_create: "bg-emerald-50 text-emerald-700",
  update: "bg-sky-50 text-sky-700",
  save: "bg-sky-50 text-sky-700",
  bulk: "bg-indigo-50 text-indigo-700",
  import: "bg-indigo-50 text-indigo-700",
  delete: "bg-rose-50 text-rose-700",
  reset_password: "bg-amber-50 text-amber-700",
  role_change: "bg-amber-50 text-amber-700",
};

interface Entry {
  id: string;
  created_at: string;
  actor_name: string;
  actor_role: string;
  action: string;
  entity_label: string;
  summary: string;
  details: Record<string, unknown> | null;
}

function when(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}, ${date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ who?: string; type?: string }>;
}) {
  await requireStaff();
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("activity_log")
    .select("id, created_at, actor_name, actor_role, action, entity_label, summary, details")
    .order("created_at", { ascending: false })
    .limit(200);
  if (params.who) query = query.eq("actor_id", params.who);
  if (params.type) query = query.eq("entity_type", params.type);

  const [{ data: entries }, { data: profiles }] = await Promise.all([
    query,
    supabase.from("profiles").select("id, full_name, email, role").order("full_name"),
  ]);

  const rows = (entries ?? []) as unknown as Entry[];
  const staffOptions = (profiles ?? []).filter((profile) => profile.role !== "viewer");

  return (
    <div>
      <PageHeader
        title="Activity"
        description="Every change made through the app — who did it, when, and what changed. Append-only; nothing in this log can be edited or deleted."
      />

      <Card bodyClassName="px-4 py-4 sm:px-5">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-500">Person</span>
            <select
              name="who"
              defaultValue={params.who ?? ""}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
            >
              <option value="">Everyone</option>
              {staffOptions.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name || profile.email}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-500">What</span>
            <select
              name="type"
              defaultValue={params.type ?? ""}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
            >
              <option value="">Everything</option>
              {ENTITY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Apply
          </button>
          {params.who || params.type ? (
            <a href="/activity" className="rounded-xl px-2 py-2 text-sm text-slate-500 hover:text-slate-800">
              Reset
            </a>
          ) : null}
        </form>
      </Card>

      <Card
        title="Recent changes"
        description={rows.length ? `Latest ${rows.length} (newest first)` : undefined}
        className="mt-5"
        bodyClassName="px-0 py-0"
      >
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">
            No activity matches this filter yet. Every create, edit, delete, mark save and CSV
            import will appear here.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((entry) => {
              const change = entry.action.split(".")[1] ?? entry.action;
              return (
                <div key={entry.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                        changeTone[change] ?? "bg-slate-100 text-slate-600",
                      )}
                    >
                      {change.replace("_", " ")}
                    </span>
                    <p className="text-sm font-medium text-slate-800">{entry.entity_label}</p>
                    <span className="text-xs text-slate-400">{when(entry.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{entry.summary}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    by {entry.actor_name} ({entry.actor_role})
                  </p>
                  {entry.details && Object.keys(entry.details).length ? (
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-[11px] font-medium text-slate-400 hover:text-slate-600">
                        Details
                      </summary>
                      <pre className="thin-scroll mt-1 max-h-48 overflow-auto rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <p className="mt-3 text-xs text-slate-500">
        Showing up to 200 entries · mark-by-mark before/after values live on each assessment&apos;s
        &ldquo;Correction history&rdquo; card.
      </p>
    </div>
  );
}