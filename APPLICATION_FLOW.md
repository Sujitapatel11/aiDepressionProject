# SoulCare Complete Application Architecture & User Flow Specification

Documenting the full end-to-end architecture, user journeys, navigation routes, API integrations, shared components, and business rules for **SoulCare**.

---

## 1. Application Map & Pages

The application is structured into the following distinct views:

| View / Screen | Template Source | URL Route | Authentication Required | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Login Page** | `login.html` | `/login/` | No | Primary standalone authentication portal (Email/Password & Google OAuth). |
| **Splash Screen** | `index.html` (`#screen-splash`) | `/` | No | Initial loading screen with animated logo and tagline before app initialization. |
| **Main Dashboard ("Today")** | `index.html` (`#desk-dashboard` / `#mob-dashboard`) | `/` | Yes | Home hub displaying greeting, streak counter, quick stat tiles, daily reflection prompt, quick actions, and latest entry. |
| **Journal ("Log")** | `index.html` (`#desk-journal` / `#mob-journal`) | `/` | Yes | Split-pane view for reading past journal logs and composing new reflection entries. |
| **AI Insights ("Data")** | `index.html` (`#desk-insights` / `#mob-insights`) | `/` | Yes | Analytics dashboard showing mood trend charts, emotion breakdown filters, and AI-generated wellness suggestions. |
| **Community & Support ("Chat")**| `index.html` (`#desk-support` / `#mob-support`) | `/` | Yes | Peer connection hub featuring active chats, peer request lists, search for new peers, and real-time chat interface. |
| **Profile & Settings ("Me")** | `index.html` (`#mob-profile` / Sidebar user panel) | `/` | Yes | User profile display, anonymous avatar selector, and session logout. |
| **Beta Admin Portal** | `beta_admin.html` | `/beta-admin/` | Yes (Admin) | Administrative dashboard for monitoring system health, users, and logs. |

---

## 2. Navigation Flow & User Journey

```
                        [ Unauthenticated User ]
                                    │
                                    ▼
                             ┌──────────────┐
                             │  /login/     │
                             │ (login.html) │
                             └──────┬───────┘
                                    │  Success Login / JWT Received
                                    ▼
                        [ Authenticated User ]
                                    │
                                    ▼
                             ┌──────────────┐
                             │      /       │
                             │ (index.html) │
                             └──────┬───────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       │                            │                            │
       ▼                            ▼                            ▼
┌──────────────┐             ┌──────────────┐             ┌──────────────┐
│  Dashboard   │             │   Journal    │             │ AI Insights  │
│  ("Today")   │             │   ("Log")    │             │   ("Data")   │
└──────┬───────┘             └──────┬───────┘             └──────┬───────┘
       │                            │                            │
       └────────────────────────────┼────────────────────────────┘
                                    │
       ┌────────────────────────────┴────────────────────────────┐
       │                                                         │
       ▼                                                         ▼
┌──────────────┐                                          ┌──────────────┐
│  Support/Chat│                                          │  Profile/Me  │
│  ("Messages")│                                          │  & Logout    │
└──────────────┘                                          └──────────────┘
```

---

## 3. APIs Used per View

| View / Screen | HTTP Method | API Endpoint | Payload / Request | Response / State Updated |
| :--- | :--- | :--- | :--- | :--- |
| **Login** | `POST` | `/api/auth/login/` | `{ username, password }` | Stores `soulcare_token`, `soulcare_refresh`, `user_id`, `username` in `localStorage`. Redirects to `/`. |
| **Password Reset**| `POST` | `/api/auth/password/reset/` | `{ email }` | Triggers password reset email notification. |
| **Dashboard** | `GET` | `/api/journal/entries/` | Bearer Token Header | Calculates total journal count and populates latest reflection card. |
| **Dashboard** | `GET` | `/api/community/connections/`| Bearer Token Header | Calculates active connected peers & incoming requests. |
| **Dashboard** | `GET` | `/api/journal/prompts/today/` | Bearer Token Header | Injects today's daily reflection prompt text. |
| **Journal** | `GET` | `/api/journal/entries/` | Bearer Token Header | Renders list of past reflection entries with timestamps. |
| **Journal** | `POST` | `/api/journal/entries/` | `{ text, mood_score, tags }` | Saves new reflection entry, refreshes dashboard counters & insights. |
| **AI Insights** | `GET` | `/api/insights/summary/` | Bearer Token Header | Renders weekly mood trend chart, sentiment percentages, and AI suggestions. |
| **Community** | `GET` | `/api/community/connections/`| Bearer Token Header | Loads existing chat peer list and pending connection requests. |
| **Community** | `GET` | `/api/community/users/` | `?search=<query>` | Returns user profiles for peer matching. |
| **Community** | `POST` | `/api/community/requests/` | `{ receiver_id }` | Sends peer connection request. |
| **Real-time Chat**| WebSocket| `/ws/chat/<peer_id>/` | `{ message, typing }` | Streams bidirectional instant messages and typing indicators. |
| **Profile** | `POST` | `/api/auth/avatar/` | `{ avatar_id }` | Updates user's anonymous avatar image across all views. |

---

## 4. JavaScript Architecture & Dependencies

The application logic is driven by `app.js` and inline page script handlers:

- **Authentication Manager**: Manages JWT tokens in `localStorage` (`soulcare_token` & `soulcare_refresh`), automatically attaches `Authorization: Bearer <token>` to all API requests, and handles expired token logouts (`401 Unauthorized` handling).
- **Navigation Router**: `showTab(tabName)` toggles visibility of screen containers (`#desk-dashboard`, `#desk-journal`, `#desk-insights`, `#desk-support`, etc.) and syncs active states on bottom nav buttons and sidebar items.
- **Data Patching System**: `_patchDash()` updates user initials, avatar badges (`#m-dash-av`, `#desk-user-av`), and usernames (`#d-dash-username2`, `#d-dash-uname`) across all views simultaneously.
- **Real-Time WebSocket Handler**: Connects to Django Channels WebSocket for peer-to-peer messaging, online status dots (`.online-dot`), and typing status indicators.

---

## 5. Core Business Rules

1. **Authentication Enforcement**:
   - All non-login routes require a valid JWT token.
   - If unauthenticated, `showAuth()` redirects immediately to `/login/` (`login.html`).
2. **Data Consistency**:
   - Saving a new journal entry automatically updates:
     - Dashboard journal count (`#d-dash-journals`, `#m-dash-journals`).
     - Dashboard latest entry card (`#d-dash-latest`, `#m-dash-latest`).
     - AI Insights trend chart & emotion distribution.
3. **Responsive Viewport Rule**:
   - Devices `< 1024px` render the Mobile Shell (`#mob`) with bottom navigation (`#bot-nav`).
   - Devices `>= 1024px` render the Desktop Shell (`#desk`) with fixed left sidebar navigation (`#sidebar`).
4. **Element ID Stability**:
   - All element IDs (`#loginForm`, `#email`, `#password`, `#submitBtn`, `#d-dash-journals`, `#d-journal-input`, etc.) must remain strictly unchanged as JavaScript code relies directly on `document.getElementById()`.

---

## 6. Shared Components Across Views

1. **Brand Headers**: Top bar with SoulCare logo, status indicator, and sign-out action.
2. **Stat Tiles**: Rounded card containers displaying quantitative progress (`Journals`, `Connected`, `Requests`, `Insights`).
3. **Reflection Cards**: Prominent container with custom pill badges and action links (`Write about this →`).
4. **Mood Selection Pills**: Interactive emotion chips (`Great 😊`, `Good 🙂`, `Okay 😐`, `Not good 🙁`, `Awful 😫`).
5. **Chat Bubbles**: Distinct self (`.bubble-self`) and peer (`.bubble-other`) messaging blocks.
6. **Modal Sheets**: Bottom sheet overlay (`#avatar-picker`) and central confirmation popup (`#confirm-modal`).
