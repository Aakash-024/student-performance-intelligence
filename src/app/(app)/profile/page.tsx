import { CalendarDays, Mail, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { signOut } from "@/app/login/actions";
import { LogOut } from "lucide-react";

export const metadata = { title: "Profile" };

const roleCopy: Record<string, { label: string; description: string }> = {
  admin: {
    label: "Administrator",
    description: "Full control of academic structure, staff accounts and analytics.",
  },
  teacher: {
    label: "Teacher",
    description:
      "Manages academic structure and enters marks/attendance for assigned classes.",
  },
  viewer: {
    label: "Demo · view-only",
    description: "Read-only demo access. The database rejects any write attempt.",
  },
};

export default async function ProfilePage() {
  const { user, profile } = await requireUser();
  const role = roleCopy[profile?.role ?? "viewer"] ?? roleCopy.viewer;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profile" description="Your ACADNEX account and access level." />

      <Card>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand-blue/15 text-lg font-semibold text-brand-cyan ring-1 ring-brand-blue/40">
            {(profile?.full_name || profile?.email || "?")
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? "")
              .join("")}
          </span>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-brand-text">
              {profile?.full_name ?? "Unnamed account"}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-brand-muted">
              <Mail className="h-3.5 w-3.5" /> {profile?.email ?? user.email}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-brand-cyan">
              <ShieldCheck className="h-3.5 w-3.5" /> {role.label}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-brand-border bg-[var(--brand-panel)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">
              Access level
            </p>
            <p className="mt-1.5 text-sm text-brand-text">{role.description}</p>
          </div>
          <div className="rounded-xl border border-brand-border bg-[var(--brand-panel)] p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-brand-muted">
              <CalendarDays className="h-3.5 w-3.5" /> Member since
            </p>
            <p className="mt-1.5 text-sm text-brand-text">
              {user.created_at
                ? new Date(user.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>
        </div>

        <form action={signOut} className="mt-6">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl border border-brand-border bg-[var(--brand-panel)] px-4 py-2 text-sm font-medium text-brand-text transition hover:border-rose-500/40 hover:text-rose-400"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </form>
      </Card>

      <p className="mt-4 text-xs text-brand-muted">
        Account settings (name, password, role) are managed by administrators on the
        Accounts page. Password resets are handled there too — this keeps every
        credential change audited.
      </p>
    </div>
  );
}
