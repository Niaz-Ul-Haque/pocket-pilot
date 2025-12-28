# DevOps & Automation

This document explains the local git hooks and CI/CD automation in Pocket Pilot.

---

## Local Git Hooks (Husky)

Hooks run automatically when you commit or push.

### prepare-commit-msg
- File: `.husky/prepare-commit-msg`
- Runs: `scripts/prepare-commit-msg.ts`
- Behavior: If your branch name contains an issue number, it appends `(#123)` to the commit subject.

Example:
```
branch: chore/123-devops-demo
commit: "chore: add devops automation"
result: "chore: add devops automation (#123)"
```

### pre-commit
- File: `.husky/pre-commit`
- Runs: `lint-staged` (configured in `package.json`)
- Behavior: Runs ESLint with `--fix` on staged `*.{js,jsx,ts,tsx}` files.

If lint fails, the commit is blocked.

### commit-msg
- File: `.husky/commit-msg`
- Runs: commitlint using `commitlint.config.cjs`
- Behavior: Enforces Conventional Commits.

Examples:
```
PASS: feat: add budgets page
PASS: chore: update deps
FAIL: update stuff
```

### pre-push
- File: `.husky/pre-push`
- Runs: `npm run build` and `npm run typecheck`
- Behavior: If either fails, the push is blocked.
- Note: Removes `.next/diagnostics` before the build to avoid Windows readlink errors.

### post-merge
- File: `.husky/post-merge`
- Behavior: Runs `npm install` if `package.json` or `package-lock.json` changed in the merge.

---

## CI/CD Workflows (GitHub Actions)

### CI (PRs and master pushes)
File: `.github/workflows/ci.yml`

Runs on PRs and pushes to `master`:
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test --if-present`

Note: CI uses placeholder Supabase env vars to allow builds to run without real secrets.

### Bundle Size (PRs)
File: `.github/workflows/bundle-size.yml`

Builds base and head, then comments on the PR with:
- Total size diff
- Largest output files

Uses `scripts/bundle-size.ts` and `scripts/compare-bundle-size.ts`.

### Security Scan
File: `.github/workflows/security.yml`

Runs:
- `npm audit --audit-level=high`
- CodeQL analysis

### PR Labeler
Files: `.github/workflows/labeler.yml`, `.github/labeler.yml`

Auto-labels PRs based on changed paths:
- `frontend`, `api`, `docs`

### Releases
File: `.github/workflows/release.yml`

When you push a tag like `v1.2.3`, GitHub creates a release with auto-generated notes.

### Dependabot
File: `.github/dependabot.yml`

Weekly updates for:
- npm dependencies
- GitHub Actions

---

## Vercel Deployments

### Preview Deploys (PRs)
File: `.github/workflows/vercel-preview.yml`

Deploys each PR to Vercel. Requires secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

If secrets are missing, the workflow fails (expected until Vercel is set up).

### Production Deploy (Manual)
File: `.github/workflows/vercel-production.yml`

To deploy to production:
1. Merge PR to `master`
2. Comment on the merge commit: `/deploy to production via master`

Only org members/collaborators can trigger it.

---

## Environment Variables in CI

CI uses dummy values to avoid build failures when Supabase envs are missing:
- `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy`

Replace these with real GitHub secrets when you want CI to use production-like values.
