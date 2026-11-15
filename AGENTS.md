<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-workflow-notes -->

## Project workflow notes (human-approved conventions)

- **Feature workflow:** build features on a `feature/<name>` branch, push the
  branch to GitHub (`git push -u origin <branch>`), open a PR with
  `gh pr create`, and test on the Vercel **preview deployment** URL before
  merging to `master`. Merging the PR is the only step that triggers a
  production deploy. Do not push straight to `master` for new features.
- **Progress-report PDF:** layout engine in `src/lib/progress-report.ts`
  (headless-renderable), editable branding/signatories/department overrides in
  `src/lib/report-config.ts`. Sample renders: `node scripts/preview-report.mjs <out.pdf>`.
- **Test accounts:** `admin@college.edu` / `Admin@123` (admin),
  `teacher@college.edu` / `Teacher@123` (teacher).
- **Lint note:** `npm run lint` reports a pre-existing error in
  `src/components/app-shell.tsx` (set-state-in-effect) that predates the PDF
  feature — don't confuse it with new work.

<!-- END:project-workflow-notes -->
