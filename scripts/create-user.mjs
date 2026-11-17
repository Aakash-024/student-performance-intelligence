/**
 * Creates a Supabase auth user (staff account) from the command line.
 *
 * Usage:
 *   node --env-file=.env.local scripts/create-user.mjs <email> <password> "<full name>" <role>
 *   role: admin | teacher | viewer   (default: teacher)
 *
 * The database trigger `handle_new_user` creates the matching profile row with
 * the chosen role. Requires SUPABASE_SECRET_KEY in .env.local.
 */

const [email, password, fullName, role = "teacher"] = process.argv.slice(2);

if (!email || !password) {
  console.error("Usage: node --env-file=.env.local scripts/create-user.mjs <email> <password> \"<full name>\" <role>");
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName || email, role },
});

if (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}

console.log(`Created ${email} (${fullName || email}) as ${role} — user id ${data.user.id}`);
