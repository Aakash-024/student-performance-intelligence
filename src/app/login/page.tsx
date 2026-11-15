import { GraduationCap, ShieldCheck, TrendingUp, Users } from "lucide-react";
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
      <section className="relative hidden overflow-hidden bg-slate-950 px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-24 h-96 w-96 rounded-full bg-indigo-500/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl"
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <GraduationCap className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-[0.2em] text-indigo-200">
                SPIP
              </p>
              <p className="text-sm text-slate-300">Student Performance Intelligence</p>
            </div>
          </div>

          <h1 className="mt-16 max-w-xl text-4xl font-semibold leading-tight tracking-tight">
            Turn raw marks and attendance into decisions that help students.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-300">
            One workspace for administrators and teachers: live analytics, assessment
            entry, attendance tracking, and downloadable student reports.
          </p>
        </div>

        <div className="relative mt-12 space-y-5">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <Icon className="h-4 w-4 text-indigo-200" />
              </span>
              <div>
                <p className="text-sm font-medium text-white">{title}</p>
                <p className="text-sm text-slate-400">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="relative mt-12 text-xs text-slate-500">
          Synthetic dataset · 150 students · 3 sections · 5 subjects · 2 semesters
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-indigo-600">
                SPIP
              </p>
              <p className="text-xs text-slate-500">Student Performance Intelligence</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Welcome back
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Sign in with your college account to continue.
          </p>

          <LoginForm next={next ?? "/dashboard"} />

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Demo accounts
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <p className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <span className="font-medium text-slate-700">Admin</span>
                <span className="font-mono text-xs text-slate-500">
                  admin@college.edu · Admin@123
                </span>
              </p>
              <p className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <span className="font-medium text-slate-700">Teacher</span>
                <span className="font-mono text-xs text-slate-500">
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
