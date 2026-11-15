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

export async function requireAdmin() {
  const current = await requireUser();
  if (current.profile?.role !== "admin") redirect("/dashboard");
  return current;
}

export function displayName(profile: Profile | null | undefined) {
  return profile?.full_name || profile?.email || "Signed-in user";
}
