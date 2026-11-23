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
  create: "bg-emerald-500/10 text-emerald-400",
  session_create: "bg-emerald-500/10 text-emerald-400",
  update: "bg-sky-500/10 text-sky-400",
  save: "bg-sky-500/10 text-sky-400",
  bulk: "bg-brand-blue/10 text-brand-cyan",
  import: "bg-brand-blue/10 text-brand-cyan",
  delete: "bg-rose-500/10 text-rose-400",
  reset_password: "bg-amber-500/10 text-amber-400",
  role_change: "bg-amber-500/10 text-amber-400",
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
            <span className="mb-1 block text-xs font-medium text-brand-muted">Person</span>
            <select
              name="who"
              defaultValue={params.who ?? ""}
              className="rounded-xl border border-brand-border bg-brand-navy px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-cyan"
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
            <span className="mb-1 block text-xs font-medium text-brand-muted">What</span>
            <select
              name="type"
              defaultValue={params.type ?? ""}
              className="rounded-xl border border-brand-border bg-brand-navy px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-cyan"
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
            className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            Apply
          </button>
          {params.who || params.type ? (
            <a href="/activity" className="rounded-xl px-2 py-2 text-sm text-brand-muted hover:text-brand-text">
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
          <p className="px-5 py-6 text-sm text-brand-muted">
            No activity matches this filter yet. Every create, edit, delete, mark save and CSV
            import will appear here.
          </p>
        ) : (
          <div className="divide-y divide-brand-border">
            {rows.map((entry) => {
              const change = entry.action.split(".")[1] ?? entry.action;
              return (
                <div key={entry.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                        changeTone[change] ?? "bg-brand-navy-soft text-brand-muted",
                      )}
                    >
                      {change.replace("_", " ")}
                    </span>
                    <p className="text-sm font-medium text-brand-text">{entry.entity_label}</p>
                    <span className="text-xs text-brand-muted">{when(entry.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm text-brand-muted">{entry.summary}</p>
                  <p className="mt-0.5 text-xs text-brand-muted">
                    by {entry.actor_name} ({entry.actor_role})
                  </p>
                  {entry.details && Object.keys(entry.details).length ? (
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-[11px] font-medium text-brand-muted hover:text-brand-muted">
                        Details
                      </summary>
                      <pre className="thin-scroll mt-1 max-h-48 overflow-auto rounded-lg bg-brand-panel px-3 py-2 text-[11px] text-brand-muted">
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
      <p className="mt-3 text-xs text-brand-muted">
        Showing up to 200 entries · mark-by-mark before/after values live on each assessment&apos;s
        &ldquo;Correction history&rdquo; card.
      </p>
    </div>
  );
}