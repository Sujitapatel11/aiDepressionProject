# SoulCare Flutter Engineering & Coding Standards

Mandatory engineering guidelines and coding standards for all **SoulCare** Flutter application contributors.

---

## 🔤 1. Naming Conventions

| Artifact Category | Format | Example |
| :--- | :--- | :--- |
| **Files & Directories** | `snake_case` | `journal_entry_card.dart`, `auth_repository_impl.dart` |
| **Classes & Enums** | `PascalCase` | `SoulCareLoginScreen`, `AuthRepositoryImpl` |
| **Widgets** | `PascalCase` | `PeacefulPersonIllustration`, `PrimaryGradientButton` |
| **Riverpod Providers** | `camelCase` + `Provider` | `authNotifierProvider`, `journalListProvider` |
| **Repositories (Domain)** | `PascalCase` + `Repository` | `AuthRepository`, `JournalRepository` |
| **Repositories (Data)** | `PascalCase` + `RepositoryImpl`| `AuthRepositoryImpl`, `JournalRepositoryImpl` |
| **UseCases** | `PascalCase` Verb Phrase | `GetDailyInsights`, `SendSupportRequest` |
| **DTOs (Data Models)** | `PascalCase` + `Dto` / `Model` | `JournalEntryDto`, `UserSerializerModel` |
| **Entities (Domain)** | `PascalCase` | `JournalEntry`, `InsightCard`, `UserProfile` |
| **Variables & Methods** | `camelCase` | `isPasswordVisible`, `onLoginPressed()` |
| **Constants** | `lowerCamelCase` | `appPaddingHorizontal`, `defaultElevation` |

---

## 📂 2. Folder Boundaries & Architectural Ownership

### `presentation/`
- **Allowed**: Screens, Controllers (`Notifier` / `StateNotifier`), UI States, and view-only logic.
- **Forbidden**: Raw `http`/`dio` calls, SQL/Hive queries, business calculation algorithms.

### `domain/`
- **Allowed**: Pure Dart Entities, Abstract Repositories, UseCase classes, Domain Failures.
- **Forbidden**: Flutter framework imports (`package:flutter/...`), JSON parsing logic, HTTP data sources.

### `data/`
- **Allowed**: Remote HTTP Data Sources, WebSocket clients, Local DB caches, DTO models with `fromJson`/`toJson`, Repository implementations.
- **Forbidden**: UI widgets, state controllers, direct UI rendering dependencies.

### `widgets/`
- **Allowed**: Reusable presentational components and micro-animation wrappers.
- **Forbidden**: Direct network API invocations or mutation of global app state.

---

## 🧩 3. Widget Guidelines

1. **Maximum Widget File Length**: **150 Lines**. If a widget file exceeds 150 lines, split it into smaller private or shared sub-widgets (`_EmailInputField`, `_GradientSubmitButton`).
2. **StatelessWidget vs ConsumerWidget**:
   - Use `StatelessWidget` for purely presentational components receiving primitive callbacks.
   - Use `ConsumerWidget` / `ConsumerStatefulWidget` when subscribing to Riverpod providers.
3. **Reusable Widget Policy**:
   - Never duplicate buttons, input fields, or cards across screens. Place app-wide components inside `lib/shared/widgets/`.

---

## ⚡ 4. State Management Rules (Riverpod Only)

1. **Notifier Architecture**: Use `Notifier` for synchronous state and `AsyncNotifier` for asynchronous data fetching.
2. **Provider Naming**: Always suffix provider instances with `Provider` (e.g. `journalControllerProvider`).
3. **AsyncValue Usage**: UI screens MUST handle `AsyncValue` using `.when(data: ..., loading: ..., error: ...)` to guarantee complete state coverage.
4. **Zero State Mutation in UI**: Widgets must never mutate state directly; they call methods on state controllers.

---

## 🌐 5. Networking & Data Flow Rules

1. **Dio Only**: All REST calls must route through the centralized `Dio` client in `core/network/`.
2. **Repository Abstraction**: UI and UseCases consume repository interfaces; they never instantiate data sources directly.
3. **Forbidden Action**: NEVER make direct API calls (`http.get(...)` / `dio.post(...)`) from a Widget or Screen view file.

---

## 🎨 6. Theme & Design Tokens Enforcement

1. **Zero Hardcoded Colors**: Never use `Color(0xFF...)` or `Colors.blue` inside screen widgets.
   - **Correct**: `Theme.of(context).colorScheme.primary` or `AppTheme.lavenderPrimary`.
2. **Zero Hardcoded Text Styles**: Never write `TextStyle(fontSize: 16, color: Colors.black)` manually in screens.
   - **Correct**: `Theme.of(context).textTheme.titleMedium`.
3. **Spacing Tokens**: Use `AppTheme.paddingHorizontal` and `AppTheme.cardRadius` instead of arbitrary magic numbers (`13.5`).

---

## ⚠️ 7. Error Handling & User Feedback

1. **User-Friendly Messaging**: Convert low-level HTTP errors (`500 Server Error`, `SocketException`) into empathetic, actionable user strings ("Unable to connect. Please check your network connection.").
2. **Silent Log Inspection**: Log full tracebacks silently using `AppLogger.e()` for debugging.
3. **Shake & Snackbar Feedback**: Form validation errors trigger `ShakeWidget` animations and floating SnackBars with haptic feedback.

---

## ⚡ 8. Performance Standards

1. **`const` Constructors**: Mark every widget constructor and immutable sub-tree as `const`.
2. **Lazy Loading**: Use `ListView.builder()` or `CustomScrollView` for lists; never render unbounded `Column` children for dynamic datasets.
3. **Cached Network Images**: Use `CachedNetworkImage` with skeleton placeholders for all remote avatars and graphics.
4. **Targeted Rebuilds**: Use `ref.watch(provider.select(...))` to listen only to specific field changes and prevent unnecessary whole-screen rebuilds.

---

## 🔒 9. Security & Privacy Standards

1. **Secure Token Storage**: Store JWT access & refresh tokens exclusively in `flutter_secure_storage`.
2. **Never Log Sensitive Information**: NEVER print passwords, authorization tokens, or raw user reflection content in console logs.
3. **SSL Pinning**: Production builds enforce HTTPS certificate validation.

---

## 🌿 10. Git Standards & Branch Hygiene

### Branch Naming Convention
- Feature: `feature/login-wireframe-redesign`
- Bugfix: `fix/jwt-token-refresh-error`
- Refactor: `refactor/journal-repository-clean-arch`

### Commit Message Format
```
<type>(<scope>): <short summary>

Types: feat, fix, refactor, docs, test, chore
Example: feat(auth): implement wireframe-matched login screen with gradient continue button
```

---

## 📋 11. Code Review Checklist

- [ ] Does the implementation strictly follow Clean Architecture layer boundaries?
- [ ] Is business logic completely separated from UI widgets?
- [ ] Are all 7 UI states (Loading, Empty, Error, Offline, Success, Animations, Accessibility) handled?
- [ ] Are design tokens used instead of hardcoded colors or font sizes?
- [ ] Are `const` constructors applied wherever possible?
- [ ] Are JWT tokens stored exclusively in `SecureStorageService`?
- [ ] Are unit/widget tests provided for new controllers and use cases?

---

## ✅ 12. Definition of Done (DoD)

A feature is considered **Done** only when:
1. Code compiles with zero warnings or static analysis lint errors (`flutter analyze`).
2. UI matches approved designs down to spacing, color tokens, and micro-interactions.
3. Feature integrates successfully with the local Django server (`http://127.0.0.1:8000`).
4. Automated unit/widget tests pass (`flutter test`).
5. `walkthrough.md` is updated with verification steps and visual proof.
