import Link from "next/link";
import { BrandLogo } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[var(--brand-midnight)] px-6 text-center">
      <BrandLogo />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--brand-accent)]">
          404 · Route not found
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--brand-text)]">
          This page isn&apos;t in the index
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-[var(--brand-muted)]">
          The link may be outdated. Return to your ACADNEX workspace to continue.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-lg bg-[var(--brand-blue)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Go to dashboard
      </Link>
    </main>
  );
}
