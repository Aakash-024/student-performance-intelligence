"use client";

import { useEffect } from "react";
import { BrandMark } from "@/components/brand";

/** Next.js 16 calls the recovery callback `retry` (not the older `reset`). */
export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error("ACADNEX route error", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-navy)] p-8 text-center shadow-2xl">
        <div className="mx-auto w-fit">
          <BrandMark size={44} />
        </div>
        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--brand-accent)]">
          System notice
        </p>
        <h1 className="mt-2 text-xl font-semibold text-[var(--brand-text)]">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--brand-muted)]">
          This screen could not be loaded. Your saved academic data is safe — try
          again, or refresh the page.
        </p>
        <button
          type="button"
          onClick={retry}
          className="mt-6 rounded-lg bg-[var(--brand-blue)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
