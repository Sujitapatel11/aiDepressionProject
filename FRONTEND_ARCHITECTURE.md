# SoulCare Flutter Frontend Architecture Specification

Production-grade, scalable, feature-first **Clean Architecture Blueprint** for the **SoulCare** Flutter application.

---

## 🏗️ 1. Global Directory & Folder Responsibility Map

```
lib/
├── main.dart                          # Application entry point with environment initialization
├── app/                               # Global application configuration, observers, and app lifecycle
│   ├── app.dart                       # Root MaterialApp / MaterialApp.router widget
│   ├── config/                        # Global environment flavors (dev, staging, prod)
│   ├── constants/                     # Global string constants, asset paths, keys
│   ├── navigation/                    # Declarative router configuration (go_router / AutoRouter)
│   └── observer/                      # Global state & route navigation observers
│
├── core/                              # Low-level infrastructure services (App-agnostic)
│   ├── error/                         # Failure & Exception classes, error mappers
│   ├── network/                       # Dio/http HTTP client, interceptors, WebSocket client
│   ├── storage/                       # SecureStorage & Local DB abstraction wrappers
│   ├── theme/                         # Material Design 3 color schemes, typography, card shapes
│   ├── utils/                         # Global helpers, formatters, validators
│   └── usecase/                       # Base UseCase abstract classes
│
├── shared/                            # Reusable domain-agnostic UI & utility components
│   ├── widgets/                       # Reusable buttons, inputs, cards, dialogs, loaders
│   ├── animations/                    # Reusable transitions, particle canvases, shake effects
│   └── extensions/                    # Context, String, Date, and BuildContext extensions
│
└── features/                          # Feature-First Business Domain Modules
    ├── authentication/                # Signup, Login, Google OAuth, Password Reset, Verification
    ├── dashboard/                     # Daily summary metrics, streak counter, quick actions
    ├── journal/                       # Reflective reflections list, editor, soft-delete
    ├── insights/                      # NLP behavioral analytics, emotion cards, dismissal
    ├── support/                       # Big Five matching, peer discovery, support requests
    ├── chat/                          # Real-time WebSocket support chat & message history
    ├── profile/                       # User stats, OCEAN personality visualization, safety plan
    └── settings/                      # Theme switcher, push notifications, data privacy, logout
```

---

## 🧩 2. Feature-First Internal Layer Structure

Every feature module inside `lib/features/<feature_name>/` follows strict Clean Architecture layering:

```
lib/features/<feature_name>/
├── data/                              # Data Layer: Infrastructure implementations
│   ├── datasources/                   # Remote HTTP/WebSocket data sources & Local caches
│   ├── models/                        # DTOs with json_serializable mapping (fromJson/toJson)
│   └── repositories/                  # Repository implementations (implements domain contract)
│
├── domain/                            # Domain Layer: Pure Dart business logic & contracts
│   ├── entities/                      # Pure Dart immutable business objects (Equatable/Freezed)
│   ├── repositories/                  # Repository interfaces (abstract contracts)
│   └── usecases/                      # Single-responsibility business use cases
│
├── presentation/                      # Presentation Layer: UI logic & state controllers
│   ├── controllers/                   # StateNotifier / Cubit / ChangeNotifier controllers
│   ├── states/                        # Immutable UI state classes (Initial, Loading, Success, Failure)
│   └── screens/                       # Top-level screen views / pages
│
├── widgets/                           # Feature-specific reusable UI components
│
└── services/                          # (Optional) Domain helper services (e.g. chat WebSocket manager)
```

---

## 🛠️ 3. Core Architectural Strategies & Technology Stack

### 3.1 State Management Approach
- **Strategy**: **Riverpod (StateNotifierProvider / AsyncNotifier)** or **Bloc / Cubit**.
- **Justification**:
  1. **Separation of Concerns**: Unidirectional data flow (UI -> Event/Method -> Controller -> State -> UI).
  2. **Testability**: Pure state classes and mockable notifier controllers without Flutter framework dependencies (`BuildContext`).
  3. **Zero Leaks**: Automatic provider lifecycle disposal when screens unmount.
  4. **Immutability**: Guarantees predictable UI updates via `freezed` state objects.

---

### 3.2 API Client Structure
- **HTTP Engine**: `Dio` client wrapped inside `core/network/api_client.dart`.
- **Interceptors**:
  - `AuthInterceptor`: Injects `Authorization: Bearer <access_token>` into headers. Automatically catches `401 Unauthorized` to trigger silent JWT refresh via `/api/auth/token/refresh/`.
  - `LoggingInterceptor`: Pretty-prints requests/responses in dev mode (disabled in production).
  - `RetryInterceptor`: Automatic exponential backoff retries for transient network drops (`502`, `503`, `504`).

---

### 3.3 Repository Pattern
- **Abstractions**: Defined in `domain/repositories/` (e.g. `AuthRepository`, `JournalRepository`).
- **Implementations**: Placed in `data/repositories/` (e.g. `AuthRepositoryImpl`).
- **Function**: Hides data source origin (Remote API vs Local Cache) from the domain and presentation layers. Returns type-safe `Either<Failure, T>` or `({Failure? failure, T? data})` record structures.

---

### 3.4 Dependency Injection (DI)
- **Engine**: `get_it` + `injectable` or **Riverpod**.
- **Registration Scopes**:
  1. `Singletons`: `DioClient`, `SecureStorageService`, `AppConfig`, `NetworkInfo`.
  2. `Factory / Feature Providers`: Use Cases, Repositories, Notifiers/Cubits instantiated per screen lifecycle.

---

### 3.5 Secure JWT Storage
- **Engine**: `flutter_secure_storage` inside `core/storage/secure_storage_service.dart`.
- **Storage Keys**: `KEY_ACCESS_TOKEN`, `KEY_REFRESH_TOKEN`, `KEY_USER_ID`, `KEY_USERNAME`.
- **Security Rules**:
  - Encrypted via Keychain (iOS) and AES-GCM KeyStore (Android).
  - Tokens are never written to disk unencrypted, logged, or exposed in error tracebacks.

---

### 3.6 Declarative Routing Strategy
- **Engine**: `go_router` or `AutoRoute`.
- **Features**:
  - Shell Route (`ShellRoute`) for persistent MD3 bottom navigation bar across `Dashboard`, `Journal`, `Insights`, `Connect`, `Profile`.
  - Deep-link support for password reset URLs (`/password-reset-confirm/<uid>/<token>/`).
  - Auth Guard (`redirect` callback): Automatically redirects unauthenticated users to `/login` and authenticated users away from auth screens to `/dashboard`.

---

### 3.7 Material Design 3 Theme Architecture
- **Location**: `core/theme/` (`app_theme.dart`, `app_colors.dart`, `app_typography.dart`).
- **Tokens**:
  - Primary Lavender: `#7C6EF6`
  - Secondary Mint Green: `#8DD8C8`
  - Accent Soft Yellow: `#FFD166`
  - Background: `#F8FAFC` (Light) / `#0F172A` (Dark)
- **Features**: Dynamic Light & Dark Mode support using `ColorScheme.fromSeed` with MD3 elevation, card shapes, and typography.

---

### 3.8 Localization Readiness (i18n)
- **Engine**: `flutter_localizations` with `.arb` translation bundle files in `l10n/`.
- **Generated Code**: Type-safe `AppLocalizations.of(context)!.welcomeBack`.
- **Preparedness**: All UI strings are extracted into translation keys rather than hardcoded string literals.

---

### 3.9 Error Handling Strategy
- **Layer Mapping**:
  - HTTP 400/401/404/500 -> Mapped in Data Layer to `ServerException` / `NetworkException`.
  - `ServerException` -> Transformed by Repository into domain `Failure` (`ServerFailure`, `InvalidCredentialsFailure`, `NetworkFailure`).
- **UI Error Feedback**:
  - Presentation layer converts `Failure` objects into user-friendly localized messages.
  - Interactive feedback via `ShakeWidget` form animations and floating SnackBars.

---

### 3.10 7-State Screen Loading Strategy
Every feature screen explicitly handles 7 UI state states:
1. ⏳ **Loading**: Animated skeleton loaders (`SkeletonLoader`) matching target content shape.
2. 📭 **Empty**: Friendly SVG/illustration placeholder with action call-to-action button.
3. ⚠️ **Error**: Empathetic message card with retry action button.
4. 🔌 **Offline**: Banner warning user of lost internet connection.
5. ✅ **Success**: Fully rendered content with pull-to-refresh (`RefreshIndicator`).
6. ✨ **Animations**: Micro-interactions on buttons, input focus, and card entry.
7. ♿ **Accessibility**: Minimum 48x48dp touch targets, semantic screen reader labels (`Semantics`).

---

### 3.11 Offline Caching Strategy
- **Engine**: `Hive` or `Isar` inside `core/storage/local_cache_service.dart`.
- **Policy**: **Cache-First with Background Revalidation**.
  - On list view load (e.g. Journal or Insights), serve cached entries immediately.
  - Fetch fresh data from backend REST API asynchronously; update UI and local cache seamlessly.

---

### 3.12 Logging Strategy
- **Engine**: `logger` library inside `core/utils/app_logger.dart`.
- **Behavior**:
  - Development: Colorized debug output (Network requests, state changes, WebSocket frames).
  - Staging/Production: Crash reporting via Firebase Crashlytics / Sentry with stripped PII (no JWTs, passwords, or personal reflection content).

---

### 3.13 Multi-Environment Flavor Configuration
- **Location**: `core/config/app_config.dart`
- **Flavors**:
  - `AppConfig.dev`: `http://127.0.0.1:8000`, verbose logging, test Google Client ID.
  - `AppConfig.staging`: `https://staging-api.soulcare.app`, staging analytics.
  - `AppConfig.prod`: `https://api.soulcare.app`, production SSL pinning, error reporting.
