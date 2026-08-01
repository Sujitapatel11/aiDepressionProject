# SoulCare — Technical Architecture & System Design

This document details the internal design, domain models, authentication mechanisms, and real-time streaming pipeline of the **SoulCare** platform.

---

## 1. Authentication & User Unification Architecture

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as React App
    participant AuthAPI as Django Auth API
    participant GoogleAPI as Google OAuth API
    participant DB as PostgreSQL Database

    alt Email & Password Authentication
        User->>Frontend: Submit Login Credentials
        Frontend->>AuthAPI: POST /api/auth/login/ {username, password}
        AuthAPI->>DB: Lookup user by username OR email__iexact
        AuthAPI->>Frontend: Return {token, refresh, user_id, avatar_url}
    else Google OAuth Authentication
        User->>Frontend: Complete Google Sign-In Modal
        Frontend->>AuthAPI: POST /api/auth/google/ {id_token}
        AuthAPI->>GoogleAPI: Verify id_token via google.oauth2 / tokeninfo
        GoogleAPI-->>AuthAPI: Return validated claims (email, sub, name)
        AuthAPI->>DB: 1. Lookup UserAuthProfile by google_id
        alt Not Found by google_id
            AuthAPI->>DB: 2. Lookup User by email__iexact
        end
        alt Account Exists
            AuthAPI->>DB: Link google_id to existing UserAuthProfile
        else Account New
            AuthAPI->>DB: Create User & UserAuthProfile under Atomic Transaction
        end
        AuthAPI->>Frontend: Return JWT Access & Refresh Tokens
    end
```

### Key Security & Integrity Features:
1. **Case-Insensitive Unification (`email__iexact`):** Prevents account duplication by matching incoming emails (e.g., `User@Domain.com` vs `user@domain.com`) across both native password and Google OAuth login flows.
2. **SimpleJWT Configuration:** Access tokens expire in 30 minutes; refresh tokens expire in 30 days. Token rotation and blacklisting (`token_blacklist`) are enforced on refresh and logout.
3. **Atomic Operations:** Account creation and profile creation in OAuth sign-in are wrapped inside `@transaction.atomic` blocks to prevent orphaned database records.

---

## 2. Real-Time WebSocket Infrastructure

```mermaid
sequenceDiagram
    autonumber
    actor Client as WebSocket Client
    participant ASGI as Daphne / ASGI Router
    participant MW as JWTAuthMiddleware
    participant Consumer as SupportChatConsumer
    participant Redis as Redis Channel Layer
    participant DB as PostgreSQL Database

    Client->>ASGI: Connect WSS /ws/chat/{connection_id}/?token=<jwt>
    ASGI->>MW: Extract query param token
    MW->>DB: Validate AccessToken & attach User to scope
    alt Invalid Token or Anonymous
        MW-->>Client: Close WebSocket (code 4003)
    else Valid Authentication
        MW->>Consumer: Handshake connect()
        Consumer->>DB: Verify user access to SupportConnection
        Consumer->>Redis: group_add(chat_{connection_id}, channel_name)
        Consumer->>Client: accept() Handshake
        Consumer->>Consumer: Spawn asyncio background ping_task (Every 20s)
        
        loop Active Connection Ping Loop
            Consumer->>Client: Send {"type": "ping"}
            Client-->>Client: Ignore ping frame (suppress UI update)
        end

        Client->>Consumer: Send JSON {"message": "Hello"}
        Consumer->>DB: save_message()
        Consumer->>Redis: group_send("chat.message")
        Redis-->>Consumer: Broadcast to group
        Consumer-->>Client: Deliver Message Frame
    end
```

### Connection Resilience & Fault Tolerance:
- **Ping Heartbeat:** The consumer executes an asynchronous `asyncio.create_task(self.start_ping_loop())` sending `{"type": "ping"}` every 20 seconds. This prevents reverse proxies (such as Render) from dropping connections due to ~30s idle timeouts.
- **Redis Exception Guarding:** Calls to `group_add`, `group_discard`, and `group_send` are wrapped in try/except blocks catching `redis.exceptions.TimeoutError` and `redis.exceptions.ConnectionError`. On error, a graceful error frame (`{"type": "error", "detail": "temporary connection issue, please retry"}`) is delivered to the client instead of crashing the consumer task.

---

## 3. Core Database Models & Domain Schema

The database is divided into decoupled domain applications:

```
+-----------------------------------------------------------------------------------+
|                                  DJANGO AUTH USER                                 |
+-----------------------------------------------------------------------------------+
       |                    |                    |                    |
       | (1:1)              | (1:1)              | (1:1)              | (1:N)
       v                    v                    v                    v
+--------------+     +--------------+     +--------------+     +------------------+
| UserAuth     |     | UserIdentity |     | UserProfile  |     | JournalEntry     |
| Profile      |     | (Avatar Config|     | (Big Five    |     | (Text Entry)     |
+--------------+     +--------------+     |  OCEAN)      |     +------------------+
                            |             +--------------+            |
                            | (1:N)                                   | (1:1)
                            v                                         v
                     +--------------+                          +------------------+
                     | UserCosmetic |                          | Insight          |
                     | Inventory    |                          | (VADER Sentiment)|
                     +--------------+                          +------------------+
```

### Domain App Models Summary

| Application | Model Name | Primary Responsibility | Key Fields & Indexes |
| :--- | :--- | :--- | :--- |
| **authentication** | `UserAuthProfile` | OAuth provider metadata | `google_id` (indexed), `auth_provider`, `avatar_url` |
| **identity** | `UserIdentity` | Avatar seed and style settings | `avatar_provider`, `style_preset`, `identity_config` (JSON) |
| | `CosmeticItem` | Catalog of unlockable accessories | `id` (UUID), `category` (indexed), `layer_key`, `asset_uri` |
| | `UserCosmeticInventory` | Equipped cosmetics per user | `user`, `cosmetic_item`, `is_equipped` |
| **journal** | `JournalEntry` | User private journal entries | `user`, `content`, `created_at` (indexed with `is_deleted`) |
| **insights** | `Insight` | AI sentiment and emotion tags | `journal` (1:1), `mood`, `sentiment_score`, `keywords` (JSON) |
| **support** | `UserProfile` | Big Five (OCEAN) vector scores | `openness`, `conscientiousness`, `extraversion`, `agreeableness`, `neuroticism` |
| | `SupportRequest` | Connection invitation requests | `from_user`, `to_user`, `status` (indexed), `expires_at` |
| | `SupportConnection` | Active peer connections | `connection_id` (UUID), `status`, `alias_user_one`, `alias_user_two` |
| **chat** | `Message` | Real-time chat messages | `message_id` (UUID), `connection`, `sender`, `receiver`, `content` |
| | `TypingIndicator` | Real-time typing status | `connection`, `sender`, `is_typing`, `updated_at` |
| **sleep** | `SleepEntry` | Daily sleep tracking | `user`, `sleep_date` (unique together), `total_sleep_hours`, `sleep_quality` |
| **telemetry** | `CrashReport` | Client-side error telemetry | `report_id` (UUID), `severity`, `stack_trace`, `device_info` |
| | `AnalyticsEvent` | Interaction tracking | `event_name` (indexed), `session_id`, `duration_seconds` |
| | `ClientLog` | Diagnostic log stream | `level`, `module`, `message`, `stack_trace` |
| | `FeedbackItem` | User bug reports and feedback | `category`, `title`, `description`, `status` |
