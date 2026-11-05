# Database migration review — `feat/home-feed-complete-interactions`

Review date: 2026-11-05
Reviewed against: `origin/main` (`921a045`)
Branch tip at review: `9969120` (+ local pre-release fixes)
Environment used: **local SQLite development database only**. No production
database was contacted and no migration was applied to any shared environment.

## 1. Scope

The branch contains 33 tracked migration files. Compared with `main`, **8 files
are new and none are modified or deleted** (`git diff --name-status
origin/main...HEAD -- "backend/apps/*/migrations/*.py"`):

| Migration | App | Depends on | Contents |
| --- | --- | --- | --- |
| `chat.0002_websocketauthticket` | chat | `chat.0001_initial`, `AUTH_USER_MODEL` | 1 new table |
| `identity.0002_creatorprofile` | identity | `identity.0001_initial`, `AUTH_USER_MODEL` | 1 new table + functional unique constraint |
| `identity.0003_creatorpost_verifiedadevent_creatorwithdrawalrequest_and_more` | identity | `identity.0002_creatorprofile`, `AUTH_USER_MODEL` | 13 new tables + 11 indexes + 12 constraints |
| `identity.0004_publicprofile` | identity | `identity.0003_…`, `AUTH_USER_MODEL` | 1 new table |
| `identity.0005_creatorpostbookmark_and_more` | identity | `identity.0004_publicprofile`, `AUTH_USER_MODEL` | 1 new table + 1 index + 1 unique constraint |
| `mediahub.0001_initial` | mediahub | `identity.0004_publicprofile`, `community.0001_initial`, `AUTH_USER_MODEL` | 1 new table + indexes |
| `mediahub.0002_r2usagemonth` | mediahub | `mediahub.0001_initial` | 1 new table |
| `mediahub/__init__.py` | mediahub | — | package marker |

All other migrations (`authentication`, `community`, `journal`, `insights`,
`sleep`, `support`, `telemetry` and Django's own apps) are already on `main`
and are unchanged by this branch.

## 2. Operation audit (data-loss check)

Every new migration was inspected operation by operation:

- `CreateModel` × 19 — new tables only; no existing table is touched.
- `AddIndex` × 11 (all in `identity.0003`, on tables created in that same
  file) — additive.
- `AddConstraint` × 13 (12 in `identity.0003`, 1 in `identity.0005`; includes
  unique and check constraints, all on tables created in the same migration) —
  additive.

**No `RemoveField`, `DeleteModel`, `RenameField`, `AlterField` on existing
tables, `RunSQL`, or `RunPython` data migration exists in any file this branch
adds.** There is no backward-incompatible or data-loss operation, and no
migration touches rows owned by existing features (journals, insights, sleep,
community posts, support requests).

Two design notes for reviewers (not risks to existing data):

1. `identity.0003` creates many `on_delete=PROTECT` foreign keys (withdrawals,
   revenue attribution, settlements, audit log). This is intentional for
   financial/audit records but means deleting a `CreatorProfile` will be
   blocked while such rows exist. That is a runtime behaviour, not a migration
   hazard.
2. `identity.0005` creates `CreatorPostBookmark` and immediately adds its
   unique constraint `creator_post_bookmark_unique` on `(post, user)`. Both are
   additive and consistent; no duplicate rows can pre-exist because the table
   and the constraint are introduced together by this branch.

## 3. Consistency and dependency validation

Executed locally from `backend/`:

```text
$ py -3.11 manage.py makemigrations --check --dry-run
No changes detected            # exit 0 → models and migrations are in sync

$ py -3.11 manage.py migrate --plan
Planned operations:
chat.0002_websocketauthticket
    Create model WebSocketAuthTicket
```

The single unapplied migration is `chat.0002_websocketauthticket`, which is
additive (one new table). The dev database already has `identity.0002–0005` and
`mediahub.0001–0002` applied, so those upgrades were exercised successfully
during development.

The dependency graph resolves with no cycles and no missing parents
(`showmigrations --plan` succeeds end-to-end).

## 4. Deployment plan (owner-executed, out of scope for this branch)

The production database state is unknown from this environment, so the exact
starting point must be confirmed by the owner. On a production database that is
already at `main` (`921a045`), the deployment applies exactly the eight new
migrations above, all additive:

```bash
python manage.py migrate --plan          # confirm list first
python manage.py migrate                 # applies the 8 additive migrations
```

Recommended safeguards before running:

1. Take a verified database backup/snapshot (owner responsibility; not done
   here).
2. Run `migrate --plan` and confirm the list matches §1.
3. Deploy with `DEBUG=False` only after the R2/Redis/database environment
   prerequisites in `docs/release/release-checklist.md` are set — otherwise the
   new startup validation intentionally aborts the boot.
4. No reverse migration is required. If rollback is ever needed,
   `migrate <app> <previous>` drops only the tables this branch created; it does
   not touch pre-existing data.

## 5. Verdict

| Check | Result |
| --- | --- |
| Migrations in sync with models | Pass (`makemigrations --check`) |
| Destructive / data-loss operations | None found |
| Dependency consistency | Pass |
| Local plan execution | Pass (1 additive migration pending on dev DB) |
| Production migration executed | **Not run — explicitly out of scope** |
| Production backup verified | **Not verifiable from this environment** |

No migration change is required for release. Production apply remains an
owner-run, post-approval step.
