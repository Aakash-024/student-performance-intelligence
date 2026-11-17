# Configurable academics — design notes

This document records the decisions behind the "editable academic structure"
work so the tradeoffs are visible to whoever maintains the project next.

## What the app can do now

| Area | Capability | Who |
|---|---|---|
| Terms | Add / edit / delete semesters (1–8 per year), set the current term | Teachers + admins |
| Subjects | Add / edit / delete subjects, including **code**, name, department, credits, type | Teachers + admins |
| Enrolments | Choose which subjects each section takes in each term (matrix editor) | Teachers + admins |
| Assessments | Add / edit / delete CAT 1, CAT 2, Semester exam; edit type, max marks, weightage, date | Teachers + admins |
| Marks | Enter / correct marks at any time | Teachers (assigned sections) + admins |
| Mark corrections | Append-only before/after audit trail | Visible to the editor and admins |
| Students | Create and edit student records | Teachers + admins |
| CSV import | Two-step upload of students and marks with per-row validation | Teachers + admins |

The generic `internal` assessment type was removed entirely. The two internal
exams are now `cat1` ("CAT 1") and `cat2` ("CAT 2"), matching how the college
actually runs them.

Demo data still contains only two semesters. The app is *capable* of eight;
no real college data has been loaded yet.

## The deliberate tradeoff: staff-wide structure rights

The original master prompt assigned structure management to administrators and
marks entry to teachers. That was **overridden intentionally**: the people who
actually run the website are teachers, and college regulations change yearly —
subject codes, names, and the subject set per semester all change with them.
Requiring an admin round-trip for every change would make the platform useless
in practice.

**What that means technically:** migrations 008–010 replaced the admin-only
RLS write policies on `academic_terms`, `subjects`, `enrollments`, and
`assessments` with policies granted to `authenticated`. SPIP only issues login
accounts to staff (roles `admin` and `teacher`), so `authenticated` is the staff
group — students do not have accounts.

**Known risk:** any teacher can now edit or delete structure anywhere, not just
for their own assigned sections/departments. There is no per-department
authorization on structure. This is acceptable for a small, trusted staff and
a demo/single-college deployment. If the app is ever opened up to many
departments, add a structure-edit audit table and scope writes by department.

**What did NOT change:** marks entry is still restricted by
`teacher_has_assignment(subject_id, section_id)` in the database. Teachers can
reconfigure the catalogue but can only enter marks for classes assigned to
them. Admins remain unrestricted.

## Migrations applied to the production database

- **007** `mark_audit` — append-only before/after log for mark corrections.
- **008** semester check widened from `IN (1,2)` to `BETWEEN 1 AND 8`; staff
  write policies for terms (including delete, which did not exist).
- **009** staff write policies for subjects and enrollments, including a new
  enrollments DELETE policy (the old UI could not actually delete).
- **010** placeholder `internal` assessments deleted; type check narrowed to
  `cat1`/`cat2`/`semester`; demo weightage redistributed to 25/25/50 so totals
  stay at 100; staff write + delete policies for assessments.
- **011** `students_insert_admin`/`students_update_admin` replaced with staff
  policies so teachers can create and edit students (needed for CSV import).
  Student **delete** stays admin-only.
- **012** `viewer` role added to the role check; the 008–010 `WITH CHECK (true)`
  policies re-created with `get_user_role() IN ('admin','teacher')` so read-only
  demo logins cannot write; mark/AI audit inserts restricted to staff; both
  public demo accounts flipped to `viewer`.
- **013** `activity_log` — one append-only row per write action through the app
  (students, terms, subjects, enrolments, assessments, marks, attendance, CSV
  imports, account management), with denormalised `actor_name`/`entity_label`
  so entries survive deletions. Staff can read; viewers cannot; only staff can
  insert, and only as themselves. Visible on the `/activity` page.

All four were applied with:

```
supabase db query --remote=ugrjjrfszjkspjndkizi --yes -f supabase/migrations/<file>.sql
```

## ML retrain

Removing `internal` removed one input feature. `scripts/ml/train.py` and
`src/lib/ml/features.ts` were updated together, the synthetic CSVs were
regenerated (`python data/generate_data.py`), and `src/lib/ml/model.json` was
retrained (`python scripts/ml/train.py`).

New model card: **8 features**, ridge regression CV MAE **4.76 points**, logistic
CV AUC **0.981**. These numbers are published by the model card in the UI;
do not hand-edit them.

**Rule of thumb:** any change to `FEATURE_LABELS` in `src/lib/ml/features.ts`
requires the same change in `FEATURE_NAMES` in `scripts/ml/train.py`, followed
by a retrain. The two files are deliberately kept in lockstep.

## User accounts, demo access, and CSV import

Three roles exist:

| Role | Reads | Writes | Intended for |
|---|---|---|---|
| `admin` | Everything | Everything, including Accounts | The owner / college admins |
| `teacher` | Everything | Structure everywhere; marks & attendance only for assigned classes | Real teaching staff |
| `viewer` | Everything | **Nothing** | Public demo / showcase visitors |

- **Accounts page** (`/accounts`, admin only): creates Supabase auth users with individual
  email + password via the secret key (`SUPABASE_SECRET_KEY`), resets passwords, changes roles.
  The database trigger `handle_new_user` turns each new auth user into a profile with the
  chosen role. The two public demo accounts are hard-locked: the app refuses to change their
  role or password.
- **Demo accounts are viewers.** `admin@college.edu` / `Admin@123` and
  `teacher@college.edu` / `Teacher@123` keep their published passwords but their profile role
  is `viewer`, so anyone using them can browse every page and change nothing.
- **Defence in depth for viewers:** every mutating server action calls `requireStaff()`
  (redirects viewers), every write form is hidden in the UI, and — critically — migrations 008–010's
  `WITH CHECK (true)` policies were re-created in migration 012 with
  `get_user_role() IN ('admin','teacher')`, so even a crafted direct API call is rejected by RLS.

## Deletion safety

- Deleting an **assessment** cascades its marks and mark-audit rows. The UI asks
  for confirmation first.
- Deleting a **subject** is blocked by the app if it still has assessments or
  enrolments; the database also has `ON DELETE RESTRICT` on enrolments.
- Deleting a **term** is blocked by the database if assessments, attendance, or
  enrolments reference it; the app shows a friendly error on the FK violation.

## CSV import (`/import`)

Two-step upload, open to all staff:

1. **Validate** — the file is parsed and every row is checked against the live
   catalogue. Nothing is written. The preview labels each row `ready` (new),
   `update` (already exists), `skipped`, or `error` with the reason.
2. **Import** — the file is re-validated server-side (the preview is display
   only, never trusted) and only rows without errors are written. If a large
   batch fails part-way, earlier chunks stay committed; re-running the same
   file is safe because imports upsert instead of blindly inserting.

**Students CSV** — columns `register_number, name, email, section,
current_year, status` (only register_number, name, section and current_year
are required; `section_id` UUIDs and a `department` column are also accepted
for disambiguation). New students are auto-enrolled in the current term's
subjects for their department, same as the single-student form. Sections must
already exist — there is no section editor, so an admin adds new sections.

**Marks CSV** — columns `register_number, subject_code, term, assessment,
marks_obtained, is_absent` (`student_id` and `assessment_id` UUIDs are also
accepted, which is what `data/generated/marks.csv` uses). Assessment must be
`CAT 1`, `CAT 2` or `Semester`. Teachers can only import marks for their
`teacher_assignments` rows; unassigned rows are skipped, not failed. Existing
marks that change value become `mark_audit` corrections, exactly like manual
edits.

Limits: 2000 rows per file, server-action body limit raised to 4MB in
`next.config.ts`. Templates are downloadable from the Import page
(`/api/import/template?type=students|marks`, login required).
