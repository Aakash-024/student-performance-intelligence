# Student Performance Intelligence Platform (SPIP)

A full-stack academic analytics platform for engineering colleges. Administrators manage the
academic structure and staff; teachers enter marks and attendance for the classes assigned to them;
everyone sees live, rule-based performance analytics and can download a professional PDF student
report.

> **New maintainer?** Start with [`docs/ownership-guide.md`](docs/ownership-guide.md) — a complete
> beginner-friendly manual for this project: how it works, how to change it, how to deploy it.
> In a hurry? [`docs/quick-reference.md`](docs/quick-reference.md) is the 2-minute version.

Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, **Supabase**
(Postgres + Auth + Row Level Security) and **Recharts**.

---

## What is real in this project

- Every number on every dashboard comes from Postgres. There are no hardcoded metrics.
- Marks and attendance are written through server actions and then re-read from the database.
- Access control is enforced **twice**:
  1. Server components and actions call `requireUser()` / `requireAdmin()`.
  2. Postgres Row Level Security (RLS) rejects any write outside a teacher's assignments with
     `42501`, even if someone bypasses the UI and calls the REST API directly.
- PDF reports are generated from the same data shown on screen (jsPDF, client-side, no server
  filesystem needed).
- No secrets are committed. Only the Supabase URL and the **publishable** key reach the browser.

---

## Features

### Authentication & roles

| Role      | Can do                                                                                   |
| --------- | ---------------------------------------------------------------------------------------- |
| `admin`   | Everything: subjects, assessments, teachers, assignments, students, analytics, reports    |
| `teacher` | View their assigned classes, enter/edit marks and attendance, view scoped analytics/reports |

Accounts live in Supabase Auth. A database trigger creates a `profiles` row with the role; a guard
trigger prevents a signed-in user from promoting themselves.

### Academic structure

- Departments, sections, subjects, academic terms (up to 8 semesters).
- Assessments of type `cat1`, `cat2`, `semester` with configurable max marks and
  weightage. Teachers and administrators can edit the whole structure at any time.
- Student records with register number, section, year and status.
- Enrollments linking students to subjects per term.

### Marks

- Enter or edit marks for an assessment, with per-student **Absent** toggles.
- Validation: marks must be numeric, non-negative and within the assessment maximum.
- Coverage tracker shows recorded vs expected entries and flags missing marks.
- Teacher writes are limited to the sections assigned to them for that subject and term.

### Attendance

- Create a class session (subject, section, term, date, period).
- Mark all present/absent or toggle individual students.
- Attendance percentage = present records / total records, per session, student, subject and term.
- Session-level summaries and per-term student attendance.

### Analytics (transparent rules, not ML)

The UI explains the exact thresholds:

- **At risk**: average < 40% **or** attendance < 60%
- **Declining**: dropped 5+ points versus the previous term
- **High performer**: average 75%+ **and** attendance 85%+
- **Improving**: gained 5+ points versus the previous term
- **On track**: everything else

Views include subject averages and pass rates, section comparisons, assessment-type averages,
score distribution, term trends, top performers, declining students, low attendance and at-risk
lists — all filtered by role.

### PDF reports

Per-student report with identity, section, term, subject-wise marks, attendance, overall average,
class rank and the indicator explanation. Generated in the browser with jsPDF + autotable.

### AI insights (V2, in progress)

Phase 4 of the project plan introduces advisory AI agents on top of the platform data:

- **Student Risk Analysis Agent** (built): explains a student's rule-based indicator from their
  actual marks, attendance and term-over-term numbers, lists contributing factors with severity,
  and suggests focus areas. Rendered as an "AI insight" panel on the student detail page.
- Planned: performance analyst, personalized recommendations, teacher assistant and automated
  report summary agents.

How it stays safe:

- The evidence pack is fetched with the **signed-in user's** Supabase client, so Row Level
  Security decides exactly what the agent can see — the agent has no data access of its own.
- Agents are **advisory only**: they write nothing to academic tables. The only write is an audit
  row in `ai_insights` recording who ran which agent.
- Every conclusion must cite the figures it is based on; the model is instructed never to invent
  numbers, and the UI shows the evidence list.
- The Groq API key is server-only (`GROQ_API_KEY`); it never reaches the browser.

### ML forecasts (Phase 5, first pass)

A statistical layer trained on the platform's own historical data (clearly separated from both the
rule-based indicators and the LLM agents):

- **Next-term average forecast** — ridge regression trained on `Semester 3 → Semester 4`
  transitions. Cross-validated MAE ≈ 4.4 points, R² ≈ 0.75. Rendered on the student page with a
  ± typical-error band.
- **At-risk probability** — logistic regression for the platform's at-risk rule
  (average < 40% or attendance < 60%). Cross-validated AUC ≈ 0.99 on the demo dataset.
- **"Why this prediction"** — every prediction decomposes into per-feature contributions
  (feature × weight, in percentage points). No black box.
- **Model card** — the card footer publishes the training date and cross-validated metrics.

Design rules:

- The models are **linear** (ridge + logistic) so predictions are exactly explainable; accuracy is
  not maximized at the cost of transparency.
- Predictions are **estimates alongside** the rule-based indicator — never a replacement. The
  rule-based classification remains the source of truth for flags.
- Training runs offline in Python (`python scripts/ml/train.py`, Pandas + NumPy only, no
  scikit-learn); inference runs in pure TypeScript (`src/lib/ml/`) so serverless deployment needs
  no Python. `src/lib/ml/model.json` is the versioned artifact linking the two.
- Features computed at inference time in `src/lib/ml/features.ts` must match `train.py` exactly;
  changing one requires changing both and retraining.

---

## Architecture

```
src/
  app/
    (app)/                 authenticated shell (sidebar + header)
      dashboard/           role-aware overview
      students/            list, detail, admin create/edit
      subjects/            catalogue + admin CRUD
      assessments/         list + marks entry
      attendance/          sessions + attendance entry
      analytics/           charts and early-warning lists
      teachers/            admin: create teachers, assign classes
    login/                 auth form + server action
    layout.tsx, page.tsx   shell and landing page
  components/              shared UI, charts, PDF button
  lib/
    supabase/              browser, server (cookie-aware), admin clients
    auth.ts                requireUser / requireAdmin
    data.ts                typed read helpers
    ai/                    V2 agent layer (provider, prompts, context, agents, audit)
    ml/                    Phase 5 ML inference (features, predict, model.json)
    types.ts, utils.ts     shared types and formatting
  proxy.ts                 refreshes the Supabase session on every request

supabase/migrations/
  001_core_schema.sql      tables, constraints, indexes
  002_rls_policies.sql     RLS policies and helper functions
  003_teacher_assignments.sql  teacher ↔ subject/section/term mapping + write policies
  004_analytics_views.sql  security-invoker analytics views
  005_assessment_summary.sql   per-assessment coverage/average view
  006_ai_insights.sql      append-only audit log for V2 AI agent runs

data/
  generate_data.py         deterministic synthetic data generator
  generated/*.csv          the actual seed data (150 students, 6000 marks, ...)

scripts/seed.mjs           deterministic reseed over the PostgREST API
scripts/ml/train.py        Phase 5 model training (Pandas + NumPy -> model.json)
```

### Why the data is synthetic and deterministic

Register numbers, UUIDs, marks and attendance are generated once with a fixed seed. Re-running the
generator produces the same IDs, so the database, screenshots and documentation stay consistent.
150 students × 3 sections × 5 subjects × 2 semesters are loaded, with 40 assessments,
1,500 enrollments, 6,000 marks, 360 attendance sessions and 18,000 attendance records.

---

## Local setup

### 1. Requirements

- Node.js 20+
- A Supabase project (free tier is enough)
- Optional: Python 3.10+ if you want to regenerate the synthetic CSV data

### 2. Install

```bash
npm install
```

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in your project values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

- `NEXT_PUBLIC_*` values are visible in the browser. Only put the publishable key there.
- `SUPABASE_SECRET_KEY` is server-only. It is used by teacher creation and the seed script. Never
  expose it to the client.
- `GROQ_API_KEY` (optional, V2 AI agents) is server-only. Get a free key at
  https://console.groq.com; without it the AI panels explain that AI is not configured instead of
  failing silently. `GROQ_MODEL` optionally overrides the model (default `openai/gpt-oss-120b`).

### 4. Create the database

Run the migrations in order in the Supabase SQL editor (or with the Supabase CLI):

```
001_core_schema.sql
002_rls_policies.sql
003_teacher_assignments.sql
004_analytics_views.sql
005_assessment_summary.sql
006_ai_insights.sql
```

### 5. Create users and demo accounts

Create the two public demo accounts (or use the in-app **Accounts** page as an admin):

| Email               | Password      | Role                      |
| ------------------- | ------------- | ------------------------- |
| admin@college.edu   | `Admin@123`   | viewer (read-only demo)   |
| teacher@college.edu | `Teacher@123` | viewer (read-only demo)   |

> Demo accounts are **read-only showcases** for people evaluating the project: they can browse
> every page, but the database rejects every write from their role. They are locked in the
> Accounts page (role and password cannot be changed from the app). Give real staff their own
> individual accounts instead — never share the demo logins for real work.

Real accounts for teachers/administrators are created in the app under **Accounts** (admin only),
with individual emails and passwords you choose. That page needs `SUPABASE_SECRET_KEY` in the
deployment environment.

The profile trigger inserts a `profiles` row on signup (role comes from the user's metadata).
For teachers who enter marks, create a `teacher_profiles` row and assignments:

```sql
-- Replace the user UUID with the teacher's auth user id.
INSERT INTO public.teacher_profiles (user_id, department_id, employee_id)
VALUES ('<teacher-user-id>', '<department-id>', 'EMP-CSE-001');

-- Give the teacher every subject × section × term (the demo dataset's mapping).
INSERT INTO public.teacher_assignments (teacher_profile_id, subject_id, section_id, academic_term_id)
SELECT tp.id, s.id, sec.id, t.id
FROM public.teacher_profiles tp
CROSS JOIN public.subjects s
CROSS JOIN public.sections sec
CROSS JOIN public.academic_terms t
WHERE tp.employee_id = 'EMP-CSE-001';
```

### 6. Seed the synthetic data

The CSVs in `data/generated/` are the source of truth:

```bash
npm run seed
```

The script wipes the academic tables and writes the CSVs in batches using the secret key. It is
idempotent: run it again to restore the exact demo dataset.

### 7. Run

```bash
npm run dev
```

Open http://localhost:3000 and sign in with one of the demo accounts.

Other useful scripts:

```bash
npm run typecheck
npm run lint
npm run build
```

---

## Deploying to Vercel

1. Push the repository to GitHub.
2. Import the repo in Vercel; the framework preset is detected automatically.
3. Add the same three environment variables under **Project → Settings → Environment Variables**
   for Production, Preview and Development:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SECRET_KEY` (server-only; do not prefix with `NEXT_PUBLIC_`)
4. Deploy. Vercel runs `next build`.
5. In Supabase **Authentication → URL Configuration**, set the site URL and add the Vercel domain
   to the redirect allow-list.
6. Sign in on the deployed URL with a demo account and confirm everything renders read-only
   (writes are refused). Then create a real admin/teacher account under **Accounts** and verify
   mark entry and a PDF download with it.

### Notes specific to this build

- `cacheComponents` is disabled in `next.config.ts` because every page depends on the signed-in
  user and RLS. This keeps the App Router behaviour predictable.
- Session refresh lives in `src/proxy.ts` (Next.js 16 renamed middleware to proxy).
- PDF generation is client-side, so it works on serverless hosting without writing to disk.
- **Server actions return small state objects, and forms call `router.refresh()` after success.**
  On production builds, action responses that carry a `revalidatePath` re-render (or a redirect to
  a large page) can hang open (vercel/next.js#95714): the write commits, but `useActionState`
  stays pending forever. Small responses close reliably, the refresh is a normal RSC GET, and
  every page renders dynamically so the refreshed tree is live data. This was verified against
  the production deployment; `createSession` returns the new session id and the client navigates
  with `router.push`.

---

## Security model

- RLS is enabled on every table. Policies are in `supabase/migrations/002_rls_policies.sql` and
  `003_teacher_assignments.sql`.
- Helpers:
  - `is_admin()` reads the caller's role from `profiles`.
  - `teacher_has_assignment(subject, section, term)` returns true only for rows in
    `teacher_assignments`.
- Marks and attendance writes require either `is_admin()` or a matching assignment.
- Assessment/subject/teacher/student structure changes are admin-only.
- A `protect_profile_role` trigger blocks role changes outside admin/service-role contexts.

A direct REST attempt by a teacher with no assignments returns:

```
403 {"code":"42501","message":"new row violates row-level security policy for table \"marks\""}
```

This was tested against the live project, not just the UI.

---

## Troubleshooting

| Problem                                   | Fix                                                                                     |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| Blank dashboards / 0 students             | Run `npm run seed` and check the row counts with `select count(*) from students;`       |
| `Missing Supabase env` at runtime         | `.env.local` is missing or the dev server was not restarted after editing it            |
| Login returns 500                         | Ensure auth users were created with a password and have complete token columns (GoTrue) |
| Teacher cannot save marks                 | Check `teacher_assignments` for that teacher/subject/section/term                       |
| PDF download blocked                      | Allow downloads for the site; reports are generated in the browser                      |
| Buttons stuck on "Saving…" after a deploy | Reload the page — the open tab still runs the previous deployment's JS and action IDs   |

---

## Roadmap (V2)

- AI/ML risk prediction and advisory agents — **Phase 4 delivered** (Student Risk
  Analysis Agent; the remaining Phase 4 agents were intentionally dropped from
  scope) and **Phase 5 first pass delivered** (next-term average forecast +
  at-risk probability with explainable contributions, `feature/v2-ai-agents`).
  Possible next steps: class-level trend forecasts on the analytics page,
  gradient-boosted model comparison, periodic retraining.
- CSV import for real institutional data.
- Email/notification workflows for at-risk students.
- Audit log for mark corrections.
