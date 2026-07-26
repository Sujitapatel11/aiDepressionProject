# SoulCare v1.0 — Product Requirements Document (PRD)

Official Product Requirements Specification for **SoulCare v1.0**.

---

## 👁️ 1. Product Vision
SoulCare envisions a world where emotional wellness and mental health support are non-stigmatized, deeply personal, and accessible to everyone. By combining reflective journaling, AI-driven sentiment insights, and anonymized peer support based on psychological trait compatibility, SoulCare provides a safe digital sanctuary for emotional growth.

---

## 🎯 2. Mission Statement
To empower individuals to understand their emotional patterns, gain actionable mental wellness insights, and build meaningful peer support connections through privacy-first technology.

---

## 👥 3. Target Users & User Personas

### Target Demographics
- Young adults, students, and professionals aged 18–38 experiencing daily stress, mild anxiety, emotional burnout, or feelings of isolation.

### User Personas

#### Persona 1: "Mindful Maya" (24, Graduate Student)
- **Background**: Manages high academic pressure; struggles with evening anxiety.
- **Needs**: A safe, private space to express daily thoughts and receive non-judgmental guidance.
- **SoulCare Solution**: Reflective journaling paired with automated AI sentiment insights.

#### Persona 2: "Connected Chris" (29, Remote Software Engineer)
- **Background**: Feels isolated working remotely; desires empathetic peer conversations without social pressure.
- **Needs**: Anonymous, safe peer connections with individuals facing similar life challenges.
- **SoulCare Solution**: Big Five personality-matched peer connections and real-time moderated chat.

---

## 💡 4. Core Problems SoulCare Solves

1. **Isolation in Mental Health Journeys**: Traditional therapy is often expensive or inaccessible, while social media increases comparison anxiety.
2. **Lack of Emotional Self-Awareness**: Users write thoughts down but lack tools to identify underlying mood triggers or recurring anxiety patterns.
3. **Superficial Peer Connections**: Generic chat rooms often result in toxic interactions or lack genuine psychological compatibility.

---

## 💎 5. Value Proposition
- **AI-Powered Self-Reflection**: Transform journal reflections into actionable coping strategies using VADER sentiment analysis.
- **Psychologically Matched Peer Network**: Connect with empathetic peers ranked by Big Five (OCEAN) personality trait compatibility.
- **Privacy-First Sanctuary**: Complete control over journal entries (soft-delete), anonymized peer aliases, and end-to-end security.

---

## 🛣️ 6. User Journey Flow

```
[ Download App ] ──► [ Auth: Signup / Google OAuth ] ──► [ Dashboard Overview ]
                                                                 │
    ┌───────────────────────────┬────────────────────────────────┤
    ▼                           ▼                                ▼
[ Journal Reflection ] ──► [ AI Insight Generation ]   [ Peer Discovery ]
    │                           │                                │
    ▼                           ▼                                ▼
[ Daily Log Saved ]       [ Coping Strategy ]          [ Send/Accept Request ]
                                                                 │
                                                                 ▼
                                                        [ Moderated Live Chat ]
```

---

## 📦 7. MVP Scope (Version 1.0) vs Out of Scope

### In Scope (MVP v1.0)
- User Authentication (Email/Username, Password Reset, Google OAuth2, JWT Refresh/Logout).
- Reflective Journaling (Create, View List, View Detail, Soft-Delete).
- AI Sentiment Insights (VADER Polarity Score -1.0 to 1.0, Mood classification, Keywords, Dismiss card).
- Big Five (OCEAN) Peer Support Matching (Cosine Similarity scoring 0-100%, Request Send/Accept/Reject, Block/Disconnect).
- Executive Dashboard (Daily streak, pending requests, journal preview snippet, unread insight count).
- Real-Time Support Chat (WebSocket channel, crisis moderation keyword filter).

### Out of Scope (V1.0)
- Video / Voice calling.
- Paid professional therapist booking.
- Group community channels.
- In-app subscription payments.

---

## 📋 8. Functional Requirements & Acceptance Criteria

### FR-1: User Authentication
- **Requirement**: Users must be able to register, log in, use Google OAuth, reset passwords, and securely log out.
- **Acceptance Criteria**:
  - Valid signup returns JWT access & refresh tokens.
  - Invalid credentials trigger error shake feedback and inline message.
  - Logging out invalidates the refresh token on the server.

### FR-2: Reflective Journaling
- **Requirement**: Users can write daily reflections and manage past entries.
- **Acceptance Criteria**:
  - Saving a reflection immediately persists it to the database and triggers AI insight generation.
  - Soft-deleting an entry removes it from the user list (`is_deleted=True`).

### FR-3: AI Insights & Sentiment Analytics
- **Requirement**: Users receive automated sentiment analysis on their reflections.
- **Acceptance Criteria**:
  - Display mood classification (`positive`, `neutral`, `negative`, `mixed`), VADER score, and keywords.
  - Dismissing an insight removes it from the main feed.

### FR-4: Smart Peer Matching & Support
- **Requirement**: Users can discover peers matched by personality traits.
- **Acceptance Criteria**:
  - Candidate peers are ranked by Big Five Cosine Similarity (`match_score` 0-100%).
  - Accepting a pending request creates a `SupportConnection` with anonymous aliases.

### FR-5: Real-Time Moderated Chat
- **Requirement**: Connected peers can message each other in real-time.
- **Acceptance Criteria**:
  - WebSocket connection auto-authenticates via JWT query parameter.
  - Messages containing flagged crisis terms trigger safety moderation alerts.

---

## 🔒 9. Non-Functional Requirements

- **Security**: JWT tokens stored encrypted via `flutter_secure_storage`.
- **Performance**: API responses return within < 300ms; smooth 60fps UI animations.
- **Availability**: 99.9% backend uptime on Daphne/ASGI server.
- **Accessibility**: High-contrast text readability (WCAG AA compliant) and 48x48dp minimum tap targets.

---

## 🗺️ 10. Navigation Structure

- **Tab 1: Dashboard** (Overview metrics, daily streak, latest journal preview)
- **Tab 2: Journal** (Reflection list, new entry editor, detail view)
- **Tab 3: Insights** (Sentiment cards, mood trends, coping strategies)
- **Tab 4: Connect** (Personality-matched peer discovery, support requests, connections)
- **Tab 5: Profile & Settings** (OCEAN trait scores, theme toggle, privacy, logout)

---

## 🔮 11. Future Roadmap (v1.5 / v2.0)

- **v1.5**: Weekly mood trend charts, guided breathing audio exercises, push notifications for daily reflections.
- **v2.0**: Verified professional counselor consultations, encrypted voice notes, community group circles.
