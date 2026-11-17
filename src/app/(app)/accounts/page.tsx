import { Eye, KeyRound, ShieldCheck, UserCog, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui";
import { AccountRowActions, CreateAccountForm } from "./account-forms";

export const metadata = { title: "Accounts" };

const roleBadge = {
  admin: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  teacher: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  viewer: "bg-amber-50 text-amber-700 ring-amber-200",
} as const;

const roleLabel = {
  admin: "Administrator",
  teacher: "Teacher",
  viewer: "Demo viewer · read-only",
} as const;

export default async function AccountsPage() {
  const { profile } = await requireAdmin();
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: true });

  const staff = (accounts ?? []).filter((account) => account.role !== "viewer");
  const viewers = (accounts ?? []).filter((account) => account.role === "viewer");

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="Create individual logins for teachers and administrators. Demo viewer accounts are read-only and locked."
      />

      <Card bodyClassName="px-5 py-4">
        <div className="flex gap-3 text-sm text-slate-600">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs text-slate-500">
              <span className="font-medium text-slate-800">Admin</span> — full control, including this
              page. <span className="font-medium text-slate-800">Teacher</span> — manages structure and
              enters marks for assigned classes.{" "}
              <span className="font-medium text-slate-800">Viewer</span> — browse-only; the database
              rejects every write, and the two public demo accounts are permanently locked to this role.
            </p>
          </div>
        </div>
      </Card>

      <div className="mt-5">
        <CreateAccountForm />
      </div>

      <Card
        title="Staff accounts"
        description="Teachers and administrators"
        className="mt-5"
        bodyClassName="px-0 py-0"
      >
        <div className="divide-y divide-slate-100">
          {staff.map((account) => (
            <div key={account.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {account.full_name || account.email}
                  </p>
                  <p className="text-xs text-slate-500">{account.email}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${roleBadge[account.role as "admin" | "teacher"]}`}
                >
                  {account.role === "admin" ? (
                    <ShieldCheck className="h-3 w-3" />
                  ) : (
                    <Users className="h-3 w-3" />
                  )}
                  {roleLabel[account.role as "admin" | "teacher"]}
                </span>
              </div>
              <AccountRowActions
                user={{ id: account.id, email: String(account.email), role: String(account.role) }}
                isSelf={account.id === profile?.id}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="Demo viewer accounts"
        description="Public showcase logins — locked to read-only"
        className="mt-5"
        bodyClassName="px-0 py-0"
      >
        <div className="divide-y divide-slate-100">
          {viewers.map((account) => (
            <div key={account.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {account.full_name || account.email}
                </p>
                <p className="text-xs text-slate-500">{account.email}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${roleBadge.viewer}`}
              >
                <Eye className="h-3 w-3" />
                {roleLabel.viewer}
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
                  <KeyRound className="h-3 w-3" /> locked
                </span>
              </span>
            </div>
          ))}
          {!viewers.length ? (
            <p className="px-5 py-4 text-sm text-slate-500">No viewer accounts.</p>
          ) : null}
        </div>
      </Card>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
        <UserCog className="h-3.5 w-3.5" />
        Accounts are managed with the Supabase secret key (SUPABASE_SECRET_KEY) — it lives on the
        server only and is never sent to the browser.
      </p>
    </div>
  );
}