# Design Document: MindSpace Flutter App

## Overview

MindSpace is a privacy-first emotional wellness mobile application built in Flutter, targeting the Google Play Store. It connects to an existing Django/Channels backend via REST API and WebSocket, providing users with private journaling, AI-generated emotional insights, anonymous peer support, and real-time chat — all wrapped in a calm, minimal, emotionally safe UI.

The Flutter app is a pure client: it holds no business logic, performs no AI processing, and stores no sensitive data locally beyond a short-lived auth token. All state lives on the Django backend. The app's role is to present that state clearly and let users interact with it safely.

The five main screens — Home, Journal, Insights, Support, Chat — are navigated via a persistent bottom navigation bar. The design language uses soft blue, sea green, white, and neutral backgrounds with smooth transitions and card-based layouts.

---

## Architecture

### High-Level System Architecture

```mermaid
graph TD
    subgraph Flutter App
        UI[Screen Widgets]
        BL[BLoC / State Layer]
        SVC[Service Layer]
        WS[WebSocket Client]
    end

    subgraph Django Backend
        REST[REST API - Django Views]
        ASGI[ASGI - Django Channels]
        ORM[Django ORM]
        AI[AI Insight Engine]
        REDIS[Redis Channel Layer]
        DB[(SQLite / PostgreSQL)]
    end

    UI --> BL
    BL --> SVC
    SVC -->|HTTP REST| REST
    WS -->|WebSocket| ASGI
    REST --> ORM
    ASGI --> REDIS
    REDIS --> ASGI
    ORM --> DB
    REST --> AI
    AI --> ORM
```

### Flutter Internal Architecture

```mermaid
graph TD
    App[MaterialApp] --> Nav[BottomNavBar]
    Nav --> Home[HomeScreen]
    Nav --> Journal[JournalScreen]
    Nav --> Insights[InsightsScreen]
    Nav --> Support[SupportScreen]
    Nav --> Chat[ChatScreen]

    Home --> HomeCubit[HomeCubit]
    Journal --> JournalCubit[JournalCubit]
    Insights --> InsightsCubit[InsightsCubit]
    Support --> SupportCubit[SupportCubit]
    Chat --> ChatCubit[ChatCubit]

    HomeCubit --> ApiService[ApiService]
    JournalCubit --> ApiService
    InsightsCubit --> ApiService
    SupportCubit --> ApiService
    ChatCubit --> ApiService
    ChatCubit --> WsService[WebSocketService]

    ApiService --> DioClient[Dio HTTP Client]
    WsService --> WsChannel[web_socket_channel]
```

---

## Sequence Diagrams

### Authentication Flow — Email/Password

```mermaid
sequenceDiagram
    participant U as User
    participant App as Flutter App
    participant API as Django REST API
    participant DB as Database

    U->>App: Enter username + password
    App->>API: POST /api/auth/login/
    API->>DB: authenticate(username, password)
    DB-->>API: User record
    API-->>App: { token, user_id }
    App->>App: Store token in SecureStorage
    App->>App: Navigate to HomeScreen
```

### Authentication Flow — Google Login

```mermaid
sequenceDiagram
    participant U as User
    participant App as Flutter App
    participant Google as Google OAuth
    participant API as Django REST API
    participant Allauth as django-allauth
    participant DB as Database

    U->>App: Tap "Continue with Google"
    App->>Google: google_sign_in.signIn()
    Google-->>U: Google account picker / consent screen
    U->>Google: Select account and grant permission
    Google-->>App: GoogleSignInAccount + idToken
    App->>API: POST /api/auth/google/ { id_token }
    API->>Allauth: verify Google id_token
    Allauth->>Google: Validate token (server-side)
    Google-->>Allauth: Token valid + user info
    Allauth->>DB: Get or create User record
    DB-->>Allauth: User record
    Allauth-->>API: Authenticated user
    API-->>App: { token, user_id }
    App->>App: Store token in SecureStorage
    App->>App: Navigate to HomeScreen
```

### Password Reset Flow

```mermaid
sequenceDiagram
    participant U as User
    participant App as Flutter App
    participant API as Django REST API

    U->>App: Tap "Forgot Password"
    App->>App: Navigate to ForgotPasswordScreen
    U->>App: Enter email address
    App->>API: POST /api/auth/password/reset/ { email }
    API-->>App: 200 OK
    App->>App: Display confirmation message
```

### Journal Create + Insight Generation Flow

```mermaid
sequenceDiagram
    participant U as User
    participant App as Flutter App
    participant API as Django REST API
    participant AI as AI Insight Engine
    participant DB as Database

    U->>App: Write journal entry, tap Save
    App->>API: POST /api/journal/ { content }
    API->>DB: JournalEntry.objects.create(...)
    API->>AI: generate_rule_based_insight_text(content)
    AI-->>API: insight_text (or skip on failure)
    API->>DB: Insight.objects.create(...)
    API-->>App: { journal_id, created_at }
    App->>App: Navigate to JournalList or Dashboard
```

### Real-Time Chat Flow

```mermaid
sequenceDiagram
    participant U1 as User A (Flutter)
    participant WS as WebSocket (Django Channels)
    participant Redis as Redis Channel Layer
    participant U2 as User B (Flutter)

    U1->>WS: connect ws://host/ws/chat/{connection_id}/
    WS->>WS: Authenticate + permission check
    WS-->>U1: Connection accepted

    U1->>WS: send { "message": "Hello" }
    WS->>WS: save_message() to DB
    WS->>Redis: group_send(support_{id}, message)
    Redis->>WS: broadcast
    WS-->>U1: { message, sender_id, timestamp }
    WS-->>U2: { message, sender_id, timestamp }
```

### Support Request Flow

```mermaid
sequenceDiagram
    participant U1 as Requester (Flutter)
    participant API as Django REST API
    participant U2 as Receiver (Flutter)

    U1->>API: POST /api/support/send/{user_id}/
    API->>API: Create SupportRequest (pending)
    API-->>U1: 200 OK

    U2->>API: GET /api/support/i

```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Authentication round-trip stores token

*For any* valid set of login credentials, submitting them to the login flow should result in the returned auth token being retrievable from SecureStorage.

**Validates: Requirements 1.1, 1.4**

---

### Property 2: Invalid credentials produce non-empty error state

*For any* login or signup attempt that returns an error response from the Backend, the AuthCubit should emit an error state containing a non-empty, human-readable message.

**Validates: Requirements 1.3, 11.5**

---

### Property 3: Mismatched passwords are rejected before network

*For any* pair of strings where the password and confirmation password are not equal, the signup validation should reject the submission and no HTTP request should be made.

**Validates: Requirements 1.5**

---

### Property 4: Logout clears token

*For any* authenticated session, calling logout should result in SecureStorage containing no auth token.

**Validates: Requirements 1.7**

---

### Property 5: Every authenticated request carries Bearer token

*For any* HTTP request made by ApiService while a token is present in SecureStorage, the request should include an `Authorization: Bearer <token>` header.

**Validates: Requirements 1.8**

---

### Property 6: 401 response clears token

*For any* API response with HTTP status 401, the App should clear the token from SecureStorage and emit an unauthenticated state.

**Validates: Requirements 1.9**

---

### Property 7: Dashboard renders all summary fields

*For any* dashboard data payload returned by the Backend, the HomeScreen should render the pending support request count, active connection count, journal entry count, latest journal preview, and unread insight count.

**Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6**

---

### Property 8: Whitespace-only input is rejected without network call

*For any* string composed entirely of whitespace characters (including the empty string), submitting it as a journal entry or chat message should be rejected by the App and no network request or WebSocket transmission should occur.

**Validates: Requirements 4.3, 8.4**

---

### Property 9: Content is preserved on save failure

*For any* journal entry content and any save request failure, the JournalCubit error state should retain the original content string so the user does not lose their writing.

**Validates: Requirements 4.5**

---

### Property 10: Lists are displayed in reverse chronological order

*For any* list of journal entries or insights returned by the Backend, the App should display them ordered from newest to oldest based on their `created_at` timestamp.

**Validates: Requirements 5.2, 6.2**

---

### Property 11: Deleted item is removed from list state

*For any* list of journal entries or insights, after a successful delete or dismiss action, the item with the corresponding ID should no longer appear in the Cubit's success state.

**Validates: Requirements 5.4, 6.5**

---

### Property 12: Insight card renders title and message

*For any* Insight object, the rendered insight card widget should contain both the insight title text and the insight message text.

**Validates: Requirements 6.3**

---

### Property 13: Available users list excludes self and connected users

*For any* set of users and active connections, the list of users available to send support requests to should not include the current user or any user already in an active connection with the current user.

**Validates: Requirements 7.2**

---

### Property 14: Accepting a request grows the connections list

*For any* incoming support request, accepting it should result in the SupportCubit's active connections list growing by one entry containing the newly formed connection.

**Validates: Requirements 7.7**

---

### Property 15: Chat message serialization round-trip

*For any* non-empty message string, encoding it as the WebSocket JSON payload `{ "message": "<content>" }` and then decoding that payload should produce the original string.

**Validates: Requirements 8.3**

---

### Property 16: Received message appends to chat list

*For any* chat state with N messages, receiving a new WebSocket message event should result in a chat state with N+1 messages where the last message matches the received content.

**Validates: Requirements 8.5**

---

### Property 17: Message widget renders content, sender identity, and timestamp

*For any* Message object, the rendered message widget should contain the message content, a sender identity indicator (self or other), and a formatted timestamp.

**Validates: Requirements 8.6**

---

### Property 18: WebSocket requires valid token

*For any* WebSocket connection attempt, if no valid auth token is present in SecureStorage, the WebSocketService should reject the connection attempt without opening a socket.

**Validates: Requirements 10.2**

---

### Property 19: Alias is displayed instead of real username

*For any* SupportConnection data where the Backend provides an alias for the peer user, the App should render the alias string rather than the real username in all connection-related UI.

**Validates: Requirements 10.4**

---

### Property 20: All error messages are human-readable strings

*For any* network request failure (HTTP error, timeout, or parse error), the error state emitted by any Cubit should contain a non-empty string that does not contain a raw HTTP status code alone, exception class name, or stack trace.

**Validates: Requirements 11.5**

---

### Property 21: Interactive widgets meet minimum touch target size

*For any* interactive widget (button, tab, list item action) in the App, its rendered size should be at least 48x48 logical pixels.

**Validates: Requirements 11.6**

---

### Property 22: Google Sign-In token is forwarded to backend

*For any* successful Google Sign-In flow that returns a non-null `idToken`, the App should send that token to the backend via POST `/api/auth/google/` and not attempt to authenticate locally.

**Validates: Requirements 1.10**

---

### Property 23: Google Sign-In cancellation produces no state change

*For any* Google Sign-In attempt that is cancelled by the user (null result returned by `google_sign_in`), the AuthCubit should remain in its previous state and no network request should be made.

**Validates: Requirements 1.11**

---

### Property 24: Google Sign-In failure produces non-empty error state

*For any* Google Sign-In attempt where the backend returns an error response, the AuthCubit should emit an error state containing a non-empty, human-readable message.

**Validates: Requirements 1.11**

---

### Property 25: Login screen presents all three authentication options

*For any* rendering of the LoginScreen, the widget tree should contain an email/password form, a "Continue with Google" button, and a "Forgot Password" link.

**Validates: Requirements 1.12**
