import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

/**
 * Server-only client using the secret key. Bypasses RLS, so never import this
 * from a Client Component. Used for admin-only user provisioning.
 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY is not configured");
  return createClient(SUPABASE_URL, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
