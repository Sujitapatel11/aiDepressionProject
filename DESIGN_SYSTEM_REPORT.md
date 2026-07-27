# SoulCare Design System (Step 1) Architecture Report

**Report Version**: 1.0.0  
**Implementation Phase**: Step 1 — Standalone Material 3 Design System Architecture  
**Execution Date**: July 27, 2026  
**Author**: Principal Flutter Architect & Senior UI Engineer  
**Code Modification Status**: **ZERO CODE MODIFICATION TO EXISTING FEATURES / SCREENS**  

---

## 1. Executive Summary

A standalone, production-ready, Material 3 compliant **Design System** has been constructed for the **SoulCare** platform under `lib/design_system/`. 

In strict adherence to Step 1 directives:
- **Zero screens were redesigned**.
- **Zero existing business logic was modified**.
- **Zero controllers, repositories, API contracts, navigation, or state management classes were altered**.
- All design system assets (colors, typography, spacing, radius, shadows, animations, icons, and theme bindings) were introduced as reusable, type-safe constants without duplicating values.

---

## 2. Directory Structure & Files Created

```text
lib/design_system/
├── design_system.dart         # Single-point barrel export file
├── colors/
│   └── app_colors.dart        # Mental wellness palette & Material 3 ColorSchemes
├── typography/
│   └── app_typography.dart    # Plus Jakarta Sans M3 Type Scale (Display, Headline, Title, Body, Label)
├── spacing/
│   └── app_spacing.dart       # Spacing grid tokens (4 to 48 dp), SizedBox gaps & EdgeInsets
├── radius/
│   └── app_radius.dart        # Small (8), Medium (16), Large (24), Pill (9999) corner radii
├── shadows/
│   └── app_shadows.dart       # Soft elevation, card, sheet, and glow shadow tokens
├── animations/
│   └── app_animations.dart    # Motion durations (150ms to 800ms) & M3 curves
├── icons/
│   └── app_icons.dart         # Icon size tokens (16 to 48 dp) & domain IconData tokens
└── theme/
    └── soulcare_theme.dart    # Material 3 Light & Dark ThemeData builders
```

---

## 3. Detailed Purpose of Every Created File

### A. [`colors/app_colors.dart`](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/lib/design_system/colors/app_colors.dart)
- **Purpose**: Centralizes the complete mental wellness brand color system.
- **Tokens Included**:
  - Primary: Lavender Purple (`#7C6EF6` Light / `#A78BFA` Dark)
  - Secondary: Soft Indigo (`#6366F1` Light / `#818CF8` Dark)
  - Accents: Mint Green (`#10B981`), Warm Yellow (`#FFD166`), Coral Accent (`#F43F5E`)
  - Backgrounds: Calm White (`#FAFAFC`), Deep Charcoal (`#0F172A`), Slate (`#1E293B`)
  - Mood Scale (1–5): Very Bad (`#F87171`), Bad (`#FBBF24`), Neutral (`#FACC15`), Good (`#4ADE80`), Very Good (`#60A5FA`)
  - Complete `lightColorScheme` and `darkColorScheme` getters powering Material 3.

### B. [`typography/app_typography.dart`](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/lib/design_system/typography/app_typography.dart)
- **Purpose**: Establishes the Plus Jakarta Sans type hierarchy conforming strictly to Material 3 specifications.
- **Tokens Included**:
  - `displayLarge`, `displayMedium`, `displaySmall` (36–57 px)
  - `headlineLarge`, `headlineMedium`, `headlineSmall` (24–32 px)
  - `titleLarge`, `titleMedium`, `titleSmall` (14–22 px)
  - `bodyLarge`, `bodyMedium`, `bodySmall` (12–16 px)
  - `labelLarge`, `labelMedium`, `labelSmall` (11–14 px)
  - `lightTextTheme` and `darkTextTheme` generators.

### C. [`spacing/app_spacing.dart`](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/lib/design_system/spacing/app_spacing.dart)
- **Purpose**: Eliminates hardcoded numerical padding and gap values across screens.
- **Tokens Included**:
  - Base Tokens: `4, 8, 12, 16, 20, 24, 32, 40, 48` dp.
  - Reusable Vertical SizedBox Gaps: `AppSpacing.gapV4` through `AppSpacing.gapV48`.
  - Reusable Horizontal SizedBox Gaps: `AppSpacing.gapH4` through `AppSpacing.gapH48`.
  - Padding Shortcuts: `AppSpacing.screenPadding`, `cardPadding`, `modalPadding`.

### D. [`radius/app_radius.dart`](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/lib/design_system/radius/app_radius.dart)
- **Purpose**: Standardizes corner curvature across input fields, cards, modal sheets, and buttons.
- **Tokens Included**:
  - `small`: 8.0 dp (Buttons & Small Badges)
  - `medium`: 16.0 dp (Dialogs & Medium Cards)
  - `large`: 24.0 dp (Main Cards & Containers)
  - `pill`: 9999.0 dp (Pill Buttons & Stadium Borders)
  - Specialized `topSheetLarge` for bottom sheets.

### E. [`shadows/app_shadows.dart`](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/lib/design_system/shadows/app_shadows.dart)
- **Purpose**: Replaces harsh box shadows with layered, subtle elevation shadows suited for mental wellness UI elements.
- **Tokens Included**:
  - `lightSmall`, `lightMedium`, `lightLarge`
  - `darkSmall`, `darkMedium`, `darkLarge`
  - `brandGlow`: Soft lavender glow shadow for focused states.

### F. [`animations/app_animations.dart`](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/lib/design_system/animations/app_animations.dart)
- **Purpose**: Standardizes motion timing and curves across all micro-interactions.
- **Tokens Included**:
  - Durations: `fast` (150ms), `normal` (300ms), `slow` (500ms), `extraSlow` (800ms).
  - Motion Curves: `standard`, `emphasized`, `decelerate`, `accelerate`, `calmEase`, `gentleSpring`.

### G. [`icons/app_icons.dart`](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/lib/design_system/icons/app_icons.dart)
- **Purpose**: Standardizes icon dimensions and maps domain icon constants.
- **Tokens Included**:
  - Size Tokens: `sizeXSmall` (16), `sizeSmall` (20), `sizeMedium` (24), `sizeLarge` (32), `sizeXLarge` (48).
  - Mapped Icons: `home`, `journal`, `mood`, `community`, `profile`, `aiInsight`, `reflection`, `support`, `chat`, etc.

### H. [`theme/soulcare_theme.dart`](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/lib/design_system/theme/soulcare_theme.dart)
- **Purpose**: Glues together all design tokens into cohesive Material 3 Light and Dark `ThemeData` instances.
- **Sub-Themes Configured**:
  - `ColorScheme` & `TextTheme`
  - `AppBarTheme` (Transparent, scrolledUnderElevation 0)
  - `CardTheme` (BorderRadius 24, zero elevation)
  - `InputDecorationTheme` (BorderRadius 20, 1.2px borders, active lavender focus)
  - `ElevatedButtonTheme` & `OutlinedButtonTheme` (StadiumBorder, 52px height)
  - `NavigationBarTheme` & `BottomSheetTheme` (Rounded top corners 28px)
  - `DialogTheme` (BorderRadius 24px)

### I. [`design_system.dart`](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/lib/design_system/design_system.dart)
- **Purpose**: Barrel export file allowing clean single-line imports in future feature screens (`import 'package:soulcare/design_system/design_system.dart';`).

---

## 4. How Existing Screens Can Migrate Later (Phase 2 Guidance)

To migrate existing screens (e.g. [`journal_screen.dart`](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/lib/presentation/screens/journal_screen.dart) or [`login_screen.dart`](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/lib/presentation/screens/login_screen.dart)) to the new Design System in future steps without breaking business logic:

### Step-by-Step Migration Pattern

1. **Import the Design System Barrel File**:
   ```dart
   import '../../design_system/design_system.dart';
   ```

2. **Replace Hardcoded Colors with Theme Properties**:
   - *Before*: `backgroundColor: const Color(0xFFF7F5FA)`
   - *After*: `backgroundColor: Theme.of(context).colorScheme.background`
   - *Before*: `color: const Color(0xFF6750A4)`
   - *After*: `color: Theme.of(context).colorScheme.primary`

3. **Replace Raw Numbers with Spacing & Radius Tokens**:
   - *Before*: `const SizedBox(height: 16)`
   - *After*: `AppSpacing.gapV16`
   - *Before*: `BorderRadius.circular(20)`
   - *After*: `AppRadius.medium`

4. **Replace Hardcoded TextStyles with M3 Type Scale**:
   - *Before*: `const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)`
   - *After*: `Theme.of(context).textTheme.titleLarge`

5. **Update Main App Theme In [`main.dart`](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/lib/main.dart)**:
   - *Before*: `theme: AppTheme.lightTheme`
   - *After*: `theme: SoulCareTheme.lightTheme, darkTheme: SoulCareTheme.darkTheme`

---

## 5. Verification & Zero Regression Assurance

- **Zero Modifications to `lib/features/`**: Confirmed.
- **Zero Modifications to `lib/presentation/`**: Confirmed.
- **Zero Modifications to `lib/data/` or `lib/domain/`**: Confirmed.
- **Compilation Check**: All 9 created files in `lib/design_system/` compile with 0 syntax or type errors.

---
*Report compiled by Antigravity Principal Flutter Architect Engine.*
