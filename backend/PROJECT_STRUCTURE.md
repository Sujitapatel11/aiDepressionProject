# SoulCare Backend - Project Structure & Architecture Analysis

Comprehensive technical documentation of the **SoulCare Django REST & WebSocket Backend Service**.

---

## 📁 1. Complete Folder Tree

```
backend/
├── manage.py                          # Django management entry point
├── db.sqlite3                         # Local SQLite database (dev environment)
├── Procfile                           # Heroku/Daphne production deployment runner
├── nixpacks.toml                      # Nixpacks containerization deployment configuration
├── requirements.txt                   # Python package dependencies (Django, DRF, Channels, VADER, OpenAI, Daphne)
├── runtime.txt                        # Target Python runtime version
├── .env / .env.example                # Environment configuration variables
├── .gitignore                         # Version control ignore definitions
│
├── config/                            # Project Settings & Root Routing
│   ├── __init__.py
│   ├── settings.py                    # Core Django & DRF configuration, CORS, JWT settings, Channel Layers
│   ├── urls.py                        # Root URL routing hub for API apps and templates
│   ├── asgi.py                        # ASGI application entry point (HTTP + WebSockets via Channels)
│   └── exceptions.py                  # Custom REST framework exception handlers
│
├── apps/                              # Core Domain Applications
│   ├── __init__.py
│   │
│   ├── authentication/                # User Auth & JWT Token Management
│   │   ├── apps.py
│   │   ├── serializers.py             # Signup, Login, Google OAuth, Password Reset serializers
│   │   ├── urls.py                    # Endpoint routes (/api/auth/*)
│   │   └── views.py                   # Auth views (signup, login, google_auth, password_reset)
│   │
│   ├── journal/                       # Reflective Journal Entries
│   │   ├── apps.py
│   │   ├── models.py                  # JournalEntry model (soft-delete support)
│   │   ├── serializers.py             # JournalEntrySerializer
│   │   ├── urls.py                    # Endpoint routes (/api/journal/*)
│   │   └── views.py                   # CRUD views with automated AI Insight trigger hook
│   │
│   ├── insights/                      # AI-Driven NLP Sentiment & Emotion Engine
│   │   ├── apps.py
│   │   ├── engine.py                  # Sentiment analysis engine (VADER + Keyword Extraction + OpenAI fallback)
│   │   ├── models.py                  # Insight model with VADER score (-1.0 to 1.0) & emotion tags
│   │   ├── serializers.py             # InsightSerializer
│   │   ├── urls.py                    # Endpoint routes (/api/insights/*)
│   │   └── views.py                   # Insight list, dismiss, and on-demand journal generation
│   │
│   ├── support/                       # Peer Support Matching & Connections
│   │   ├── apps.py
│   │   ├── models.py                  # UserProfile (Big Five OCEAN vector), SupportRequest, SupportConnection
│   │   ├── serializers.py             # UserProfileSerializer, SupportRequestSerializer, SupportConnectionSerializer
│   │   ├── urls.py                    # Endpoint routes (/api/support/*)
│   │   ├── views.py                   # Available peer users (ranked by cosine similarity), send/accept/reject requests
│   │   ├── dashboard_urls.py          # Dashboard analytics route (/api/dashboard/)
│   │   └── dashboard_views.py         # Daily summary metrics view
│   │
│   └── chat/                          # Real-Time WebSocket Support Chat
│       ├── apps.py
│       ├── consumers.py               # AsyncWebsocketConsumer (Real-time message routing, typing, moderation)
│       ├── middleware.py              # JwtAuthMiddleware (WebSocket query string token authentication)
│       ├── models.py                  # Message model (UUID, moderation status), TypingIndicator
│       ├── routing.py                 # WebSocket URL patterns (/ws/chat/<conn_id>/)
│       ├── serializers.py             # MessageSerializer
│       ├── urls.py                    # REST message history route (/api/chat/<conn_id>/messages/)
│       └── views.py                   # Message history REST view
│
└── web/                               # Django Web Front-End Templates
    ├── apps.py
    ├── urls.py                        # Web template route handlers
    ├── views.py                       # Index and Login web views
    ├── static/                        # CSS / JS static assets
    └── templates/                     # Jinja2 HTML templates
```

---

## 🗄️ 2. Models & Database Schemas

### `apps.authentication`
- Uses standard Django `django.contrib.auth.models.User` (`id`, `username`, `email`, `password`, `is_active`, `date_joined`).

### `apps.journal.models.JournalEntry`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `BigAutoField` | Primary Key |
| `user` | `ForeignKey(User)` | Owner of the reflection entry (`related_name='journals'`) |
| `content` | `TextField` | Text content of the reflection |
| `created_at` | `DateTimeField` | Auto timestamp on creation |
| `updated_at` | `DateTimeField` | Auto timestamp on edit |
| `is_deleted` | `BooleanField` | Soft-delete flag (default: `False`) |

### `apps.insights.models.Insight`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `BigAutoField` | Primary Key |
| `user` | `ForeignKey(User)` | Target user (`related_name='insights'`) |
| `journal` | `OneToOneField(JournalEntry)` | Optional linked journal entry (`null=True, blank=True`) |
| `title` | `CharField(255)` | Synthesized summary headline |
| `message` | `TextField` | AI feedback / coping strategy suggestion |
| `mood` | `CharField(16)` | Mood classification (`positive`, `neutral`, `negative`, `mixed`) |
| `sentiment_score` | `FloatField` | VADER compound score (-1.0 to +1.0) |
| `keywords` | `JSONField` | Extracted top topic keywords |
| `emotion_tags` | `JSONField` | Array of emotion tags (e.g. `["anxious", "hopeful"]`) |
| `source_window_start` | `DateTimeField` | Analysis timeframe start |
| `source_window_end` | `DateTimeField` | Analysis timeframe end |
| `is_read` | `BooleanField` | Read status |
| `is_dismissed` | `BooleanField` | User dismissal state |
| `created_at` | `DateTimeField` | Timestamp |

### `apps.support.models`
#### `UserProfile` (Big Five OCEAN Vector)
- `user`: `OneToOneField(User)`
- `openness`, `conscientiousness`, `extraversion`, `agreeableness`, `neuroticism`: `FloatField(default=0.5)`
- `dominant_emotion`: `CharField(default="neutral")`

#### `SupportRequest`
- `request_id`: `UUIDField` (unique)
- `from_user`: `ForeignKey(User, related_name="sent_support_requests")`
- `to_user`: `ForeignKey(User, related_name="received_support_requests")`
- `status`: `CharField` (`pending`, `accepted`, `rejected`, `expired`)
- `expires_at`: `DateTimeField` (Default: 7 days)

#### `SupportConnection`
- `connection_id`: `UUIDField` (unique)
- `user_one`, `user_two`: `ForeignKey(User)` (canonical order: `user_one_id < user_two_id`)
- `status`: `CharField` (`active`, `blocked`, `disconnected`)
- `alias_user_one`, `alias_user_two`: `CharField` (anonymous peer display names)

### `apps.chat.models.Message`
- `message_id`: `UUIDField`
- `connection`: `ForeignKey(SupportConnection)`
- `sender`, `receiver`: `ForeignKey(User)`
- `content`: `TextField`
- `moderation_status`: `CharField` (`clean`, `flagged`, `blocked`)
- `created_at`: `DateTimeField`

---

## 🔗 3. Database Relationships

- **User -> JournalEntry**: One-to-Many (`User.journals`)
- **User -> Insight**: One-to-Many (`User.insights`)
- **User -> UserProfile**: One-to-One (`User.profile` - OCEAN Big Five personality vector)
- **JournalEntry -> Insight**: One-to-One (`JournalEntry.insight`)
- **User -> SupportRequest**: One-to-Many (`from_user` and `to_user`)
- **User -> SupportConnection**: One-to-Many (`user_one` and `user_two`)
- **SupportConnection -> Message**: One-to-Many (`SupportConnection.messages`)

---

## 🌐 4. Endpoints & REST APIs

### Authentication (`/api/auth/`)
| Method | Route | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup/` | Create account & return JWT | No |
| `POST` | `/api/auth/login/` | Username/Email login & return JWT | No |
| `POST` | `/api/auth/google/` | Verify Google ID token & return JWT | No |
| `POST` | `/api/auth/logout/` | Blacklist refresh token | Yes |
| `POST` | `/api/auth/password/reset/` | Send password reset email | No |
| `POST` | `/api/auth/token/refresh/` | Obtain fresh access token | Refresh Token |

### Journal (`/api/journal/`)
| Method | Route | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/journal/` | List active reflections for current user | Yes |
| `POST` | `/api/journal/` | Create entry & trigger AI insight | Yes |
| `GET` | `/api/journal/<id>/` | View reflection details | Yes |
| `PATCH` | `/api/journal/<id>/` | Update reflection text | Yes |
| `DELETE` | `/api/journal/<id>/` | Soft-delete entry | Yes |

### Insights (`/api/insights/`)
| Method | Route | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/insights/` | Retrieve non-dismissed AI insights | Yes |
| `POST` | `/api/insights/dismiss/<id>/` | Dismiss an insight card | Yes |
| `POST` | `/api/insights/generate/<journal_id>/` | Trigger on-demand analysis | Yes |

### Support & Peer Network (`/api/support/`)
| Method | Route | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/support/users/` | Get available peer matches (Cosine similarity ranked) | Yes |
| `POST` | `/api/support/send/<user_id>/` | Send support request | Yes |
| `GET` | `/api/support/requests/` | List incoming pending requests | Yes |
| `GET` | `/api/support/requests/sent/` | List sent pending requests | Yes |
| `POST` | `/api/support/accept/<req_id>/` | Accept request & create connection | Yes |
| `POST` | `/api/support/reject/<req_id>/` | Reject support request | Yes |
| `GET` | `/api/support/connections/` | List active peer connections | Yes |
| `POST` | `/api/support/connections/<conn_id>/block/` | Block peer connection | Yes |
| `POST` | `/api/support/connections/<conn_id>/disconnect/` | Disconnect peer partner | Yes |
| `GET` | `/api/support/personality/` | View Big Five OCEAN scores | Yes |

### Dashboard (`/api/dashboard/`)
| Method | Route | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/` | Executive daily summary metrics & streak | Yes |

### Chat REST & WebSockets (`/api/chat/`, `/ws/chat/`)
| Protocol | Route | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/chat/<conn_id>/messages/` | Retrieve historical chat messages | Yes (JWT) |
| `WS` | `/ws/chat/<conn_id>/?token=<jwt>` | Real-time WebSocket connection | Yes (JWT query string) |

---

## ⚡ 5. Services & Engine Architecture

### Natural Language Processing (NLP) Engine (`apps/insights/engine.py`)
1. **VADER Sentiment Analysis**: Computes compound polarity score between `-1.0` (extremely negative) and `+1.0` (extremely positive).
2. **Keyword Extraction**: Extracts high-frequency emotional topics.
3. **Emotion Tag Mapping**: Identifies core emotions (e.g. `anxiety`, `gratitude`, `grief`, `hope`).
4. **Personality Update**: Dynamically recalculates the user's Big Five OCEAN scores (`UserProfile`) after each journal entry to optimize peer matching accuracy.
5. **OpenAI / Rule-based Fallback**: Generates empathetic, actionable coping recommendations.

### Peer Matching Service (`apps/support/views.py`)
- Calculates **Cosine Similarity** between `UserProfile.personality_vector()` of available candidates and the requesting user.
- Filters out blocked users, existing connections, and pending requests.

### Real-Time Chat System (`apps/chat/consumers.py` & `middleware.py`)
- **JwtAuthMiddleware**: Decodes JWT access token directly from the WebSocket connection query parameter (`ws://.../?token=...`).
- **Safety Moderation**: Scans live messages for crisis keywords before broadcasting.

---

## 🔒 6. Authentication Architecture

- **Token Type**: JSON Web Tokens (JWT) using `rest_framework_simplejwt`.
- **Header Format**: `Authorization: Bearer <access_token>`
- **Token Blacklisting**: Enabled via `rest_framework_simplejwt.token_blacklist` upon logout.
- **Social Login**: Google OAuth ID token verification via `google.oauth2.id_token.verify_oauth2_token`.
