/** Public showcase accounts. They are fixed, view-only, and never editable. */
export const DEMO_ACCOUNTS = ["admin@college.edu", "teacher@college.edu"] as const;

export function isDemoAccount(email: string | null | undefined): boolean {
  return !!email && DEMO_ACCOUNTS.includes(email.toLowerCase() as (typeof DEMO_ACCOUNTS)[number]);
}
