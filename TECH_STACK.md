# SoulCare Flutter Technology Stack Specification

Production-Ready Technology Stack Recommendation for the **SoulCare** Flutter Application.

---

## 🛠️ 1. Core Technical Recommendations

### 1. Flutter SDK Version
- **Recommendation**: **Flutter 3.29.x (Stable) / Dart 3.7.x**
- **Justification**: Provides native Material Design 3 support, compile-time record types, pattern matching, enhanced WebAssembly (Wasm) support, and maximum long-term stability.

---

### 2. State Management
- **Single Recommendation**: **Riverpod (Flutter Riverpod 2.x + AsyncNotifier / Notifier)**
- **Justification**:
  - **Single Source of Truth**: Eliminates `BuildContext` lookup errors (`ProviderNotFoundException`).
  - **Async Value Handling**: Built-in `AsyncValue` type natively handles `loading`, `data`, and `error` states for all API calls.
  - **Auto-Dispose**: Automatically cleans up controllers and WebSocket stream listeners when screens unmount.
  - **Compile-Time Safety**: Catches missing or invalid state providers during build time.

---

### 3. Routing
- **Recommendation**: **`go_router`**
- **Justification**: Official Flutter package for declarative routing. Supports deep linking (`/password-reset-confirm/<uid>/<token>/`), nested shell routes for persistent bottom navigation bars, and global authentication redirects.

---

### 4. HTTP Client
- **Recommendation**: **`dio`**
- **Justification**: Built-in support for request/response interceptors (`AuthInterceptor` for automatic JWT Bearer injection and silent `401` refresh), form-data uploads, request cancellation tokens, and configurable timeouts.

---

### 5. Dependency Injection
- **Recommendation**: **`flutter_riverpod` (Compile-time DI)**
- **Justification**: Riverpod serves dual functions as state manager and dependency injector, removing the need for third-party service locators like `get_it`.

---

### 6. Secure Storage
- **Recommendation**: **`flutter_secure_storage`**
- **Justification**: Uses Keychain for iOS and KeyStore with AES-GCM encryption for Android. Ensures JWT access/refresh tokens are never stored in unencrypted storage.

---

### 7. Local Database / Caching
- **Recommendation**: **`hive_ce` (Community Edition)**
- **Justification**: High-performance, lightweight key-value database written in pure Dart. Serves Cache-First offline storage for journal entries and AI insights without native C++ compilation overhead.

---

### 8. Image Caching
- **Recommendation**: **`cached_network_image`**
- **Justification**: Automatically caches remote avatars and illustration assets in disk and memory with smooth fade-in transitions and skeleton placeholder widgets.

---

### 9. WebSocket Library
- **Recommendation**: **`web_socket_channel`**
- **Justification**: Official Dart library for bidirectional WebSocket communication. Seamlessly manages stream subscription channels for `/ws/chat/<conn_id>/?token=<jwt>`.

---

### 10. JSON Serialization
- **Recommendation**: **`json_annotation` + `json_serializable` + `build_runner`**
- **Justification**: Generates compile-time type-safe JSON parsers (`fromJson`/`toJson`), avoiding manual dictionary key typos and runtime type cast exceptions.

---

### 11. Environment Configuration
- **Recommendation**: **Compile-time `--dart-define-from-file` (JSON / ENV config)**
- **Justification**: Securely injects base API URLs, Google OAuth client IDs, and flags directly into the binary at compile-time without storing credentials in runtime assets.

---

### 12. Logging
- **Recommendation**: **`logger`**
- **Justification**: Provides colorized output with stack traces, log levels (`debug`, `info`, `warning`, `error`), and custom output formatters. Strips logs automatically in production builds.

---

### 13. Crash Reporting
- **Recommendation**: **`sentry_flutter` or `firebase_crashlytics`**
- **Justification**: Captures unhandled Flutter framework errors, native crashes, and HTTP failure breadcrumbs in real-time.

---

### 14. Analytics
- **Recommendation**: **`firebase_analytics`**
- **Justification**: Industry standard for tracking screen views, user retention, check-in engagement, and conversion metrics anonymously.

---

### 15. Form Validation
- **Recommendation**: **Pure Dart Custom Validation Rules (within Presentation Controllers)**
- **Justification**: Avoids heavy form library bloat while delivering instant inline field validation, error shake triggers, and custom message strings.

---

### 16. Network Connectivity Monitoring
- **Recommendation**: **`connectivity_plus`**
- **Justification**: Monitors cellular, Wi-Fi, and offline status changes to notify the application when to display offline banners or retry failed REST requests.

---

### 17. Animation Libraries
- **Recommendation**: **`flutter_animate` & `lottie`**
- **Justification**:
  - `flutter_animate`: Declarative micro-animations (fade, scale, slide, shimmer) on widgets using concise syntax (`widget.animate().fade().slideY()`).
  - `lottie`: Renders vector animations for celebratory and mindful feedback states.

---

### 18. Internationalization (i18n)
- **Recommendation**: **`flutter_localizations` + `intl`**
- **Justification**: Standard Flutter localization framework using `.arb` translation files for seamless multi-language expansion.

---

### 19. Testing Strategy
1. **Unit Tests (`test` & `mocktail`)**:
   - Test Use Cases, Notifiers, Data Sources, and Repository logic independently using mock HTTP responses and mock repositories.
2. **Widget Tests (`flutter_test`)**:
   - Verify individual UI components, form validation rules, skeleton loaders, and theme token rendering.
3. **Integration Tests (`integration_test`)**:
   - Automated end-to-end user flows (Login -> Dashboard -> Journal Entry -> Logout) running against a test server.

---

## 📦 2. Production `pubspec.yaml` Package List

```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter

  # Architecture & State
  flutter_riverpod: ^2.6.1
  riverpod_annotation: ^2.6.1

  # Networking & WebSockets
  dio: ^5.7.0
  web_socket_channel: ^3.0.1
  connectivity_plus: ^6.1.1

  # Navigation & Routing
  go_router: ^14.8.0

  # Storage & Security
  flutter_secure_storage: ^9.2.4
  hive_ce: ^2.9.0
  hive_ce_flutter: ^2.2.0

  # UI, Micro-Animations & Theme
  google_fonts: ^6.2.1
  flutter_animate: ^4.5.2
  lottie: ^3.3.1
  cached_network_image: ^3.4.1

  # Utilities & JSON
  intl: ^0.19.0
  json_annotation: ^4.9.0
  logger: ^2.5.0
  equatable: ^2.0.7

dev_dependencies:
  flutter_test:
    sdk: flutter
  integration_test:
    sdk: flutter

  # Code Generation
  build_runner: ^2.4.14
  json_serializable: ^6.9.0
  riverpod_generator: ^2.6.3
  hive_ce_generator: ^2.1.0

  # Testing & Mocks
  mocktail: ^1.0.4
  flutter_lints: ^5.0.0
```

---

## ❌ 3. Packages Intentionally Avoided & Justification

| Avoided Package | Why We Avoid It | Recommended Alternative |
| :--- | :--- | :--- |
| **`GetX` (`get`)** | Violates Clean Architecture by coupling state, navigation, and dependency injection into a monolithic global state. Causes memory leaks and untestable code. | `flutter_riverpod` + `go_router` |
| **`SharedPreferences`** | Stores data unencrypted in plain XML/plist files on disk. Insecure for storing JWT tokens or user reflection data. | `flutter_secure_storage` & `hive_ce` |
| **Bare `http` Package** | Lacks built-in request/response interceptors, global headers, and automatic refresh token mechanics. | `dio` |
| **`Provider` (Legacy)** | Relies heavily on `BuildContext` lookups, throws runtime `ProviderNotFoundException`, and lacks native async state primitives. | `flutter_riverpod` |
| **`flutter_bloc`** | Requires significant boilerplate code for straightforward UI states, slowing down startup iteration velocity. | `flutter_riverpod` |
