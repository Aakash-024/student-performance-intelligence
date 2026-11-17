import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return { user, profile };
});

export async function requireUser() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  return current;
}

/**
 * Admins and teachers may write data. Viewers (the public demo accounts) are
 * read-only: every mutating server action calls this so a viewer is bounced
 * back to the dashboard even if they post a crafted request.
 */
export async function requireStaff() {
  const current = await requireUser();
  if (current.profile?.role !== "admin" && current.profile?.role !== "teacher") {
    redirect("/dashboard");
  }
  return current;
}

export async function requireAdmin() {
  const current = await requireUser();
  if (current.profile?.role !== "admin") redirect("/dashboard");
  return current;
}

export function displayName(profile: Profile | null | undefined) {
  return profile?.full_name || profile?.email || "Signed-in user";
}
