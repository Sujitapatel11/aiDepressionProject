# SoulCare Backend - API Reference Documentation

Production REST Framework & WebSocket API Specification for **SoulCare**.

---

## 🔒 Base Configuration & Global Headers

- **Base URL**: `http://127.0.0.1:8000` (or `http://10.0.2.2:8000` for Android emulators)
- **Content-Type**: `application/json`
- **Authentication Header**: `Authorization: Bearer <access_token>`

---

## 1. Authentication Endpoints (`/api/auth/`)

### 1.1 User Signup
- **URL**: `/api/auth/signup/`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Authentication**: None (`AllowAny`)
- **Request JSON**:
  ```json
  {
    "username": "johndoe",
    "email": "john@example.com",
    "password": "Password123!",
    "password_confirm": "Password123!"
  }
  ```
- **Success Response JSON** (`201 Created`):
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user_id": 4,
    "username": "johndoe"
  }
  ```
- **Error Response JSON** (`400 Bad Request`):
  ```json
  {
    "password": ["Passwords do not match."],
    "username": ["Username already taken."]
  }
  ```
- **Validation Rules**:
  - `username`: Required, max 150 chars, must be unique.
  - `email`: Required, valid email format.
  - `password`: Required, minimum 6 characters.
  - `password_confirm`: Must match `password` exactly.
- **Status Codes**: `201 Created`, `400 Bad Request`

---

### 1.2 User Login
- **URL**: `/api/auth/login/`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Authentication**: None (`AllowAny`)
- **Request JSON**:
  ```json
  {
    "username": "john@example.com",
    "password": "Password123!"
  }
  ```
- **Success Response JSON** (`200 OK`):
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user_id": 4,
    "username": "johndoe"
  }
  ```
- **Error Response JSON** (`400 Bad Request`):
  ```json
  {
    "detail": "Invalid email/username or password."
  }
  ```
- **Validation Rules**: Accepts username or registered email in the `username` input parameter.
- **Status Codes**: `200 OK`, `400 Bad Request`

---

### 1.3 Google OAuth Authentication
- **URL**: `/api/auth/google/`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Authentication**: None (`AllowAny`)
- **Request JSON**:
  ```json
  {
    "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI..."
  }
  ```
- **Success Response JSON** (`200 OK`):
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user_id": 7,
    "username": "john.google"
  }
  ```
- **Error Response JSON** (`400 Bad Request`):
  ```json
  {
    "detail": "Invalid Google token: Signature has expired."
  }
  ```
- **Validation Rules**: Validates Google OAuth2 ID token signature and auto-creates user if email is new.
- **Status Codes**: `200 OK`, `400 Bad Request`

---

### 1.4 Logout & Token Blacklist
- **URL**: `/api/auth/logout/`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`, `Authorization: Bearer <token>`
- **Authentication**: Required (`IsAuthenticated`)
- **Request JSON**:
  ```json
  {
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Success Response JSON** (`200 OK`):
  ```json
  {
    "detail": "Logged out."
  }
  ```
- **Error Response JSON** (`401 Unauthorized`):
  ```json
  {
    "detail": "Authentication credentials were not provided."
  }
  ```
- **Validation Rules**: Blacklists the refresh token in SimpleJWT storage.
- **Status Codes**: `200 OK`, `401 Unauthorized`

---

### 1.5 Password Reset Email Request
- **URL**: `/api/auth/password/reset/`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Authentication**: None (`AllowAny`)
- **Request JSON**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Success Response JSON** (`200 OK`):
  ```json
  {
    "detail": "If that email exists, a reset link has been sent."
  }
  ```
- **Error Response JSON** (`400 Bad Request`):
  ```json
  {
    "email": ["Enter a valid email address."]
  }
  ```
- **Validation Rules**: Dispatches standard Django SMTP password reset email if matching email is found.
- **Status Codes**: `200 OK`, `400 Bad Request`

---

### 1.6 Refresh Token Access
- **URL**: `/api/auth/token/refresh/`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Authentication**: None
- **Request JSON**:
  ```json
  {
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Success Response JSON** (`200 OK`):
  ```json
  {
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Error Response JSON** (`401 Unauthorized`):
  ```json
  {
    "detail": "Token is invalid or expired",
    "code": "token_not_valid"
  }
  ```
- **Status Codes**: `200 OK`, `401 Unauthorized`

---

## 2. Journal Reflection Endpoints (`/api/journal/`)

### 2.1 List Journal Reflections
- **URL**: `/api/journal/`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <access_token>`
- **Authentication**: Required (`IsAuthenticated`)
- **Request JSON**: None
- **Success Response JSON** (`200 OK`):
  ```json
  [
    {
      "journal_id": 12,
      "content": "Today felt peaceful after my morning walk.",
      "created_at": "2026-07-26T10:15:00Z",
      "updated_at": "2026-07-26T10:15:00Z"
    }
  ]
  ```
- **Status Codes**: `200 OK`, `401 Unauthorized`

---

### 2.2 Create Journal Entry
- **URL**: `/api/journal/`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`, `Authorization: Bearer <access_token>`
- **Authentication**: Required (`IsAuthenticated`)
- **Request JSON**:
  ```json
  {
    "content": "Felt a bit anxious during work presentation, but recovered well."
  }
  ```
- **Success Response JSON** (`201 Created`):
  ```json
  {
    "journal_id": 13,
    "content": "Felt a bit anxious during work presentation, but recovered well.",
    "created_at": "2026-07-26T11:20:00Z",
    "updated_at": "2026-07-26T11:20:00Z"
  }
  ```
- **Validation Rules**: `content` cannot be blank or whitespace only. Automatically triggers asynchronous NLP sentiment insight generation.
- **Status Codes**: `201 Created`, `400 Bad Request`, `401 Unauthorized`

---

### 2.3 Retrieve Single Journal Entry
- **URL**: `/api/journal/<journal_id>/`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <access_token>`
- **Authentication**: Required (`IsAuthenticated`)
- **Success Response JSON** (`200 OK`):
  ```json
  {
    "journal_id": 13,
    "content": "Felt a bit anxious during work presentation, but recovered well.",
    "created_at": "2026-07-26T11:20:00Z",
    "updated_at": "2026-07-26T11:20:00Z"
  }
  ```
- **Error Response JSON** (`404 Not Found`):
  ```json
  {
    "detail": "Not found."
  }
  ```
- **Status Codes**: `200 OK`, `404 Not Found`, `401 Unauthorized`

---

### 2.4 Update Journal Entry
- **URL**: `/api/journal/<journal_id>/`
- **Method**: `PATCH`
- **Headers**: `Content-Type: application/json`, `Authorization: Bearer <access_token>`
- **Authentication**: Required (`IsAuthenticated`)
- **Request JSON**:
  ```json
  {
    "content": "Updated reflection content..."
  }
  ```
- **Success Response JSON** (`200 OK`):
  ```json
  {
    "journal_id": 13,
    "content": "Updated reflection content...",
    "created_at": "2026-07-26T11:20:00Z",
    "updated_at": "2026-07-26T11:25:00Z"
  }
  ```
- **Status Codes**: `200 OK`, `400 Bad Request`, `404 Not Found`

---

### 2.5 Soft-Delete Journal Entry
- **URL**: `/api/journal/<journal_id>/`
- **Method**: `DELETE`
- **Headers**: `Authorization: Bearer <access_token>`
- **Authentication**: Required (`IsAuthenticated`)
- **Success Response JSON** (`204 No Content`): Empty body
- **Status Codes**: `204 No Content`, `404 Not Found`

---

## 3. AI Insights Endpoints (`/api/insights/`)

### 3.1 List User Insights
- **URL**: `/api/insights/`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <access_token>`
- **Authentication**: Required (`IsAuthenticated`)
- **Success Response JSON** (`200 OK`):
  ```json
  [
    {
      "insight_id": 5,
      "title": "Evening Work Anxiety Trigger",
      "message": "Notice a pattern of stress during late presentation tasks. Try 5-minute deep breathing exercises beforehand.",
      "mood": "mixed",
      "sentiment_score": -0.15,
      "keywords": ["anxious", "work", "presentation"],
      "emotion_tags": ["anxiety", "hopeful"],
      "created_at": "2026-07-26T11:20:05Z",
      "journal_id": 13,
      "is_read": false,
      "is_dismissed": false
    }
  ]
  ```
- **Status Codes**: `200 OK`, `401 Unauthorized`

---

### 3.2 Dismiss Insight
- **URL**: `/api/insights/dismiss/<insight_id>/`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <access_token>`
- **Authentication**: Required (`IsAuthenticated`)
- **Success Response JSON** (`200 OK`):
  ```json
  {
    "detail": "Insight dismissed."
  }
  ```
- **Status Codes**: `200 OK`, `404 Not Found`

---

### 3.3 Force On-Demand Insight Generation
- **URL**: `/api/insights/generate/<journal_id>/`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <access_token>`
- **Authentication**: Required (`IsAuthenticated`)
- **Success Response JSON** (`200 OK`): Insight object schema (same as 3.1)
- **Status Codes**: `200 OK`, `404 Not Found`

---

## 4. Peer Support & Connections (`/api/support/`)

### 4.1 Available Peer Suggestions (Smart Cosine Matching)
- **URL**: `/api/support/users/?mode=smart`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <access_token>`
- **Authentication**: Required (`IsAuthenticated`)
- **Success Response JSON** (`200 OK`):
  ```json
  [
    {
      "id": 9,
      "username": "empathetic_peer",
      "match_score": 88,
      "has_profile": true
    }
  ]
  ```
- **Status Codes**: `200 OK`, `401 Unauthorized`

---

### 4.2 Send Support Request
- **URL**: `/api/support/send/<user_id>/`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <access_token>`
- **Authentication**: Required (`IsAuthenticated`)
- **Success Response JSON** (`201 Created`):
  ```json
  {
    "request_id": "c9b7e51f-570a-4289-9a77-94d07d1a5814",
    "from_user": 4,
    "to_user": 9,
    "status": "pending",
    "created_at": "2026-07-26T11:30:00Z",
    "expires_at": "2026-08-02T11:30:00Z"
  }
  ```
- **Error Response JSON** (`400 Bad Request`):
  ```json
  {
    "detail": "Cannot send support request to yourself."
  }
  ```
- **Status Codes**: `201 Created`, `400 Bad Request`

---

### 4.3 Accept Support Request
- **URL**: `/api/support/accept/<request_id>/`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <access_token>`
- **Authentication**: Required (`IsAuthenticated`)
- **Success Response JSON** (`200 OK`): Returns active `SupportConnection` object.
- **Status Codes**: `200 OK`, `400 Bad Request`

---

### 4.4 List Active Peer Connections
- **URL**: `/api/support/connections/`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <access_token>`
- **Authentication**: Required (`IsAuthenticated`)
- **Success Response JSON** (`200 OK`):
  ```json
  [
    {
      "connection_id": "e3f89a10-2b14-482a-8742-8321459a99bc",
      "peer_username": "empathetic_peer",
      "peer_alias": "Kind Companion #99BC",
      "status": "active",
      "created_at": "2026-07-26T11:32:00Z"
    }
  ]
  ```
- **Status Codes**: `200 OK`

---

## 5. Dashboard Summary (`/api/dashboard/`)

### 5.1 Executive Summary Metrics
- **URL**: `/api/dashboard/`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <access_token>`
- **Authentication**: Required (`IsAuthenticated`)
- **Success Response JSON** (`200 OK`):
  ```json
  {
    "pending_requests_count": 2,
    "active_connections_count": 3,
    "journal_count": 14,
    "latest_journal_preview": {
      "content": "Felt a bit anxious during work presentation...",
      "created_at": "2026-07-26T11:20:00Z"
    },
    "unread_insights_count": 1
  }
  ```
- **Status Codes**: `200 OK`, `401 Unauthorized`

---

## 6. Real-Time WebSocket Support Chat (`/ws/chat/`)

### 6.1 WebSocket Handshake Connection
- **URL**: `ws://127.0.0.1:8000/ws/chat/<connection_id>/?token=<access_token>`
- **Protocol**: `WebSocket` (ASGI via Daphne / Channels)
- **Authentication**: JWT Token passed via `token` query parameter.
- **Outbound Message Payload (Client -> Server)**:
  ```json
  {
    "type": "chat_message",
    "message": "Thank you for listening, it really helped."
  }
  ```
- **Inbound Broadcast Payload (Server -> Client)**:
  ```json
  {
    "type": "chat_message",
    "message_id": "7a8b9c10-2d3e-4f5a-6b7c-8d9e0f1a2b3c",
    "sender_id": 4,
    "sender_username": "johndoe",
    "message": "Thank you for listening, it really helped.",
    "timestamp": "2026-07-26T11:35:00Z"
  }
  ```
