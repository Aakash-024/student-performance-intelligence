# ACADNEX — Quick Reference (the 2-minute version)

Full explanations live in [`docs/ownership-guide.md`](ownership-guide.md). This is the card you
keep open while working.

---

## The whole app in 3 lines

1. **Browser** shows pages → **Vercel** runs the Next.js app (`src/`) → **Supabase** stores all
   data and enforces permissions (RLS).
2. Pages live in `src/app/(app)/<name>/page.tsx`. Saves go through `actions.ts` (same folder).
   Interactive forms are `<name>-form.tsx` starting with `"use client"`.
3. Merge to `master` → Vercel auto-deploys. Push to any other branch → nothing goes live.

## Who can do what

| Role | Sees | Can change |
|---|---|---|
| **admin** | Everything | Everything (incl. Accounts page) |
| **teacher** | Their assigned classes' students | Structure everywhere; marks/attendance only for their classes |
| **viewer** (demo) | Everything | **Nothing** — locked in DB and UI |

**All exams are out of 100.** CAT 1, CAT 2 and Semester all use a 0–100 mark scale. The
report prints the recorded mark as-is — there is no conversion anywhere. Weights
(25 / 25 / 50) are separate from the 100-mark scale.

Demo logins: `admin@college.edu / Admin@123`, `teacher@college.edu / Teacher@123` (view-only).
Your admin login: the one you created on the Accounts page.

## The workflow for any change (memorise)

```bash
git checkout master && git pull origin master
git checkout -b feature/my-change
# ...edit code...
cmd /c "npm run typecheck"        # must pass
cmd /c "npm run lint"             # 1 known pre-existing error in app-shell.tsx is OK
git add -A && git commit -m "feat: what it does"
git push -u origin feature/my-change
#  → open PR on github.com → merge → Vercel auto-deploys → verify live site
```

## Every day commands

| Command | Does |
|---|---|
| `cmd /c "npm run dev"` | Run locally at localhost:3000 (uses LIVE database) |
| `cmd /c "npm run typecheck"` | Check code compiles |
| `cmd /c "npm run seed"` | ⚠️ Reset demo data (wipes marks) |
| `node --env-file=.env.local scripts/create-user.mjs <email> <pass> "Name" <role>` | New account via terminal |
| `supabase db query --remote=ugrjjrfszjkspjndkizi --yes -f <file.sql>` | Apply a database migration |

## Adding a page/feature — the 6 steps

1. **Migration** `0XX_name.sql` (table + RLS) → apply with the supabase command.
2. **Type** in `src/lib/types.ts`.
3. **Query** in `src/lib/data.ts`.
4. **Folder** `src/app/(app)/<name>/`: `page.tsx` + `actions.ts` + `<name>-form.tsx`
   (copy the `terms/` folder as the template — it's the cleanest example).
5. **Nav item** in `src/components/app-shell.tsx`.
6. typecheck → branch → PR → merge.

Every write action must: `requireStaff()`, validate inputs, and `logActivity(...)`.

## When something breaks

| Symptom | Fix / look at |
|---|---|
| Error page / 500 | Vercel → Deployments → Runtime Logs |
| `42501` errors | RLS said no — check `teacher_assignments`; usually correct behaviour |
| Login loop | Supabase → Auth → URL Configuration: add the deployed domain |
| "Failed to find Server Action" | Stale browser tab after deploy — refresh |
| New env var ignored | Redeploy — env vars apply only to new deployments |

## Keys

- `NEXT_PUBLIC_*` = safe in browser. `SUPABASE_SECRET_KEY` + `GROQ_API_KEY` = server-only.
- Live in `.env.local` (local) and Vercel → Settings → Environment Variables (Production + Preview).
- Leaked? Rotate in the provider's dashboard → update both places → redeploy.

## Golden rules

1. Never push code straight to `master` — branch, PR, merge.
2. Never trust the browser — every action re-checks permissions and validates.
3. Audit logs (`activity_log`, `mark_audit`) are append-only. Never weaken them.
4. `features.ts` ↔ `ml/train.py` must list the same features, or retrain.
5. `npm run seed` destroys marks — never once real data is loaded.
6. Every exam is out of 100 — never add a conversion factor to marks or reports.
