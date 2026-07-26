# SoulCare Official Design System & Visual Language

Official Design System Specification for **SoulCare** — a premium startup-grade emotional wellness platform.

---

## 🌿 1. Brand Personality & Core Emotions

SoulCare is designed to evoke **Calm**, **Trust**, **Hope**, **Safety**, and **Human Connection**.
- **Not Clinical or Sterile**: Soft, organic shapes, warm lighting, and gentle gradients replace rigid rectangular borders and harsh blues.
- **Mindful & Non-Intrusive**: Interface elements step back to allow emotional reflection without visual clutter.
- **Empathetic Micro-Feedback**: Animations breathe smoothly, simulating deep breathing rhythms.

---

## ✨ 2. Design Principles

1. **Clarity Over Complexity**: Minimalist screen hierarchy focusing on one core emotional action per view.
2. **Organic Softness**: Generous border radii (20px to 32px), subtle glassmorphism cards, and soft ambient drop shadows.
3. **Intentional Motion**: Smooth 300ms–600ms bezier curve transitions that reassure rather than startle the user.
4. **Accessible Harmony**: High contrast readability paired with soothing pastel background hues.

---

## 🎨 3. Color Tokens

### Primary Brand Palette
| Token Name | Hex Code | HSL / RGB | Purpose |
| :--- | :--- | :--- | :--- |
| `colorLavenderPrimary` | `#7C6EF6` | `hsl(246, 89%, 70%)` | Primary brand actions, active toggles, key headlines |
| `colorMintSecondary` | `#8DD8C8` | `hsl(167, 51%, 70%)` | Success indicators, wellness streak accents, growth tags |
| `colorSoftYellowAccent`| `#FFD166` | `hsl(42, 100%, 70%)` | Warm sun accents, positive mood tags, energy highlights |
| `colorDeepSlateText` | `#1E293B` | `hsl(217, 33%, 17%)` | Primary high-contrast body typography |
| `colorMutedText` | `#64748B` | `hsl(215, 16%, 47%)` | Secondary subtitles, timestamps, field hints |
| `colorAppBackground` | `#F8FAFC` | `hsl(210, 40%, 98%)` | Light mode canvas background |
| `colorDarkBackground` | `#0F172A` | `hsl(222, 47%, 11%)` | Dark mode canvas background |
| `colorCardLight` | `#FFFFFF` | `hsl(0, 0%, 100%)` | Elevated surface canvas |
| `colorCardDark` | `#1E293B` | `hsl(217, 33%, 17%)` | Dark mode elevated surface canvas |
| `colorErrorSoft` | `#EF4444` | `hsl(0, 84%, 60%)` | Error indicators & shake alerts |

---

## 🔤 4. Typography Scale

Font Families: **Plus Jakarta Sans** (Headings) & **Inter** (Body text)

| Token Name | Size / Weight | Line Height | Letter Spacing | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `displayLarge` | 32sp / Bold (700) | 40sp | -0.8px | Screen title hero headers |
| `headlineMedium` | 24sp / SemiBold (600)| 32sp | -0.4px | Section headers, card titles |
| `titleMedium` | 18sp / Medium (500) | 26sp | 0.0px | Input labels, action buttons |
| `bodyLarge` | 16sp / Regular (400) | 24sp | +0.15px | Main reflection body text |
| `bodyMedium` | 14sp / Regular (400) | 20sp | +0.25px | Secondary card text, descriptions |
| `labelSmall` | 12sp / Medium (500) | 16sp | +0.4px | Captions, timestamps, badges |

---

## 📏 5. Spacing System (8pt Grid)

| Spacing Token | Pixel Value | Typical Application |
| :--- | :--- | :--- |
| `space4` | 4dp | Micro gap between icon and label |
| `space8` | 8dp | Tight gap between related form fields |
| `space12` | 12dp | Medium gap inside compact chips |
| `space16` | 16dp | Standard horizontal screen padding |
| `space24` | 24dp | Card internal padding, section breaks |
| `space32` | 32dp | Hero section top/bottom padding |
| `space48` | 48dp | Large screen break |

---

## ⭕ 6. Border Radius Scale

- `radiusSmall`: 12dp (Chips, small badges)
- `radiusMedium`: 20dp (Input text fields, buttons)
- `radiusLarge`: 28dp (Standard content cards)
- `radiusXLarge`: 32dp (Floating glassmorphic auth panel, hero containers)
- `radiusFull`: 999dp (Circular avatars, pill buttons)

---

## 🌫️ 7. Elevation & Ambient Shadows

- `elevationLow`: `Offset(0, 4)`, Blur: `12`, Opacity: `0.04` (Subtle list cards)
- `elevationMedium`: `Offset(0, 8)`, Blur: `24`, Opacity: `0.06` (Floating action panels)
- `elevationHigh`: `Offset(0, 16)`, Blur: `36`, Opacity: `0.10` (Modal bottom sheets)

---

## 🎨 8. Icon Guidelines

- **Style**: Rounded Material Symbols (`Icons.rounded` / `Icons.outline_rounded`).
- **Sizing**:
  - `iconSmall`: 18dp (Inline input prefixes)
  - `iconMedium`: 24dp (Navigation bar, standard action icons)
  - `iconLarge`: 32dp - 48dp (Empty state features)

---

## 🍃 9. Illustration Style

- Organic vector artwork featuring soothing pastel colors, glowing sun ☀️ accents, floating botanical leaves 🍃, soft particle auras, and mindful human silhouettes in meditation poses.

---

## ⏱️ 10. Animation Principles

- **Easing**: `Curves.easeOutCubic` for entry, `Curves.easeInOutSine` for breathing loops.
- **Duration**:
  - `durationFast`: 200ms (Hover, press ripples, checkbox toggles)
  - `durationNormal`: 350ms (Screen slide transitions, card expands)
  - `durationSlow`: 600ms - 3200ms (Breathing illustration aura, splash animations)

---

## 🛠️ 11. Component Specifications

### Buttons
- **Primary Button**: 56dp height, `radiusMedium` (20dp), linear gradient fill (`#7C6EF6` -> `#6366F1`), white bold text, subtle primary glow shadow.
- **Secondary / Google Button**: 56dp height, `radiusMedium` (20dp), white surface (or `#0F172A` in dark mode), 1dp subtle border (`#DADCE0`).

### Text Fields
- 56dp height, `radiusMedium` (20dp), subtle background fill, rounded prefix icon, eye visibility toggle suffix, primary lavender focus border glow.

### Cards
- Glassmorphic or pure white background, 28dp–32dp rounded corners, `space24` padding, soft ambient shadow.

### Bottom Navigation
- Floating rounded bar with active indicator pill, subtle icon elevation, and smooth sliding transitions.

---

## ⏳ 12. Loading, Empty & Error States

- **Loading**: `SkeletonLoader` shimmering placeholders matching target card layout shape.
- **Empty**: Friendly illustration, reassuring headline, clear call-to-action button.
- **Error**: Empathetic message, `ShakeWidget` form feedback, floating snackbar alert.

---

## 🌗 13. Dark Theme Strategy

- Canvas transitions seamlessly to deep night slate (`#0F172A`).
- Card panels transition to elevated slate (`#1E293B`) with muted borders (`#334155`).
- Primary Lavender (`#7C6EF6`) maintains high legibility and contrast ratio (>= 4.5:1 WCAG AA compliant).

---

## 🏷️ 14. Design Token Naming Convention

- Colors: `AppColors.primaryLavender`, `AppColors.mintSecondary`
- Spacing: `AppSpacing.s16`, `AppSpacing.s24`
- Radius: `AppRadius.r20`, `AppRadius.r32`
- Typography: `AppTypography.displayLarge`, `AppTypography.bodyMedium`
