"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Refreshes the surrounding server components whenever a server action
 * reports success.
 *
 * Mutating actions return a tiny state object on purpose: on production
 * builds, action responses that carry revalidatePath re-renders (or a redirect
 * to a large page) can hang open (vercel/next.js#95714) — the write commits,
 * but useActionState stays pending forever. The client-side refresh is a
 * normal RSC GET, which completes reliably, and every app page renders
 * dynamically so it always reads live data.
 */
export function useRefreshOnSuccess(state: { success?: string } | null | undefined) {
  const router = useRouter();
  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);
}