"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Eye,
  FileUp,
  GraduationCap,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  ShieldCheck,
  UserCog,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { signOut } from "@/app/login/actions";
import { BrandLogo } from "@/components/brand";
import { cn, initials } from "@/lib/utils";
import type { Profile } from "@/lib/types";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/import", label: "Import", icon: FileUp, staffOnly: true },
  { href: "/terms", label: "Terms", icon: CalendarDays },
  { href: "/subjects", label: "Subjects", icon: BookOpen },
  { href: "/enrollments", label: "Enrolments", icon: ListChecks },
  { href: "/assessments", label: "Assessments", icon: ClipboardList },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/activity", label: "Activity", icon: History, staffOnly: true },
  { href: "/teachers", label: "Teachers", icon: GraduationCap, adminOnly: true },
  { href: "/accounts", label: "Accounts", icon: UserCog, adminOnly: true },
  { href: "/profile", label: "Profile", icon: UserRound },
];

function NavLinks({ profile, onNavigate }: { profile: Profile; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isStaff = profile.role === "admin" || profile.role === "teacher";
  return (
    <nav className="space-y-1">
      {nav
        .filter(
          (item) =>
            (!item.adminOnly || profile.role === "admin") &&
            (!item.staffOnly || isStaff),
        )
        .map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-brand-blue/15 text-white ring-1 ring-brand-cyan/25"
                  : "text-brand-muted hover:bg-white/5 hover:text-brand-text",
              )}
            >
              <Icon
                className={cn(
                  "h-4.5 w-4.5 shrink-0",
                  active ? "text-brand-cyan" : "text-brand-muted group-hover:text-brand-muted",
                )}
              />
              {label}
              {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-cyan" /> : null}
            </Link>
          );
        })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center" aria-label="ACADNEX dashboard">
      <BrandLogo size={38} showTagline={false} title="ACADNEX" />
    </Link>
  );
}

function UserCard({ profile }: { profile: Profile }) {
  return (
    <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-blue/20 text-xs font-semibold text-brand-cyan ring-1 ring-brand-blue/40">
          {initials(profile.full_name || profile.email)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{profile.full_name}</p>
          <p className="flex items-center gap-1 truncate text-[11px] text-brand-muted">
            {profile.role === "admin" ? (
              <ShieldCheck className="h-3 w-3 text-brand-cyan" />
            ) : profile.role === "teacher" ? (
              <GraduationCap className="h-3 w-3 text-emerald-400" />
            ) : (
              <Eye className="h-3 w-3 text-amber-400" />
            )}
            {profile.role === "admin"
              ? "Administrator"
              : profile.role === "teacher"
                ? "Teacher"
                : "Demo · view-only"}
          </p>
        </div>
      </div>
      <form action={signOut} className="mt-3">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs font-medium text-brand-muted ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </form>
    </div>
  );
}

export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-brand-border bg-[var(--brand-navy)] px-4 py-5 lg:flex">
        <Brand />
        <div className="mt-8 flex-1 overflow-y-auto">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-muted">
            Workspace
          </p>
          <NavLinks profile={profile} />
        </div>
        <UserCard profile={profile} />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-brand-border bg-[var(--brand-navy)]/95 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-white/10 p-2 text-brand-muted"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-[var(--brand-midnight)]/70"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-brand-border bg-[var(--brand-navy)] px-4 py-5">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-brand-muted hover:bg-white/5 hover:text-white"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-8 flex-1 overflow-y-auto">
              <NavLinks profile={profile} onNavigate={() => setOpen(false)} />
            </div>
            <UserCard profile={profile} />
          </div>
        </div>
      ) : null}

      <main className="lg:pl-64">
        {profile.role === "viewer" ? (
          <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-center text-xs font-medium text-amber-300 lg:px-8">
            <Eye className="mr-1.5 inline h-3.5 w-3.5" />
            Demo account — everything here is read-only. Sign in with a staff account to make changes.
          </div>
        ) : null}
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}