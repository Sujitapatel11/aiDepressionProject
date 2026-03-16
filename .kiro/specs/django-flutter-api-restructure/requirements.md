# Requirements Document

## Introduction

This spec covers the restructuring of the MindSpace project into a clean API-first architecture. The existing Django backend currently serves HTML templates, static files, and form-based views. The goal is to strip all frontend concerns from Django and expose a pure REST + WebSocket API consumed exclusively by the Flutter mobile application. The Flutter app already has a partial implementation (cubits, models, services, screens) that targets this API shape. The restructuring affects the Django backend only — the Flutter app's existing architecture is preserved and extended where needed.

The backend will be reorganised into five focused Django apps: `authentication`, `journal`, `insights`, `support`, and `chat`. All existing template rendering, static file serving, HTML views, JavaScript, and CSS will be removed. Every endpoint will return JSON. Real-time messaging will continue to use Django Channels and Redis over WebSockets.

## Glossary

- **Backend**: The Django/Channels application running in the `backend/` directory
- **API**: The REST HTTP interface exposed by the Backend, rooted at `/api/`
- **Flutter_App**: The Flutter mobile application in `lib/` that is the sole consumer of the Backend
- **ApiService**: The Flutter service layer responsible for all HTTP communication with the Backend
- **WebSocketService**: The Flutter service responsible for managing WebSocket connections
- **Token**: A DRF `authtoken` or JWT string returned on login and used as a Bearer credential on all subsequent requests
- **Authentication_Module**: The Django app responsible for user registration, login, Google OAuth, and password reset
- **Journal_Module**: The Django app responsible for creating, retrieving, editing, and soft-deleting journal entries
- **Insights_Module**: The Django app responsible for generating and serving AI-derived emotional insights
- **Support_Module**: The Django app responsible for support requests and active support connections
- **Chat_Module**: The Django app responsible for real-time messaging over WebSockets and message history
- **JournalEntry**: A private text record created by a user, stored in the database, never exposed to other users
- **Insight**: An AI-generated, non-diagnostic emotional reflection linked to exactly one JournalEntry
- **SupportRequest**: A pending request from one user to another to establish a support connection
- **SupportConnection**: An accepted, active peer-to-peer support relationship between two users
- **Message**: A text message sent within a SupportConnection
- **Serializer**: A Django REST Framework serializer that converts model instances to and from JSON
- **Consumer**: A Django Channels AsyncWebsocketConsumer handling a WebSocket connection

---

## Requirements

### Requirement 1: Remove Django Frontend Components

**User Story:** As a developer, I want all Django template rendering, static file serving, and form-based views removed, so that the backend is a clean API server with no frontend concerns.

#### Acceptance Criteria

1. THE Backend SHALL not serve any HTML responses from any URL under `/api/`.
2. THE Backend SHALL not include any Django template files, CSS files, or JavaScript files in its deployed artifact.
3. THE Backend SHALL not use `render()`, `redirect()`, or any Django template context processor in any API view.
4. WHEN a request is made to a removed template-based URL, THE Backend SHALL return a 404 JSON response of the form `{"detail": "Not found."}`.
5. THE Backend SHALL remove `STATICFILES_DIRS`, `LOGIN_URL`, `LOGIN_REDIRECT_URL`, and `LOGOUT_REDIRECT_URL` settings that were used exclusively for the template-based frontend.

---

### Requirement 2: Modular Django App Architecture

**User Story:** As a developer, I want the backend split into focused Django apps, so that each domain is independently maintainable and testable.

#### Acceptance Criteria

1. THE Backend SHALL contain exactly five domain apps: `authentication`, `journal`, `insights`, `support`, and `chat`.
2. EACH domain app SHALL contain its own `models.py`, `serializers.py`, `views.py`, and `urls.py`.
3. THE Backend SHALL register all five apps in `INSTALLED_APPS`.
4. THE Backend SHALL route all API traffic through a single root URL prefix `/api/` defined in `config/urls.py`.
5. WHEN a model is moved from the existing `chat` app to a new domain app, THE Backend SHALL generate and apply the corresponding database migration.

---

### Requirement 3: Authentication API

**User Story:** As a Flutter app user, I want to register, log in, authenticate with Google, and reset my password via REST API, so that my account is secure and accessible from the mobile app.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/auth/signup/` with a valid `username`, `email`, `password`, and `password_confirm`, THE Authentication_Module SHALL create a new user and return a JSON response containing a `token` and `user_id`.
2. IF the `password` and `password_confirm` fields do not match in a signup request, THEN THE Authentication_Module SHALL return a 400 response with a JSON error body.
3. IF the `username` already exists in a signup request, THEN THE Authentication_Module SHALL return a 400 response with a JSON error body.
4. WHEN a POST request is made to `/api/auth/login/` with valid `username` and `password` credentials, THE Authentication_Module SHALL return a JSON response containing a `token` and `user_id`.
5. IF invalid credentials are provided to `/api/auth/login/`, THEN THE Authentication_Module SHALL return a 400 response with a JSON error body containing a descriptive message.
6. WHEN a POST request is made to `/api/auth/logout/` with a valid Bearer token, THE Authentication_Module SHALL invalidate the token and return a 200 JSON response.
7. WHEN a POST request is made to `/api/auth/google/` with a valid Google `id_token`, THE Authentication_Module SHALL verify the token via `django-allauth`, create or retrieve the corresponding user, and return a JSON response containing a `token` and `user_id`.
8. IF an invalid or expired Google `id_token` is provided to `/api/auth/google/`, THEN THE Authentication_Module SHALL return a 400 response with a JSON error body.
9. WHEN a POST request is made to `/api/auth/password/reset/` with a valid `email`, THE Authentication_Module SHALL trigger a password reset email and return a 200 JSON response.
10. IF the `email` provided to `/api/auth/password/reset/` does not correspond to any user, THEN THE Authentication_Module SHALL still return a 200 JSON response to prevent user enumeration.
11. WHILE a user is authenticated, THE Backend SHALL require a valid Bearer token on all non-authentication endpoints and return 401 if the token is absent or invalid.

---

### Requirement 4: Journal API

**User Story:** As a Flutter app user, I want to create, view, edit, and delete my journal entries via REST API, so that I can manage my private reflections from the mobile app.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/journal/` with a non-empty `content` field and a valid Bearer token, THE Journal_Module SHALL create a JournalEntry for the authenticated user and return a 201 JSON response containing `journal_id`, `content`, and `created_at`.
2. IF the `content` field is empty or whitespace-only in a journal creation request, THEN THE Journal_Module SHALL return a 400 response with a JSON error body.
3. WHEN a GET request is made to `/api/journal/` with a valid Bearer token, THE Journal_Module SHALL return a 200 JSON response containing all non-deleted JournalEntry records for the authenticated user, ordered by `created_at` descending.
4. WHEN a GET request is made to `/api/journal/{journal_id}/` with a valid Bearer token, THE Journal_Module SHALL return a 200 JSON response containing the full content of the specified JournalEntry if it belongs to the authenticated user.
5. IF a GET request is made to `/api/journal/{journal_id}/` for a JournalEntry that does not belong to the authenticated user, THEN THE Journal_Module SHALL return a 404 response.
6. WHEN a PATCH request is made to `/api/journal/{journal_id}/` with a non-empty `content` field and a valid Bearer token, THE Journal_Module SHALL update the JournalEntry content and return a 200 JSON response.
7. WHEN a DELETE request is made to `/api/journal/{journal_id}/` with a valid Bearer token, THE Journal_Module SHALL soft-delete the JournalEntry by setting `is_deleted=True` and return a 204 response.
8. IF a DELETE request is made to `/api/journal/{journal_id}/` for a JournalEntry that does not belong to the authenticated user, THEN THE Journal_Module SHALL return a 404 response.

---

### Requirement 5: Insight Generation and API

**User Story:** As a Flutter app user, I want AI-generated emotional insights based on my journal entries to be available via REST API, so that I can view and dismiss them from the mobile app.

#### Acceptance Criteria

1. WHEN a JournalEntry is successfully created, THE Insights_Module SHALL attempt to generate an Insight using the existing rule-based insight engine and associate it with the new JournalEntry.
2. IF insight generation fails for any reason, THE Journal_Module SHALL still return a successful 201 response for the journal creation; the insight failure SHALL be logged but SHALL NOT propagate to the API response.
3. WHEN a GET request is made to `/api/insights/` with a valid Bearer token, THE Insights_Module SHALL return a 200 JSON response containing all non-dismissed Insight records for the authenticated user, ordered by `created_at` descending.
4. Each Insight in the response SHALL include `insight_id`, `title`, `message`, `created_at`, and `journal_id`.
5. WHEN a POST request is made to `/api/insights/dismiss/{insight_id}/` with a valid Bearer token, THE Insights_Module SHALL set `is_dismissed=True` on the specified Insight and return a 200 JSON response.
6. IF a dismiss request is made for an Insight that does not belong to the authenticated user, THEN THE Insights_Module SHALL return a 404 response.

---

### Requirement 6: Support Request and Connection API

**User Story:** As a Flutter app user, I want to send, accept, and reject support requests and view my active connections via REST API, so that I can manage my peer support relationships from the mobile app.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/support/users/` with a valid Bearer token, THE Support_Module SHALL return a 200 JSON response listing all users excluding the authenticated user and users already in an active SupportConnection with the authenticated user.
2. WHEN a GET request is made to `/api/support/requests/` with a valid Bearer token, THE Support_Module SHALL return a 200 JSON response containing all pending incoming SupportRequests for the authenticated user.
3. WHEN a POST request is made to `/api/support/send/{user_id}/` with a valid Bearer token, THE Support_Module SHALL create a SupportRequest from the authenticated user to the target user and return a 201 JSON response.
4. IF a SupportRequest already exists in `pending` status between the authenticated user and the target user, THEN THE Support_Module SHALL return a 400 response with a JSON error body indicating a duplicate request.
5. IF a POST request is made to `/api/support/send/{user_id}/` where `user_id` equals the authenticated user's ID, THEN THE Support_Module SHALL return a 400 response.
6. WHEN a POST request is made to `/api/support/accept/{request_id}/` with a valid Bearer token, THE Support_Module SHALL set the SupportRequest status to `accepted`, create a SupportConnection, and return a 200 JSON response containing the new connection details.
7. WHEN a POST request is made to `/api/support/reject/{request_id}/` with a valid Bearer token, THE Support_Module SHALL set the SupportRequest status to `rejected` and return a 200 JSON response.
8. IF an accept or reject request is made for a SupportRequest that does not belong to the authenticated user as the recipient, THEN THE Support_Module SHALL return a 404 response.
9. WHEN a GET request is made to `/api/support/connections/` with a valid Bearer token, THE Support_Module SHALL return a 200 JSON response listing all active SupportConnections for the authenticated user, including the peer's alias and `connection_id`.

---

### Requirement 7: Dashboard Summary API

**User Story:** As a Flutter app user, I want a single dashboard endpoint that returns a summary of my activity, so that the home screen can be populated with one request.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/dashboard/` with a valid Bearer token, THE Backend SHALL return a 200 JSON response containing: `pending_requests_count`, `active_connections_count`, `journal_count`, `latest_journal_preview`, and `unread_insights_count`.
2. THE `latest_journal_preview` field SHALL contain the `content` truncated to 200 characters and the `created_at` of the most recent non-deleted JournalEntry, or `null` if no entries exist.
3. THE `unread_insights_count` field SHALL reflect the count of Insight records where `is_read=False` and `is_dismissed=False` for the authenticated user.

---

### Requirement 8: Real-Time Chat WebSocket API

**User Story:** As a Flutter app user, I want to send and receive messages in real time over WebSockets, so that I can have live conversations with my support connections.

#### Acceptance Criteria

1. WHEN a WebSocket connection is initiated to `ws://{host}/ws/chat/{connection_id}/` with a valid Bearer token, THE Chat_Module SHALL authenticate the user from the token, verify the user is a participant in the specified SupportConnection, and accept the connection.
2. IF the token is absent, invalid, or the user is not a participant in the SupportConnection, THEN THE Chat_Module SHALL close the WebSocket connection with code 4003.
3. WHEN a JSON payload `{"message": "<content>"}` is received over an authenticated WebSocket, THE Chat_Module SHALL persist the message to the database and broadcast it to all participants in the connection group.
4. The broadcast payload SHALL be a JSON object containing `message_id`, `message`, `sender_id`, `timestamp`.
5. IF the received message content is empty or whitespace-only, THEN THE Chat_Module SHALL discard the payload without saving or broadcasting.
6. WHEN a GET request is made to `/api/chat/{connection_id}/messages/` with a valid Bearer token, THE Chat_Module SHALL return a 200 JSON response containing the message history for the connection, ordered by `created_at` ascending, limited to the 100 most recent messages.
7. IF a message history request is made for a SupportConnection the authenticated user is not a participant in, THEN THE Chat_Module SHALL return a 404 response.

---

### Requirement 9: Typing Indicator WebSocket Event

**User Story:** As a Flutter app user, I want to see when the other person is typing, so that I know the conversation is active.

#### Acceptance Criteria

1. WHEN a JSON payload `{"type": "typing", "is_typing": true}` is received over an authenticated WebSocket, THE Chat_Module SHALL broadcast a typing indicator event to the other participant in the connection group.
2. The typing indicator broadcast payload SHALL be a JSON object containing `type`, `sender_id`, and `is_typing`.
3. WHEN a JSON payload `{"type": "typing", "is_typing": false}` is received, THE Chat_Module SHALL broadcast the stop-typing event to the other participant.

---

### Requirement 10: API Response Format and Error Handling

**User Story:** As a Flutter developer, I want all API responses to be consistently structured JSON, so that the Flutter app can reliably parse every response.

#### Acceptance Criteria

1. THE Backend SHALL return `Content-Type: application/json` on all API responses.
2. THE Backend SHALL return error responses as JSON objects with at least a `detail` or field-keyed error key, never as plain text or HTML.
3. WHEN an unhandled server error occurs, THE Backend SHALL return a 500 JSON response of the form `{"detail": "Internal server error."}` and SHALL log the full exception server-side.
4. THE Backend SHALL enable CORS headers to allow requests from Flutter development environments and production app origins.
5. THE Backend SHALL support token-based authentication via the `Authorization: Bearer <token>` header on all protected endpoints.

---

### Requirement 11: Database and Configuration

**User Story:** As a developer, I want the backend to use SQLite for development and be easily upgradeable to PostgreSQL for production, so that local development is simple and production deployment is straightforward.

#### Acceptance Criteria

1. THE Backend SHALL use SQLite as the default database engine in the development configuration.
2. THE Backend SHALL read the database connection string from an environment variable `DATABASE_URL` when present, allowing PostgreSQL to be substituted without code changes.
3. THE Backend SHALL read `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, and Redis connection details from environment variables.
4. THE Backend SHALL include a `requirements.txt` listing all production dependencies including `djangorestframework`, `djangorestframework-simplejwt` or `django-rest-authtoken`, `django-cors-headers`, `channels`, `channels-redis`, `daphne`, and `django-allauth`.
