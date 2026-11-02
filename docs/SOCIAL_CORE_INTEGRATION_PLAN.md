# SoulCare Social Core Integration Plan

Status: discovery baseline; not an implementation specification until endpoint contracts and tests are verified.

Repository: `Sujitapatel11/aiDepressionProject`
Starting point: `ca19f7c50d9c0161d2577e27abab4d571f004d5f`
Working branch: `work/soulcare-social-core-plan`

## Product direction

SoulCare is a social creator platform with journaling as a distinctive feature. The fantasy/soft-purple visual identity from Google Stitch is a presentation layer; it must not dictate backend behavior or replace existing working functionality.

## Verified existing frontend

- React 18, Vite 5, Tailwind CSS 3, React Router 6.
- Existing routes/pages include login, dashboard, journal, insights, peers, chat, community feed, profile, settings, and beta admin.
- Existing API client is in `frontend/src/services/api.js`; it attaches JWT bearer tokens and attempts a single refresh/retry on 401.
- Existing auth context is in `frontend/src/hooks/useAuth.jsx`.
- Existing WebSocket client modules are present for chat.
- Existing main application shell is `frontend/src/layouts/MainLayout.jsx`.

## Verified existing backend domains

Django REST Framework apps present: authentication, identity, journal, insights, sleep, support, chat, community, telemetry, and creator_live.

Root API routing currently mounts:
- `/api/auth/`
- `/api/identity/`
- `/api/journal/`
- `/api/insights/`
- `/api/support/`
- `/api/chat/`
- `/api/sleep/`
- `/api/community/`
- `/api/dashboard/`
- `/api/telemetry/`
- `/api/feedback/`

### Community API verified from URL/view source

- `GET /api/community/posts/`: authenticated, paginated list of visible anonymous community posts.
- `POST /api/community/posts/create/`: authenticated, creates an anonymous community journal post; content required, max 2,000 characters; rate limited.
- `POST /api/community/posts/<uuid>/react/`: authenticated supportive reaction toggle.
- `POST /api/community/posts/<uuid>/report/`: authenticated report; auto-hide threshold is three reports.

This is an anonymous support/reflection feed. It is not evidence of a conventional creator/social feed.

### Identity API verified from URL/view source

- `GET/PATCH /api/identity/me/`: authenticated user's avatar/identity configuration.
- `GET /api/identity/public/<user_id>/`: public identity payload.
- `GET /api/identity/cosmetics/`: authenticated cosmetics catalog.

### Journal API verified from URL source

- `GET/POST /api/journal/`: journal list/create.
- `POST /api/journal/transcribe/`: audio transcription.
- `GET/PUT/PATCH/DELETE /api/journal/<journal_id>/`: inspect the view implementation and permissions before wiring edit/delete controls.

## Phase 1: core user experience

Proposed screen mapping:

| Stitch concept | Existing frontend starting point | Backend status |
|---|---|---|
| Home Sanctuary | DashboardPage / MainLayout | Existing dashboard endpoint needs contract verification |
| Social home/feed | CommunityFeedPage is a starting point only | Current community feed is anonymous; creator feed requirements are missing |
| Journal Forest | JournalPage | Journal endpoints exist; preserve current CRUD and transcription behavior |
| My Soul Profile | ProfilePage | Identity endpoints exist; public profile/social statistics need verification |
| Discover / Soul World | New route/page likely required | Discovery/search APIs not yet verified |
| Connect Island | PeersPage | Support matching exists; social follow graph is not verified |
| Play Zone | New route/page likely required | Game backend not verified |

## Required discovery before implementing social feed

Inspect models, serializers, views, permissions, tests, and migrations for:
- Authentication and identity response schemas.
- Existing support connections versus social follows.
- Community post serializer and visibility rules.
- Existing media upload/storage configuration.
- Existing dashboard response contract.
- Creator-live model relationships and migration state.

Do not repurpose anonymous community posts as public creator posts. Do not expose internal user foreign keys or anonymous-post ownership in public serializers.

## Missing functionality to confirm or design

The current inspected community routes do not establish support for:
- Public creator posts with author identity and media.
- Comments and threaded replies.
- Follow/unfollow relationships.
- Likes/bookmarks for conventional social content.
- Feed ranking and pagination for a creator feed.
- User search and discovery.
- Notifications for social activity.

Treat these as gaps to verify across the entire repository before proposing new models/endpoints.

## Non-negotiable implementation constraints

1. Preserve current authentication, JWT refresh, journal, peer-support, and chat behavior.
2. Do not replace the frontend wholesale with exported Stitch HTML.
3. Convert Stitch screens into reusable React components and route-level pages.
4. Keep existing API contracts unless a deliberate, tested backend migration is approved.
5. Every new endpoint must enforce authentication/authorization, validate input, paginate list responses, and include tests.
6. Never trust frontend checks for permissions, creator earnings, or ownership.
7. Do not change production environment variables, secrets, data, or deployments.
8. Do not merge to `main`, push production code, or deploy without explicit user approval.

## Validation gates

- Frontend production build.
- Django system checks and relevant app tests.
- API tests for ownership, permissions, pagination, validation, and abuse/rate limits.
- Regression tests for login, refresh, logout, journal CRUD, support, and chat.
- Visual/responsive review against Stitch references.
- API integration review before each feature is marked complete.

## Current confidence and limitations

This document records source-level repository inspection only. No local runtime tests, live API calls, database inspection, or production security verification have been performed as part of this discovery. The API reference documents are useful but must be reconciled against the actual URL/view/serializer implementations before being treated as authoritative.
