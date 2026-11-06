# SoulCare

**Create. Connect. Earn.**

SoulCare is a social creator platform built around community, creative expression, journaling, and media. The product brings social discovery, creator profiles, publishing, community interactions, and media experiences into one platform.

> Product direction: SoulCare is a social platform. Journaling is a user-facing expression feature, not a diagnosis or substitute for professional mental-health care.

## Product areas

- **Social identity** — member profiles and creator presence.
- **Community** — discovery, posts, reactions, comments, and connections.
- **Journaling** — personal writing and reflection features.
- **Creator tools** — creator-facing publishing and content management experiences.
- **Media and SoulTube** — media uploads and shared viewing experiences (feature availability depends on the deployed release).

Feature availability can differ between the default branch, preview deployments, and production. Do not assume that code present on a feature branch is live in production.

## Technology

| Area | Technology |
|---|---|
| Web frontend | React, Vite, React Router |
| API | Python, Django, Django REST Framework |
| Data | PostgreSQL in hosted environments; SQLite can be used for local development |
| Realtime | Django Channels, with Redis in hosted environments |
| Deployment | Vercel (frontend), Render (backend) |

Check `frontend/package.json` and `backend/requirements.txt` for the authoritative dependency lists.

## Repository layout

```text
.
├── backend/       # Django project, API apps, tests and scripts
├── frontend/      # React/Vite application and frontend tests
├── docs/          # Maintained project documentation
├── scripts/       # Repository and developer utilities
└── .github/       # CI workflows and contribution templates
```

## Local development

### Frontend

Requirements: Node.js 20+ and npm.

```powershell
cd frontend
npm ci
npm run dev
```

Run frontend checks:

```powershell
npm run test
npm run build
```

### Backend

Requirements: Python 3.11+ (use the version supported by the deployment environment).

```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

For local development, configure environment variables in an untracked `.env` file under `backend/`. Never commit real credentials, tokens, database URLs, or production environment files. Review the deployment configuration before running migrations against a hosted database.

## Quality checks

From `frontend/`:

```powershell
npm ci
npm run test
npm run build
```

From `backend/`:

```powershell
python manage.py check
python manage.py test
```

GitHub Actions runs the frontend and backend checks on pull requests and pushes to `main` or `develop`. CI results are a gate for review, not proof that external integrations, production storage, realtime infrastructure, or live deployment behavior work correctly.

## Security

- Never commit secrets or production data.
- Use HTTPS and secure environment variables in hosted environments.
- Review authorization and ownership checks for every user-specific API.
- Validate uploaded files by content, size, and allowed type; do not trust client-provided MIME types.
- Treat user-generated content and uploaded media as untrusted.
- Report vulnerabilities privately using the process in [SECURITY.md](SECURITY.md).

## Documentation

Start with [docs/README.md](docs/README.md) for the maintained documentation index. Historical audit reports at the repository root are retained as records; their findings must be revalidated against the current code before being treated as active issues.

## Contribution workflow

1. Create a focused branch from the latest `main`.
2. Keep pull requests small and scoped to one concern.
3. Add or update tests for behavior changes.
4. Run the relevant frontend/backend checks.
5. Document migrations, environment variables, storage changes, and operational risks.
6. Do not merge or deploy until required checks and human review are complete.

See [CONTRIBUTING.md](CONTRIBUTING.md).
