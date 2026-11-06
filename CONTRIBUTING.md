# Contributing to SoulCare

## Before starting

- Read the root README and the relevant architecture/product documentation.
- Check open pull requests and issues to avoid duplicating work.
- Base new work on the latest `main`, unless the task explicitly targets another branch.
- Keep unrelated feature work out of the same pull request.

## Branches and commits

Use focused branch names such as:

- `feat/<short-description>`
- `fix/<short-description>`
- `chore/<short-description>`
- `docs/<short-description>`

Write imperative, specific commit messages (for example, `fix: validate media ownership before serving files`).

## Required checks

Frontend changes:

```bash
cd frontend
npm ci
npm run test
npm run build
```

Backend changes:

```bash
cd backend
python manage.py check
python manage.py test
```

Run the checks relevant to the changed area. Explain any check that cannot be run and include the failure output in the pull request.

## Pull request expectations

A pull request should state:

- What changed and why.
- Which user-facing behavior or API contract is affected.
- Tests and commands run, with results.
- Database migrations and rollout/rollback considerations.
- New or changed environment variables.
- Storage, Redis, background-task, or deployment dependencies.
- Known limitations and follow-up work.

Do not claim production readiness based only on a successful local build.

## Safety rules

- Never commit secrets, user data, production database dumps, uploaded media, or local environment files.
- Do not rewrite shared branch history or force-push without explicit coordination.
- Do not delete generated or user-owned files as part of unrelated cleanup.
- Do not merge or deploy without the required review and approval.
- Treat authorization, privacy, creator earnings, payments/withdrawals, and media access changes as security-sensitive.
