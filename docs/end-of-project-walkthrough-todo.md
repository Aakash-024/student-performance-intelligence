# End-of-project walkthrough (PENDING — deliver when the project wraps up)

The user's standing request: once the project is finished, produce a complete,
beginner-friendly explanation of EVERYTHING in this project so they can
maintain and extend it entirely on their own.

## What the final guide must cover

1. **Big picture** — how the pieces fit: browser → Next.js server → Supabase
   (Postgres + Auth + RLS) → Vercel deployment; where every request travels.
2. **Frontend concepts**
   - Next.js App Router: layouts, pages, server vs client components,
     `(app)/` route group, `params`, metadata.
   - React Server Components vs `"use client"`; `useActionState`,
     `router.refresh()`, the small-state server-action pattern and WHY
     (the Vercel/Next bug documented in README).
   - Tailwind CSS and the design-system components in `src/components/ui.tsx`.
   - Recharts charts; jsPDF client-side PDF generation.
3. **Backend concepts**
   - Server actions (`"use server"` files) vs API routes; when each applies.
   - Supabase clients: browser vs cookie-aware server vs admin (secret key).
   - Auth flow: Supabase Auth, the profile trigger, `requireUser`/`requireAdmin`.
   - Postgres schema, foreign keys, views (`v_*`), and RLS in depth —
     including how `is_admin()` and `teacher_has_assignment()` work and how to
     write a new policy.
   - Migrations: what they are, how to apply one (SQL editor AND
     `supabase db query --remote=<ref> --yes -f <file>`), naming convention.
4. **Secrets and API keys**
   - Every env var: what it does, where it lives (.env.local vs Vercel),
     `NEXT_PUBLIC_` vs server-only, what happens if leaked, how to rotate.
   - Supabase publishable vs secret key; Groq key; where each is used in code.
5. **AI layer (`src/lib/ai/`)**
   - What an LLM call actually is; the evidence-pack + RLS design; prompts and
     how to safely modify them; the audit log; advisory-only principle.
6. **ML layer (`src/lib/ml/`, `scripts/ml/train.py`)**
   - Features, training, cross-validation, standardization, ridge vs logistic,
     model.json artifact, why features.ts and train.py must stay in sync,
     how to retrain and how to read the metrics (MAE/RMSE/R²/AUC).
7. **Data**
   - The synthetic dataset, why it's deterministic, how to regenerate
     (`data/generate_data.py`) and reseed (`npm run seed`).
8. **Day-to-day ownership**
   - Git/GitHub workflow (feature branch → PR → Vercel preview → merge),
     how to deploy, how to read Vercel/Supabase dashboards, common
     troubleshooting from README, how to add a new page/feature end-to-end,
     typecheck/lint commands and what they catch.

## Format

- One master document (or a small docs/ series), beginner level, with
  concrete examples from THIS codebase (file paths, real snippets).
- Written only when the user asks for it — not before.
