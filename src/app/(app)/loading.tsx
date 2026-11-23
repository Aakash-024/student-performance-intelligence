import { BrandMark } from "@/components/brand";

/** Route-level loading state for every signed-in ACADNEX screen. */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6">
      <BrandMark size={48} className="animate-pulse" />
      <div className="text-center">
        <p className="text-sm font-semibold tracking-[0.18em] text-[var(--brand-text)]">
          ACADNEX
        </p>
        <p className="mt-1.5 text-xs text-[var(--brand-muted)]">
          Loading academic intelligence…
        </p>
      </div>
      <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-28 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-navy)]"
          />
        ))}
      </div>
    </div>
  );
}
