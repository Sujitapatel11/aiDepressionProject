# Pull request: `feat/home-feed-complete-interactions` → `main`

> **Status:** ready for human review. Not merged, not deployed, no production
> migrations run. `creator_live` is intentionally excluded from this release.

## Summary

This branch adds the creator ecosystem, the private media hub with durable
Cloudflare R2 storage, verified home-feed interactions (likes, bookmarks,
comments, feed tabs), hardened WebSocket authentication, public profiles, and
the Stitch-inspired web experience, while keeping Django as the single shared
backend. It also resolves three pre-release blockers: the duplicated
`/api/api/` media prefix, silent production fallback to ephemeral storage, and
unvalidated production security settings.

`origin/main` (`921a045`) is already merged into this branch (`9969120`), so the
PR merges cleanly. 28 commits, 90 non-generated files, 8 additive migrations.

## What's included

### Creator ecosystem and home feed
- `CreatorProfile`, follow graph, posts (text/image/video), likes, shares,
  comments, bookmarks, view tracking, verified ad events, revenue attribution,
  withdrawals, monthly settlements, ledger entries, security signals and admin
  audit log (`backend/apps/identity/`).
- Creator REST API, services and serializers; creator studio, public creator
  page, dashboard, earnings and admin surfaces (`frontend/src/pages/Creator*`,
  `frontend/src/components/creator/*`).
- Home feed tabs (For You / Following), optimistic like/bookmark/comment
  interactions, comment deletion, page-number pagination with client
  de-duplication (`backend/apps/identity/creator_api.py`,
  `frontend/src/components/creator/CreatorHomeFeed.jsx`).

### Media hub (durable storage)
- Owner-scoped uploads, content validation by magic bytes, orphan cleanup,
  signed preview tokens for draft/orphan media, public serving only for
  published posts, HTTP Range streaming for video, and a private R2 bucket
  accessed through short-lived presigned redirects
  (`backend/apps/mediahub/`).
- Free-tier usage accounting and ceilings (`R2UsageMonth`, `/api/media/usage/`).
- **Blocker fix:** media URLs now resolve through a single idempotent
  `resolveMediaUrl()` helper, so `/api/media/serve/…` is never doubled into
  `/api/api/media/serve/…` in development or against an absolute production
  origin (`frontend/src/services/api.js`, `PostMediaGrid`, `PostMediaUploader`,
  `DashboardPage`).

### Production configuration validation (new)
- `backend/config/production_checks.py` runs at the end of `settings.py` when
  `DEBUG=False` (and never under tests):
  - requires full R2 credentials, or an explicit
    `SOULCARE_ALLOW_LOCAL_MEDIA_STORAGE=true` opt-in for a persistent volume;
    rejects partially configured R2 outright;
  - requires `REDIS_URL` unless `SOULCARE_ALLOW_IN_MEMORY_CHANNELS=true`;
  - rejects missing/placeholder `SECRET_KEY`, empty or `*` `ALLOWED_HOSTS`,
    `CORS_ALLOW_ALL_ORIGINS`, SQLite, and the default `postgres` password.
- `backend/.env.example` documents every required variable and opt-out.
- **Blocker fix:** production can no longer silently fall back to ephemeral
  local media storage or an in-memory channel layer.

### Chat and auth hardening
- One-time WebSocket auth tickets (`chat.0002_websocketauthticket`), middleware
  and consumer auth verification, plus expanded auth hardening tests.
- Server-side authorization remains the source of truth; private journals are
  unchanged and no client-side-only checks were added.

### Web experience
- Sanctuary-themed dashboard, community feed with For You / Following, journal
  forest, Soul World, profile / Creator Mode, creator studio and chat UI.

## Database migrations

Eight new migrations, all additive (`CreateModel` / `AddIndex` /
`AddConstraint`); **no `RemoveField`, `DeleteModel`, `AlterField`, `RunSQL` or
data migration**. Full review: `docs/release/migration-review.md`.

`makemigrations --check --dry-run` → `No changes detected`.
Local `migrate --plan` → only `chat.0002_websocketauthticket` pending on the dev
database.

## Testing (executed locally)

| Check | Command | Result |
| --- | --- | --- |
| Django system check | `py -3.11 manage.py check` | Pass |
| Migration sync | `py -3.11 manage.py makemigrations --check --dry-run` | `No changes detected` |
| Backend suite (installed apps) | `manage.py test apps.authentication apps.chat apps.community apps.identity apps.insights apps.journal apps.mediahub apps.sleep apps.support apps.telemetry config --parallel 1` | **244 passed, 0 failed** |
| Backend suite (default discovery) | `manage.py test --parallel 1` | **245 run, 1 pre-existing loader error** (`apps.creator_live`, app intentionally not installed) |
| Media hub suite | `manage.py test apps.mediahub --parallel 1` | 32 passed (incl. 6 new Range/416 tests) |
| Production validation suite | `manage.py test config.tests_production_checks --parallel 1` | 25 passed |
| Production guard simulation | `DEBUG=False manage.py check` | Exits 1 with actionable R2 message (expected) |
| Frontend tests | `npm.cmd test` | **23 passed** (incl. 10 new media-URL tests) |
| Frontend production build | `npm.cmd run build` | Pass (`index` 270.85 kB / 81.23 kB gzip) |

The only failing item is the pre-existing `apps.creator_live` test module,
which imports models from an app that is deliberately not in `INSTALLED_APPS`
and is excluded from this release. `creator_live` has been removed from the
branch's tracked files so it cannot enter `main`; the source stays on the
author's disk as untracked work.

## Release prerequisites (owner action required)

Production boot now fails fast unless these are configured. See
`docs/release/release-checklist.md` for the full list and evidence.

1. **Media:** set all four `CLOUDFLARE_R2_*` variables (private bucket), or
   explicitly opt into a persistent mounted volume with
   `SOULCARE_ALLOW_LOCAL_MEDIA_STORAGE=true`.
2. **Channels:** set `REDIS_URL` (or explicitly accept a single in-memory
   worker with `SOULCARE_ALLOW_IN_MEMORY_CHANNELS=true`).
3. **Database:** set `DATABASE_URL` (or `DB_NAME`/`DB_USER`/`DB_PASSWORD`) with
   a non-default password; do not deploy on SQLite.
4. **Security:** real `SECRET_KEY`, explicit `ALLOWED_HOSTS` (no `*`),
   `CORS_ALLOWED_ORIGINS`/`FRONTEND_URL`, `CSRF_TRUSTED_ORIGINS`.
5. **Frontend:** set `VITE_API_BASE_URL` to the API origin (with `/api` at most
   once) and `VITE_WS_BASE_URL` to the WebSocket origin.
6. **Migrations:** back up the production database, run `migrate --plan`, then
   `migrate` as a separately approved step.

## Out of scope / not done

- No merge, rebase, force-push, deploy, or production migration.
- No production environment variables were created or changed.
- `creator_live` is excluded (untracked, not installed).
- No changes to existing journal, insights, sleep, telemetry or payment logic
  beyond the fixes listed above.
