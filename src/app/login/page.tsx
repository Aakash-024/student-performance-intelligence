import { ShieldCheck, TrendingUp, Users } from "lucide-react";
import { BrandEyebrow, BrandLogo } from "@/components/brand";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

const features = [
  {
    icon: TrendingUp,
    title: "Rule-based early warnings",
    body: "Spot at-risk, declining, and improving students before the exam does.",
  },
  {
    icon: Users,
    title: "Class-scoped teaching",
    body: "Teachers only enter marks and attendance for classes they are assigned.",
  },
  {
    icon: ShieldCheck,
    title: "Enforced in the database",
    body: "Row-level security backs every screen — not just the UI.",
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden border-r border-brand-border bg-[var(--brand-navy)] px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-24 h-96 w-96 rounded-full bg-brand-blue/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-brand-cyan/10 blur-3xl"
        />

        <div className="relative">
          <BrandLogo size={44} />

          <div className="mt-14">
            <BrandEyebrow>Academic performance intelligence</BrandEyebrow>
          </div>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-tight tracking-tight">
            Turn raw marks and attendance into decisions that help students.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-brand-muted">
            One workspace for administrators and teachers: live analytics, assessment
            entry, attendance tracking, and downloadable student reports — every number
            read straight from your institution&apos;s database.
          </p>
        </div>

        <div className="relative mt-12 space-y-5">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 ring-1 ring-brand-cyan/20">
                <Icon className="h-4 w-4 text-brand-cyan" />
              </span>
              <div>
                <p className="text-sm font-medium text-white">{title}</p>
                <p className="text-sm text-brand-muted">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="relative mt-12 text-xs text-brand-muted">
          Synthetic demo dataset · 150 students · 3 sections · 5 subjects · 2 semesters
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center lg:hidden">
            <BrandLogo size={40} />
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-brand-text">
            Welcome back
          </h2>
          <p className="mt-1.5 text-sm text-brand-muted">
            Sign in with your institution account to continue.
          </p>

          <LoginForm next={next ?? "/dashboard"} />

          <div className="brand-panel mt-8 rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
              Demo accounts
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <p className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
                <span className="font-medium text-brand-text">Admin</span>
                <span className="font-mono text-xs text-brand-muted">
                  admin@college.edu · Admin@123
                </span>
              </p>
              <p className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
                <span className="font-medium text-brand-text">Teacher</span>
                <span className="font-mono text-xs text-brand-muted">
                  teacher@college.edu · Teacher@123
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
