"use server";

import { requireAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { isDemoAccount } from "@/lib/demo-accounts";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  success?: string;
}

const ROLES = ["admin", "teacher", "viewer"] as const;

const ROLE_LABEL: Record<(typeof ROLES)[number], string> = {
  admin: "Administrator",
  teacher: "Teacher",
  viewer: "Demo viewer (read-only)",
};

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * createAdminClient throws when the secret key is missing; the Accounts page
 * should explain the fix instead of crashing, so wrap it once here.
 */
function adminClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

function missingKeyError() {
  return {
    error:
      "SUPABASE_SECRET_KEY is not configured on this deployment, so accounts cannot be managed from the app. Add it in Vercel (Production, Preview and Development) and redeploy.",
  };
}

/**
 * Creates a Supabase auth user with a password chosen by the admin. The
 * database trigger (`handle_new_user`) turns the new auth user into a profile
 * row, picking up full_name and role from user_metadata.
 */
export async function createAccount(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const { user, profile } = await requireAdmin();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "teacher");

  if (!fullName) return { error: "Full name is required." };
  if (!validEmail(email)) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!ROLES.includes(role as (typeof ROLES)[number])) return { error: "Choose a valid role." };

  const admin = adminClient();
  if (!admin) return missingKeyError();

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already been registered") || error.message.toLowerCase().includes("already exists")) {
      return { error: `An account with ${email} already exists.` };
    }
    return { error: error.message };
  }

  const actor = { id: user.id, name: profile?.full_name || profile?.email || user.id };
  await recordAccountActivity(
    "account.create",
    `Created ${ROLE_LABEL[role as (typeof ROLES)[number]]} account for ${email}.`,
    { email, role, full_name: fullName },
    actor,
  );

  return { success: `${fullName} (${email}) can now sign in as ${ROLE_LABEL[role as (typeof ROLES)[number]]}.` };
}

/** Shared activity-log write using the signed-in admin's own client. */
async function recordAccountActivity(
  action: string,
  summary: string,
  details: Record<string, unknown>,
  actor: { id: string; name: string },
) {
  const supabase = await createClient();
  await logActivity(supabase, {
    actorId: actor.id,
    actorRole: "admin",
    actorName: actor.name,
    action,
    entityType: "account",
    entityLabel: details.email as string,
    summary,
    details,
  });
}

export async function resetPassword(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const { user, profile } = await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  const email = String(formData.get("email") ?? "").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!userId) return { error: "Missing account." };
  if (isDemoAccount(email)) {
    return { error: "Demo accounts keep their public showcase password — they cannot be changed here." };
  }
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const admin = adminClient();
  if (!admin) return missingKeyError();

  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };

  await recordAccountActivity(
    "account.reset_password",
    `Reset the password for ${email}.`,
    { email },
    { id: user.id, name: profile?.full_name || profile?.email || user.id },
  );

  return { success: `Password updated for ${email}.` };
}

export async function updateRole(
  _prev: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const { user, profile: currentProfile } = await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  const email = String(formData.get("email") ?? "").toLowerCase();
  const role = String(formData.get("role") ?? "");

  if (!userId) return { error: "Missing account." };
  if (isDemoAccount(email)) {
    return { error: "Demo accounts are fixed view-only showcases — their role cannot be changed." };
  }
  if (userId === currentProfile?.id) {
    return { error: "You cannot change your own role — that could lock you out of admin." };
  }
  if (!ROLES.includes(role as (typeof ROLES)[number])) return { error: "Choose a valid role." };

  const admin = adminClient();
  if (!admin) return missingKeyError();

  // Uses the secret-key client: bypasses RLS, and the profile-role trigger
  // explicitly allows service_role to change roles.
  const { data: beforeRow } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) return { error: error.message };

  await recordAccountActivity(
    "account.role_change",
    `Changed ${email} from ${ROLE_LABEL[(beforeRow?.role as (typeof ROLES)[number]) ?? "teacher"]} to ${ROLE_LABEL[role as (typeof ROLES)[number]]}.`,
    { email, from: beforeRow?.role ?? null, to: role },
    { id: user.id, name: currentProfile?.full_name || currentProfile?.email || user.id },
  );

  return { success: `${email} is now ${ROLE_LABEL[role as (typeof ROLES)[number]]}.` };
}