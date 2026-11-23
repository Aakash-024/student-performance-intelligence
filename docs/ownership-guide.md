# ACADNEX Ownership Guide

Welcome! This is the complete, beginner-friendly manual for your project — the ACADNEX
Academic Performance Intelligence Platform. It explains **every part**: how the app works, where
everything lives, how to change things, how to deploy, and how to fix problems.

You do not need prior web-development knowledge. Every term is explained the first time it
appears, and every explanation points at a **real file in this project** so you can open it and
see the concept in action.

**How to read this:** start with §1 once. After that, each section stands alone — jump to what
you need. In a hurry? [`quick-reference.md`](quick-reference.md) is the 2-minute card version.
The glossary at the end (§14) defines anything that sounds unfamiliar.

---

## Contents

1. [The big picture — how the pieces fit](#1-the-big-picture)
2. [Map of the project — what every folder is](#2-map-of-the-project)
3. [Server vs client components](#3-server-vs-client-components)
4. [How saving works — server actions](#4-how-saving-works--server-actions)
5. [Login, roles and permissions](#5-login-roles-and-permissions)
6. [The database and RLS — the real security guard](#6-the-database-and-rls)
7. [Migrations — changing the database safely](#7-migrations)
8. [Secrets and API keys](#8-secrets-and-api-keys)
9. [The AI layer](#9-the-ai-layer)
10. [The ML (machine learning) layer](#10-the-ml-layer)
11. [The data — where the numbers come from](#11-the-data)
12. [The audit logs — who did what](#12-the-audit-logs)
13. [Day-to-day operations](#13-day-to-day-operations)
14. [Glossary](#14-glossary)

---

## 1. The big picture

Three computers are involved:

```
┌──────────────┐      HTTPS      ┌────────────────────┐      ┌─────────────────────┐
│   Browser    │ ◄─────────────► │  Vercel runs the   │ ◄──► │  Supabase           │
│  (your       │                 │  Next.js app       │      │  • Auth (logins)    │
│   users')    │                 │  (the "server")    │      │  • Postgres (data)  │
└──────────────┘                 └────────────────────┘      │  • Row-level rules  │
                                                             └─────────────────────┘
```

- **Browser** — what your users see: Chrome/Edge/Firefox rendering the pages.
- **Vercel** — the hosting company. It runs the Next.js application code. Next.js is the
  framework the whole app is written in. Vercel is *also* connected to your GitHub repo: when
  code lands on the `master` branch, Vercel automatically builds and publishes it. That is a
  "deploy".
- **Supabase** — the backend-as-a-service. It stores ALL data in a Postgres database, handles
  the email/password logins (Auth), and — crucially — enforces permission rules **at the
  database level** (Row Level Security, "RLS", §6).

### What happens when someone opens the site

1. Browser asks Vercel for `https://student-performance-intelligence-chi.vercel.app/students`.
2. Vercel's server runs the page's code (`src/app/(app)/students/page.tsx`). That code:
   - checks who the visitor is (their login "cookie" — a small ID card the browser carries),
   - queries Supabase for the data (students, marks, attendance),
   - turns the answer into HTML and sends it back.
3. The browser displays the finished page. The user never talks to the database directly.

### What happens when someone saves something

Example: a teacher enters marks and clicks Save.

1. The browser calls a **server action** — a special function living in a `actions.ts` file
   (§4). In this case `saveMarks` in `src/app/(app)/assessments/actions.ts`.
2. The action runs **on Vercel**, re-checks permissions, validates the numbers, and writes to
   Supabase **as that logged-in user**.
3. Supabase applies its own rules (RLS) — if the teacher isn't assigned to that class, the
   database itself says "no" (error 42501).
4. If the write succeeded, the action also writes audit-log rows (§12) and the page refreshes.

**Why this matters:** the UI hiding a button is a convenience; the *database* rejecting a bad
write is the real security. Both layers exist (§6).

---

## 2. Map of the project

| Path | What it is |
|---|---|
| `src/app/(app)/…` | **All the pages.** One folder per page: `students/`, `terms/`, `subjects/`, `enrollments/`, `assessments/`, `attendance/`, `analytics/`, `dashboard/`, `activity/`, `accounts/`, `teachers/`, `import/` |
| `src/app/login/` | The login page (outside the `(app)` group because it has no sidebar) |
| `src/app/api/import/template/route.ts` | The one API route — serves the downloadable CSV templates |
| `src/app/layout.tsx` | The outermost HTML wrapper (fonts, global CSS) |
| `src/proxy.ts` | The "gatekeeper": refreshes login cookies and bounces logged-out visitors to `/login` |
| `src/components/` | Reusable UI pieces: `ui.tsx` (cards, badges, tables), `app-shell.tsx` (the dark sidebar), `charts.tsx`, `report-button.tsx` (PDF), `ai-insight-panel.tsx`, `ml-forecast-card.tsx` |
| `src/lib/` | Shared logic: `auth.ts` (permission helpers), `data.ts` (all database queries), `csv.ts` (the CSV parser), `activity.ts` (audit logging), `types.ts` (TypeScript shapes), `utils.ts` |
| `src/lib/supabase/` | The three ways to connect to Supabase (§6.4) |
| `src/lib/ai/` | The AI agent (§9) |
| `src/lib/ml/` | The prediction model + `model.json` (§10) |
| `supabase/migrations/` | Numbered database changes `001…013` (§7) |
| `scripts/` | Command-line helpers: `create-user.mjs`, `seed.mjs`, `preview-report.mjs`, `ml/train.py` |
| `data/` | The synthetic dataset generator and CSVs (§11) |
| `docs/` | This guide + `configurable-academics.md` (design decisions) |
| `README.md` | Setup instructions for a fresh machine |

**Naming pattern inside a page folder** — this is the most important habit to learn:

- `page.tsx` — the visible page (server component).
- `actions.ts` — the save/change functions for that page (`"use server"`).
- `something-form.tsx` — the interactive form(s) (client component).

Look at `src/app/(app)/terms/` as the cleanest example: `page.tsx` + `actions.ts` + `term-form.tsx`.

---

## 3. Server vs client components

React (the UI library Next.js uses) has two kinds of code, and knowing which is which answers
most "where does this live?" questions.

### Server components — the default

Run **on Vercel**, every time the page is requested. They can read the database directly, but
they cannot respond to clicks or typing.

Real example — the top of `src/app/(app)/students/page.tsx`:

```tsx
export default async function StudentsPage({ searchParams }) {
  const { user, profile } = await requireUser();          // who is visiting?
  const supabase = await createClient();                  // DB connection as that user
  const [sections, students] = await Promise.all([        // two queries at once
    getSections(supabase),
    getStudentOverview(supabase, { ... }),
  ]);
  // ...then returns HTML (JSX)
}
```

Everything with `async`/`await` + JSX that doesn't say `"use client"` is a server component.

### Client components — interactive islands

Run **in the browser**. The file starts with `"use client"`. They handle typing, clicks,
dropdown state. They cannot talk to the database directly — they call server actions instead.

Real example — `src/app/(app)/students/student-form.tsx` starts with `"use client"` and uses
`useActionState` (§4) to show "Saving…" and error/success messages.

### Layouts and the route group

- `src/app/(app)/layout.tsx` wraps **every page inside `(app)/`** with the dark sidebar
  (`AppShell`). The parentheses in `(app)` mean "this folder is for grouping only, don't put it
  in the URL". So `(app)/students/page.tsx` is simply the URL `/students`.
- `src/app/login/` sits outside that group, so the login page has no sidebar.

### The small-state pattern (important!)

Every save action in this project returns a **tiny object** like `{ success: "…" }` or
`{ error: "…" }` instead of redirecting or re-rendering the page itself. The form then calls
`useRefreshOnSuccess` (`src/components/use-refresh-on-success.ts`), which asks the browser to
re-fetch the page (`router.refresh()`).

**Why so roundabout?** On Vercel's production servers there is a known bug
(vercel/next.js#95714) where action responses that carry a full page re-render can hang forever
— the save commits but the browser never hears back. Returning a tiny value avoids the bug
reliably. **Do not "modernise" this pattern** — it's deliberate. The full story is also in the
README.

---

## 4. How saving works — server actions

A **server action** is a function marked with `"use server"` that the browser can call like a
normal function, but which executes on the server.

The anatomy of every edit form (this exact trio appears in every page folder):

1. **`actions.ts`** — the function that validates + writes:

```ts
// src/app/(app)/terms/actions.ts  (simplified)
"use server";

export async function createTerm(_prev, formData): Promise<FormState> {
  const { user, profile } = await requireStaff();      // 1. who are you? staff only
  const input = readInput(formData);                    // 2. pull values out of the form
  const problem = validate(input);                      // 3. check them yourself — never trust the browser
  if (problem) return { error: problem };

  const supabase = await createClient();
  const { error } = await supabase.from("academic_terms").insert({ ... });  // 4. write
  if (error) return { error: friendlyError(error) };

  await logActivity(supabase, { ... });                 // 5. audit trail (§12)
  return { success: `${input.name} created.` };
}
```

2. **`term-form.tsx`** — the client form wired to it:

```tsx
"use client";
const [state, action, pending] = useActionState(createTerm, {});
// `state`   → whatever the action returned ({ error } / { success })
// `action`  → put on <form action={action}>
// `pending` → true while saving; use it to disable the button
```

3. **The page** renders the form (hidden for read-only viewers, §5).

### Server actions vs API routes

| | Server action (`actions.ts`) | API route (`route.ts`) |
|---|---|---|
| Runs on | Vercel | Vercel |
| Called by | Your own forms/components | Any HTTP client (browser, curl, another app) |
| Use for | Every mutation in this app | Downloads/feeds; the only one here is the **CSV template** download |

---

## 5. Login, roles and permissions

### The login itself

Passwords live in **Supabase Auth** — your app never sees or stores a password. The flow:

1. `src/proxy.ts` (Next.js's gatekeeper, runs before every request) checks whether the request
   carries a valid login cookie. If not → redirect to `/login`.
2. `/login` (`src/app/login/`) collects email + password and calls the `signIn` server action,
   which asks Supabase Auth to verify. On success Supabase sets the cookie that `proxy.ts`
   looks for.
3. Every page/action re-checks identity via helpers in `src/lib/auth.ts`:

| Helper | Meaning | Used by |
|---|---|---|
| `requireUser()` | Any signed-in account | All pages (read) |
| `requireStaff()` | Admin **or** teacher (not viewer) | **Every action that writes data** |
| `requireAdmin()` | Admin only | `/accounts`, `/teachers` pages and their actions |

### Roles — one field that controls everything

The `profiles` table (one row per login) has a `role` column: `admin`, `teacher` or `viewer`.

- **admin** — full control, including creating accounts.
- **teacher** — edits structure anywhere, enters marks/attendance **only for classes assigned
  to them** (`teacher_assignments` table, managed on the `/teachers` page).
- **viewer** — read-only. The two public demo accounts are locked to this role.

A database trigger `handle_new_user` (migration 001) creates the profile automatically when an
account is created, reading `full_name` and `role` from the account's metadata — that's why the
Accounts page can set the role at creation time. A second trigger, `protect_profile_role`
(migration 003), stops anyone but an admin from changing a role, so a user can't promote
themselves.

### Creating accounts

Two ways (both need the secret key, §8):

- **Accounts page** (`/accounts`, admin only) — the normal way. Also resets passwords and
  changes roles. The two demo accounts are hard-locked against edits.
- **Command line** — `node --env-file=.env.local scripts/create-user.mjs <email> <password> "Full Name" <role>`.

---

## 6. The database and RLS

### The data model in one screen

```
departments ──< sections ──< students
     │              │              │
     └──< subjects ─┴─< enrollments >── academic_terms
                       │
assessments (subject + term, type cat1/cat2/semester) ──< marks >── students
attendance_sessions (subject+section+term+date) ──< attendance_records >── students
teacher_profiles ──< teacher_assignments (which teacher teaches which subject×section×term)
profiles (one per login: email, full_name, role)
audit tables: mark_audit, activity_log, ai_insights
```

Reading: `departments ──< sections` means one department has many sections. `enrollments` is
the "which student takes which subject in which term" link table.

### RLS — Row Level Security

**Row Level Security** is Postgres's built-in rule engine: every query runs "as" the logged-in
user, and Supabase checks each row against **policies** before allowing it. This is why a
teacher's own password is enough protection — even if someone bypassed the entire website and
called the database API directly, the database would still enforce the rules.

The policies live in `supabase/migrations/002_rls_policies.sql` (+ updates in later
migrations). Three helper functions do the heavy lifting:

- `public.is_admin()` — "is the current user an admin?"
- `public.get_user_role()` — returns the user's role from `profiles`.
- `public.teacher_has_assignment(subject_id, section_id)` — "does this teacher teach this
  subject to this section (in any term)?"

Example policy, real syntax:

```sql
CREATE POLICY "marks_insert_teacher_or_admin"
    ON public.marks FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR (
            public.get_user_role() = 'teacher'
            AND EXISTS ( ...teacher_has_assignment... )   -- only their classes
        )
    );
```

**To write a new policy:** copy an existing one in the most recent migration that touches the
table, change the table/action, and follow the same shape: `SELECT → USING (…)`,
`INSERT/UPDATE → WITH CHECK (…)`. Pattern used throughout this project:

| Table | Read | Write |
|---|---|---|
| Structure (terms, subjects, assessments, enrolments, students) | any signed-in user | admin or teacher |
| Marks, attendance | any signed-in user | teacher **only for assigned classes**, admin anywhere |
| Accounts (`profiles`), `teacher_profiles` | any signed-in user | admin only |
| Audit tables | staff | staff, only as themselves; never editable after writing |

### The three Supabase clients

This is a common source of confusion, so here is the full truth:

| File | Key used | Runs as | Where used |
|---|---|---|---|
| `src/lib/supabase/server.ts` | publishable (anon) key | **the logged-in user** — RLS applies | every page and action |
| `src/lib/supabase/admin.ts` | **secret key** | bypasses ALL rules | creating accounts, resetting passwords, `seed` |
| `src/lib/supabase/client.ts` | publishable key | the browser user | rare; browser-side bits |

Rule of thumb: the app's normal work always goes through the **server** client so RLS protects
you. The admin client is a master key — treat it like a bank card and never import it into
anything user-facing.

---

## 7. Migrations

A **migration** is a numbered SQL file describing one change to the database (new table, new
policy, new column). Running it applies the change. They exist so the database's shape is
written down and reproducible on a fresh project.

Your migration history (in `supabase/migrations/`):

| # | File | What it did |
|---|---|---|
| 001 | `001_core_schema.sql` | All tables + the auto-profile trigger |
| 002 | `002_rls_policies.sql` | The original permission rules + helper functions |
| 003 | `003_teacher_assignments.sql` | Teacher→class assignments + marks/attendance scoping |
| 004 | `004_analytics_views.sql` | Read-only `v_*` views that feed the dashboards |
| 005 | `005_assessment_summary.sql` | Per-assessment coverage summaries |
| 006 | `006_ai_insights.sql` | AI audit table |
| 007 | `007_mark_audit.sql` | Mark-correction audit trail |
| 008 | `008_configurable_terms.sql` | 8-semester support; staff can edit terms |
| 009 | `009_configurable_subjects_enrollments.sql` | Editable subjects + enrolment matrix |
| 010 | `010_assessment_types.sql` | CAT 1 / CAT 2 / Semester only |
| 011 | `011_staff_students_csv.sql` | Teachers can create/edit students |
| 012 | `012_viewer_role.sql` | Read-only `viewer` role; demo accounts locked |
| 013 | `013_activity_log.sql` | General "who did what" activity log |

**To apply a migration** (production database, ref `ugrjjrfszjkspjndkizi`):

```bash
supabase db query --remote=ugrjjrfszjkspjndkizi --yes -f supabase/migrations/014_your_change.sql
```

(The CLI sometimes exits with an error code even after succeeding — always verify with a
`SELECT`.) Alternatively, paste the SQL into Supabase Dashboard → SQL Editor and run it there.
Either way: **never edit an old migration file** — add a new numbered one.

**To create one:** add `supabase/migrations/014_descriptive_name.sql`, write SQL, apply it,
commit the file with your code changes.

---

## 8. Secrets and API keys

| Variable | Lives in | Reaches the browser? | What it's for |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` + Vercel | **Yes** (`NEXT_PUBLIC_` prefix means public by design) | Where the database is |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` + Vercel | **Yes** | The "public ID" key; safe because RLS enforces permissions |
| `SUPABASE_SECRET_KEY` | `.env.local` + Vercel | **Never** | Master key — creates accounts, resets passwords, seeds data |
| `GROQ_API_KEY` | `.env.local` + Vercel | **Never** | Calls the AI model (Groq hosts a free LLM API) |

Key facts:

- `NEXT_PUBLIC_*` variables are **deliberately public** — seeing them is not a leak.
- `SUPABASE_SECRET_KEY` and `GROQ_API_KEY` are **server-only** (no prefix). They live in
  `.env.local` on your machine and in Vercel → Project → Settings → Environment Variables.
  If a value with no `NEXT_PUBLIC_` prefix ever shows up in browser code, that's a bug.
- **If a secret leaks:** rotate it (Supabase Dashboard → Settings → API → rotate keys; Groq
  console → regenerate), then update `.env.local` and Vercel, then redeploy. Old keys stop
  working immediately after rotation.
- The repo contains **no secrets** — `.env.local` is git-ignored.

---

## 9. The AI layer

`src/lib/ai/` contains one AI agent: the **Student Risk Analysis Agent**. On a student's page,
staff can click "Generate insight" and get a paragraph explaining the student's situation.

How a run works (all in code you can read):

1. `context.ts` — builds an **evidence pack**: the student's marks, attendance, term history.
   It queries through the logged-in user's client, so the AI can never see more than the
   person asking is allowed to see.
2. `prompts.ts` — the instructions sent to the model, including rules like "advisory only",
   "no medical diagnoses", "ground every claim in the evidence".
3. `provider.ts` — sends the request to Groq (an LLM API provider) using `GROQ_API_KEY`.
4. `agents/risk-analysis.ts` — orchestrates the above and validates the response shape.
5. `audit.ts` — appends a row to `ai_insights`: who ran it, which model, what was asked,
   what was answered (§12).

**Safety principles baked in:** the AI only *advises* (it writes nothing to academic tables),
it's always shown alongside the deterministic rule-based indicator, and every run is audited.

**To change the AI's behaviour:** edit `prompts.ts` and test on a student page. Keep the
"ground claims in evidence" instruction — that's what stops the model from inventing facts.

---

## 10. The ML layer

A small **regression model** predicts a student's next-term percentage. Where things live:

- `src/lib/ml/features.ts` — turns a student's history into **8 numbers** (features): CAT
  scores, attendance, term-over-term change, etc.
- `src/lib/ml/model.json` — the trained model, a plain file checked into the repo.
- `src/lib/ml/predict.ts` — loads `model.json` and computes a prediction in the browser code
  path (no network call — the model runs locally).
- `scripts/ml/train.py` — the Python training script (runs on your machine, not on Vercel).

**The golden rule:** `FEATURE_LABELS` in `features.ts` and `FEATURE_NAMES` in `train.py` must
list the **same features in the same order**. Change one → change both → retrain:

```bash
python scripts/ml/train.py     # rewrites src/lib/ml/model.json
```

**Reading the metrics** the script prints (they also appear in the app's model card):

- **MAE** (mean absolute error) ≈ 4.8 — predictions are off by about 4.8 marks on average.
- **RMSE** ≈ 5.8 — like MAE but punishes big misses more.
- **R²** ≈ 0.74 — how much of the variation the model explains (1.0 = perfect).
- **AUC** ≈ 0.98 — how well the risk/no-risk classification separates students (1.0 = perfect).

Cross-validation ("CV") numbers are more trustworthy than a single train/test split because
they average over multiple splits of the data.

---

## 11. The data

All the numbers in the demo come from a **synthetic dataset** — fake-but-realistic data
generated by `data/generate_data.py` (deterministic: same seed → same data every time).

- Source CSVs live in `data/generated/` (`students.csv`, `marks.csv`, `enrollments.csv`, …).
  The demo has 150 students, 30 assessments and 4,500 marks.
- **All three exam types are out of 100.** The generator sets `max_marks = 100` for
  `cat1`, `cat2` and `semester`; marks are generated directly on a 0–100 scale. The
  progress-report PDF (`src/lib/progress-report.ts`) reads `maxMarks` from the
  assessment and prints `subject.marks` unchanged. There is deliberately **no
  conversion or re-scaling** in the generator, seed, report, analytics or ML code.
  Weightage (25 / 25 / 50 in the demo) is a separate concept from the mark scale.
- `npm run seed` (which runs `scripts/seed.mjs`) **wipes the academic tables** and reloads the
  CSVs into Supabase using the secret key. It does not touch accounts.
- To regenerate different fake data: edit `data/generate_data.py`, run it, then reseed.

⚠️ Reseeding destroys real marks. Don't run it once real college data is loaded.

**Loading your real college data:** use the Import page (students and marks) — see §13's
operations manual, or `docs/configurable-academics.md` for the exact column formats.

---

## 12. The audit logs

Three append-only tables (append-only = rows can be added, never edited or deleted — enforced
by the database having **no** update/delete policies):

| Table | Records | Where you see it |
|---|---|---|
| `activity_log` (013) | Every write through the app: who, when, what, before/after JSON | **Activity page** (`/activity`) |
| `mark_audit` (007) | Every *changed* mark: old value → new value, who, when | Each assessment's "Correction history" card |
| `ai_insights` (006) | Every AI agent run: who, model, prompt/answer summaries | Database (Supabase table editor) |

Design details that matter:

- Names are **copied into** the log rows (`actor_name`, `entity_label`) so entries stay
  readable even after the referenced student/subject/account is deleted.
- Logging is **best-effort** (`src/lib/activity.ts`, `src/lib/ai/audit.ts`): if a log write
  fails, the user's actual save still succeeds and the failure is printed to the server logs.
  Never "fix" this by making logs mandatory — a logging outage must not block teaching.

---

## 13. Day-to-day operations

### The workflow for any change (memorise this)

```bash
# 1. start from the latest master
git checkout master
git pull origin master

# 2. make a branch — one branch per feature/fix
git checkout -b feature/whatever-this-is

# 3. do the work, then check it compiles and is clean
cmd /c "npm run typecheck"
cmd /c "npm run lint"

# 4. save and publish the branch
git add -A
git commit -m "feat: what it does"
git push -u origin feature/whatever-this-is

# 5. open a Pull Request on GitHub (PR = "please review and merge this branch")

# 6. merge the PR on github.com → Vercel automatically deploys master

# 7. verify on https://student-performance-intelligence-chi.vercel.app
```

Every feature so far was built exactly this way (see the closed PRs on GitHub as examples).

### Commands cheat sheet

| Command | Does |
|---|---|
| `cmd /c "npm run dev"` | Run the site locally at http://localhost:3000 (live data!) |
| `cmd /c "npm run typecheck"` | TypeScript check — catches type errors before deploy |
| `cmd /c "npm run lint"` | Style/bug checks (1 pre-existing `app-shell.tsx` error is known) |
| `cmd /c "npm run seed"` | Reload the synthetic demo data (⚠️ wipes academic tables) |
| `node --env-file=.env.local scripts/create-user.mjs <email> <pass> "Name" <role>` | Create an account from the terminal |
| `supabase db query --remote=ugrjjrfszjkspjndkizi --yes -f <file.sql>` | Apply a migration |
| `node scripts/preview-report.mjs out.pdf` | Render a sample progress-report PDF |

(PowerShell blocks `npm.ps1`, so prefix with `cmd /c`.)

### When something breaks

| Symptom | Look at |
|---|---|
| Page errors / 500s | Vercel → your project → Deployments → latest → **Runtime Logs** |
| Data looks wrong | Supabase → Table Editor — inspect the actual rows |
| "Failed to find Server Action" after a deploy | Users have a stale page open — refresh the browser |
| `42501` permission errors | RLS refused the write — usually correct behaviour; check `teacher_assignments` |
| Login loops | Supabase → Authentication → URL Configuration: the deployed domain must be in the redirect allow-list |
| New env var not taking effect | Vercel env vars apply to **new** deployments — redeploy |

### Recipe: add a new page (the full pattern)

Say you want a "Notices" page where staff post announcements:

1. **Database** — add migration `014_notices.sql`: create the table + RLS (staff write,
   everyone read) + apply it.
2. **Types** — add a `Notice` interface to `src/lib/types.ts`.
3. **Query** — add `getNotices(supabase)` to `src/lib/data.ts` (copy an existing getter).
4. **Folder** — create `src/app/(app)/notices/` with:
   - `page.tsx` — server component: `requireUser()`, fetch with `getNotices`, render list with
     `<Card>`/`<PageHeader>` from `src/components/ui.tsx`. Hide the form for viewers
     (`canEdit = profile?.role !== "viewer"`, show `<ReadOnlyNote>` otherwise).
   - `actions.ts` — `createNotice` / `deleteNotice` with `requireStaff()`, validation, and
     `logActivity(...)` calls.
   - `notice-form.tsx` — `"use client"`, `useActionState`, `useRefreshOnSuccess`.
5. **Nav** — add an entry to the `nav` array in `src/components/app-shell.tsx`
   (`staffOnly: true` if viewers shouldn't see it).
6. `typecheck` + `lint` + try it on `npm run dev` → branch → PR → merge.

That's every step any feature in this app followed.

---

## 14. Glossary

| Term | Plain meaning |
|---|---|
| **Deploy** | Publishing a new version of the app to the live URL |
| **Commit** | A saved snapshot of code changes; pushed to GitHub |
| **Branch / PR** | A side copy of the code for one piece of work; a Pull Request asks GitHub to merge it into `master` |
| **Server** | The computer (Vercel's) that runs the app and talks to the database |
| **Server action** | A function that looks local to the form but executes on the server |
| **API** | A URL a program can call to get or send data |
| **Cookie** | A small ID card the browser carries; here it holds the login session |
| **Postgres** | The database engine (via Supabase) storing all rows |
| **RLS** | Row Level Security — permission rules the database itself enforces |
| **Migration** | A numbered SQL file describing one database change |
| **RLS policy** | One rule inside RLS ("teachers may insert marks for their classes") |
| **Trigger** | Database code that runs automatically on a row change (e.g. create a profile on signup) |
| **View** | A saved query that behaves like a read-only table (`v_*` here) |
| **Secret key** | Supabase's master key; bypasses all rules; server-only |
| **LLM** | Large language model — the "AI" text generator (hosted by Groq here) |
| **Feature (ML)** | One numeric input to the prediction model (e.g. attendance %) |
| **MAE / RMSE / R² / AUC** | Standard accuracy scores for the ML model (§10) |
| **Audit log** | An append-only record of who changed what, and when |

---

*Written November 2026, matching `master` at commit `9cb4c59`. When the code changes, update
the section that describes it — this guide works only as long as it stays honest.*
