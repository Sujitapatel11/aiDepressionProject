# SoulCare — REST & WebSocket API Reference

This document provides a comprehensive API specification for the **SoulCare** platform. All routes require standard JSON payloads and responses unless otherwise specified.

---

## Base Endpoints & Authentication Header

- **Base URL (Production):** `https://your-backend.onrender.com`
- **Base URL (Local):** `http://127.0.0.1:8000`
- **Authorization Header (Protected Endpoints):**
  ```http
  Authorization: Bearer <your_access_token>
  ```

---

## 1. System & Health Check

### Health Check
- **Endpoint:** `GET /api/health/`
- **Auth Required:** No
- **Response `200 OK`:**
  ```json
  {
    "status": "ok"
  }
  ```

---

## 2. Authentication API (`/api/auth/`)

### User Signup
- **Endpoint:** `POST /api/auth/signup/`
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "username": "johndoe",
    "email": "john@example.com",
    "password": "Password123!"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "token": "<access_jwt_token>",
    "refresh": "<refresh_jwt_token>",
    "user_id": 1,
    "username": "johndoe",
    "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=johndoe"
  }
  ```

### User Login
- **Endpoint:** `POST /api/auth/login/`
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "username": "johndoe",
    "password": "Password123!"
  }
  ```
  *(Note: `username` field also accepts the user's email address).*
- **Response `200 OK`:** Returns same payload structure as Signup.

### Google OAuth Login / Signup
- **Endpoint:** `POST /api/auth/google/`
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "id_token": "<google_id_token_string>"
  }
  ```
- **Response `200 OK`:** Returns standard JWT token response payload.

### Token Refresh
- **Endpoint:** `POST /api/auth/token/refresh/`
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "refresh": "<refresh_jwt_token>"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "access": "<new_access_jwt_token>"
  }
  ```

### User Profile Details
- **Endpoint:** `GET /api/auth/me/`
- **Auth Required:** Yes (`Bearer`)
- **Response `200 OK`:**
  ```json
  {
    "user_id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  }
  ```

### Logout
- **Endpoint:** `POST /api/auth/logout/`
- **Auth Required:** Yes (`Bearer`)
- **Request Body:**
  ```json
  {
    "refresh": "<refresh_jwt_token>"
  }
  ```
- **Response `200 OK`:** `{"detail": "Logged out."}`

---

## 3. Identity & Avatar API (`/api/identity/`)

### Get / Update My Identity
- **Endpoints:**
  - `GET /api/identity/me/`
  - `PUT /api/identity/me/`
- **Auth Required:** Yes (`Bearer`)
- **PUT Request Body:**
  ```json
  {
    "avatar_provider": "dicebear",
    "style_preset": "bottts",
    "seed_key": "custom_seed",
    "identity_config": {}
  }
  ```
- **Response `200 OK`:** Returns updated `UserIdentity` configuration object.

### Public Identity
- **Endpoint:** `GET /api/identity/public/<user_id>/`
- **Auth Required:** Yes (`Bearer`)
- **Response `200 OK`:** Returns public avatar configuration and active cosmetics for target user.

---

## 4. Journaling API (`/api/journal/`)

### List & Create Journals
- **Endpoints:**
  - `GET /api/journal/`
  - `POST /api/journal/`
- **Auth Required:** Yes (`Bearer`)
- **POST Request Body:**
  ```json
  {
    "content": "Had a productive day focusing on mindfulness and evening sleep routine."
  }
  ```
- **Response `201 Created`:** Returns created `JournalEntry` object.

### Journal Detail / Update / Soft-Delete
- **Endpoints:**
  - `GET /api/journal/<journal_id>/`
  - `PUT /api/journal/<journal_id>/`
  - `DELETE /api/journal/<journal_id>/`
- **Auth Required:** Yes (`Bearer`)

---

## 5. AI Insights API (`/api/insights/`)

### List Insights
- **Endpoint:** `GET /api/insights/`
- **Auth Required:** Yes (`Bearer`)
- **Response `200 OK`:** Returns list of active insights generated from journal entries.

### Dismiss Insight
- **Endpoint:** `POST /api/insights/dismiss/<insight_id>/`
- **Auth Required:** Yes (`Bearer`)

### Generate Insight for Journal
- **Endpoint:** `POST /api/insights/generate/<journal_id>/`
- **Auth Required:** Yes (`Bearer`)
- **Response `200 OK`:** Returns newly generated `Insight` containing `mood`, `sentiment_score` (-1.0 to 1.0), and `keywords`.

---

## 6. Peer Support & Matchmaking API (`/api/support/`)

### Discover Peer Match Suggestions
- **Endpoint:** `GET /api/support/users/`
- **Auth Required:** Yes (`Bearer`)
- **Response `200 OK`:** Returns list of suggested peer matches ranked by Big Five personality similarity vectors.

### Send Support Request
- **Endpoint:** `POST /api/support/send/<user_id>/`
- **Auth Required:** Yes (`Bearer`)

### Accept / Reject / Cancel Request
- **Endpoints:**
  - `POST /api/support/accept/<request_id>/`
  - `POST /api/support/reject/<request_id>/`
  - `POST /api/support/requests/<request_id>/cancel/`
- **Auth Required:** Yes (`Bearer`)

### Active Connections
- **Endpoint:** `GET /api/support/connections/`
- **Auth Required:** Yes (`Bearer`)
- **Response `200 OK`:** Returns active peer connections with anonymous assigned aliases.

---

## 7. Real-Time Chat & WebSocket API (`/api/chat/` & `/ws/chat/`)

### Message History
- **Endpoint:** `GET /api/chat/<connection_id>/messages/`
- **Auth Required:** Yes (`Bearer`)
- **Response `200 OK`:** Array of historical chat messages for the connection.

### WebSocket Real-Time Chat Stream
- **URL Format:** `WS /ws/chat/<connection_id>/?token=<jwt_access_token>`
- **Handshake Authentication:** JWT access token passed as query parameter `?token=`.
- **Client Outgoing Message Frames:**
  - **Send Message:** `{"message": "Hello"}`
  - **Send Typing Status:** `{"type": "typing", "is_typing": true}`
  - **Client Heartbeat Pong:** `{"type": "pong"}`
- **Server Incoming Message Frames:**
  - **Chat Message Frame:**
    ```json
    {
      "type": "message",
      "message_id": "uuid-string",
      "message": "Hello",
      "sender_id": 1,
      "timestamp": "2026-08-01T15:00:00Z"
    }
    ```
  - **Typing Indicator Frame:** `{"type": "typing", "sender_id": 2, "is_typing": true}`
  - **Server Ping Frame (Every 20s):** `{"type": "ping"}`
  - **Connection Resilience Error Frame:** `{"type": "error", "detail": "temporary connection issue, please retry"}`

---

## 8. Sleep Tracker API (`/api/sleep/`)

### List / Log Sleep Entries
- **Endpoints:** `GET /api/sleep/`, `POST /api/sleep/`
- **POST Request Body:**
  ```json
  {
    "sleep_date": "2026-08-01",
    "bedtime": "2026-07-31T23:00:00Z",
    "wake_time": "2026-08-01T07:00:00Z",
    "total_sleep_hours": 8.0,
    "sleep_quality": "good",
    "sleep_notes": "Rested well"
  }
  ```

### Sleep Metrics & Today Summary
- **Endpoints:** `GET /api/sleep/today/`, `GET /api/sleep/stats/`
- **Auth Required:** Yes (`Bearer`)

---

## 9. Telemetry & Feedback API (`/api/telemetry/` & `/api/feedback/`)

### Client Crash Report Submission
- **Endpoint:** `POST /api/telemetry/crash/`
- **Auth Required:** Optional
- **Payload:** `{"stack_trace": "...", "device_info": {}, "severity": "fatal"}`

### Feedback Submission
- **Endpoint:** `POST /api/feedback/`
- **Auth Required:** Optional
- **Payload:** `{"category": "bug_report", "title": "...", "description": "..."}`
