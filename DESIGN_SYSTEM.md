# SoulCare Master Design System & Visual Language Specification

Official Design System for **SoulCare** — a calm, emotional, friendly, and modern wellness platform.

---

## 🎨 1. Color Palette System

### Primary Brand Palette
- **Primary Purple / Indigo**: `#7C3AED` (Hover: `#6D28D9`, Soft: `#8B5CF6`)
- **Light Purple Surface**: `#EDE9FE`
- **Soft Lavender Background**: `#F5F3FF`
- **Mint Green Accent**: `#10B981` (Light: `#34D399`, Soft: `#E6F4EA`)
- **Peach Accent**: `#FDBA74` (Soft: `#FFF7ED`)
- **Sky Blue Accent**: `#7DD3FC` (Soft: `#F0F9FF`)

### Surface & Canvas
- **Page Background**: `#FAF8FE` to `#F3F0F9` (Soft pastel gradient)
- **Card Background**: `#FFFFFF` (Pure white with optional glassmorphism `backdrop-filter: blur(16px)`)
- **Card Border**: `1.5px solid #E5E7EB`
- **Input Background**: `#F9FAFB` (Focus: `#FFFFFF` with `#8B5CF6` border & glow)

### Text Hierarchy
- **Text Primary**: `#1F2937` (High contrast, dark slate)
- **Text Secondary**: `#4B5563` (Medium contrast, readable slate)
- **Text Muted / Caption**: `#6B7280` / `#9CA3AF`
- **Brand Accent Text**: `#6D28D9`

---

## 🔤 2. Typography System

**Google Fonts**: `Plus Jakarta Sans` (Headings) & `Inter` (Body & UI)

| Token | Font Family | Size | Weight | Line Height | Letter Spacing | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | Plus Jakarta Sans | 32px | 800 (ExtraBold) | 1.2 | -0.025em | Main hero headlines, splash screen |
| **H1** | Plus Jakarta Sans | 26px | 800 (ExtraBold) | 1.25 | -0.02em | Section titles, main page headers |
| **H2** | Plus Jakarta Sans | 22px | 700 (Bold) | 1.3 | -0.015em | Sub-headers, user greetings |
| **H3** | Plus Jakarta Sans | 19px | 700 (Bold) | 1.35 | -0.01em | Card titles, top bar headers |
| **H4** | Plus Jakarta Sans | 16.5px| 700 (Bold) | 1.4 | -0.005em | Action titles, dialog headings |
| **Body Large**| Inter | 15.5px| 400 (Regular) | 1.6 | 0em | Reflection prompt text, journal body |
| **Body Medium**| Inter | 14px | 400 (Regular) | 1.55 | +0.005em | Card descriptions, chat messages |
| **Body Small** | Inter | 13px | 400 (Regular) | 1.5 | +0.01em | Secondary item details, list subtitles |
| **Caption** | Inter | 11.5px| 500 (Medium) | 1.4 | +0.02em | Timestamps, status indicators |
| **Label** | Inter | 11px | 700 (Bold) | 1.2 | +0.06em | Uppercase badges, category tags |
| **Button** | Plus Jakarta Sans | 14.5px| 700 (Bold) | 1.2 | +0.02em | Primary & secondary action buttons |

---

## 📏 3. Spacing & Radius System

### Spacing Grid (8pt System)
- `space-1` ($4\text{px}$): Micro gap inside chips & badges.
- `space-2` ($8\text{px}$): Gap between label and input.
- `space-3` ($12\text{px}$): Padding inside compact buttons & list rows.
- `space-4` ($16\text{px}$): Standard card internal padding.
- `space-6` ($24\text{px}$): Section breaks & container padding.
- `space-8` ($32\text{px}$): Hero top/bottom margins.

### Border Radii
- `radius-sm` ($12\text{px}$): Small badges, mini tags.
- `radius-md` ($16\text{px}$): Input text fields, secondary buttons.
- `radius-lg` ($24\text{px}$): Content cards, post containers, mood pills.
- `radius-xl` ($32\text{px}$): Main hero containers, auth cards, modal sheets.
- `radius-full` ($999\text{px}$): Circular avatar displays, floating nav pills.

---

## 🌫️ 4. Shadows & Elevation System

- **Soft Card Elevation**: `0 10px 30px -5px rgba(124, 58, 237, 0.08), 0 4px 12px rgba(0, 0, 0, 0.03)`
- **Hover Elevation**: `0 16px 36px rgba(124, 58, 237, 0.12)`
- **Primary Button Glow**: `0 10px 25px rgba(124, 58, 237, 0.3)`
- **Floating Bar Elevation**: `0 -8px 24px rgba(0, 0, 0, 0.05)`

---

## 🧩 5. Component Specifications

### Buttons
1. **Primary Button (`.btn-blue`)**:
   - Gradient fill: `linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)`
   - White bold text, $16\text{px}$ radius, button glow shadow.
   - Micro-interaction: `transform: translateY(-2px)` on hover, `scale(0.98)` on click.
2. **Secondary / Gray Button (`.btn-gray`)**:
   - White surface background, `1.5px solid #E5E7EB`, dark text.
   - Hover state: `#F5F3FF` soft lavender fill with `#7C3AED` border.

### Inputs & Forms
- **Input Field Wrapper**: Soft `#F9FAFB` fill, `1.5px solid #E5E7EB` border, $16\text{px}$ radius.
- **Focus State**: White background, `#8B5CF6` border, `0 0 0 4px rgba(139, 92, 246, 0.15)` focus glow ring.

### Cards
- Pure white background, $24\text{px}$–$32\text{px}$ rounded corners, soft shadow, subtle border (`1.5px solid #E5E7EB`).
- Smooth hover transition with slight lift ($2\text{px}$) and border color transition (`#C4B5FD`).

### Navigation Components
1. **Desktop Sidebar (`#sidebar`)**:
   - Fixed white panel ($260\text{px}$ width), subtle right border.
   - Nav items: $16\text{px}$ radius, active lavender highlight (`#EDE9FE`), active indicator line (`#7C3AED`).
2. **Mobile Bottom Nav (`#bot-nav`)**:
   - Fixed white bar ($68\text{px}$ height), top border, 5 tab icons with active purple state.

### Mood Selector Chips
- Interactive pill chips (`Great 😊`, `Good 🙂`, `Okay 😐`, `Not good 🙁`, `Awful 😫`).
- White background, $22\text{px}$ radius, active selection highlight (`#F3E8FF` fill with `#7C3AED` border).

### Stat Tiles
- White cards, $22\text{px}$ radius, radial top gradient aura, large purple numbers (`28px`), uppercase labels.

### Badges & Pill Tags
- `pill-coral`: Soft purple background (`rgba(255, 255, 255, 0.25)` on dark cards or `#F3E8FF` on light cards).
- `pill-teal`: Soft mint background (`#E6F4EA`) with green text (`#059669`).

---

## 🍃 6. Animations & Illustrations

- **Easing Curves**: `cubic-bezier(0.16, 1, 0.3, 1)` for smooth card entries.
- **Micro-Interactions**: Hover lift ($2\text{px}$), active scale ($0.98$), smooth color transitions ($200\text{ms}$).
- **Artwork & Mascot**: Vector landscape visuals with sunset sky gradients, floating leaves (`decor-leaf-1`), sparkling stars (`decor-star-1`), and cute **SoulCare plant spirit mascot**.

---

## ⏳ 7. States

- **Loading State**: Circular animated spinner (`.spinner`) or shimmering skeleton loader.
- **Empty State**: Friendly greeting, reassuring copy ("No entries yet. Start writing!"), primary action button.
- **Error State**: Soft red banner (`#FEF2F2` background, `#EF4444` text, `#FCA5A5` border).
