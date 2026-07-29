# SoulCare Shared Component Library & Specification

Master reusable component library for **SoulCare**. All frontend pages, templates, and dynamic views must strictly consume these standardized components to guarantee 100% visual consistency and accessible user experience.

---

## 📚 Table of Components

1. [Buttons](#1-buttons)
2. [Inputs & Form Controls](#2-inputs--form-controls)
3. [Textareas](#3-textareas)
4. [Select Dropdowns](#4-select-dropdowns)
5. [Checkboxes & Radio Buttons](#5-checkboxes--radio-buttons)
6. [Cards & Containers](#6-cards--containers)
7. [Stat Cards](#7-stat-cards)
8. [Profile Cards](#8-profile-cards)
9. [Mood Cards & Selectors](#9-mood-cards--selectors)
10. [AI Insight Cards](#10-ai-insight-cards)
11. [Journal Entry Cards](#11-journal-entry-cards)
12. [Community Cards](#12-community-cards)
13. [Chat Bubbles](#13-chat-bubbles)
14. [Sidebar Navigation](#14-sidebar-navigation)
15. [Topbar Header](#15-topbar-header)
16. [Bottom Navigation Bar](#16-bottom-navigation-bar)
17. [Modals & Dialogs](#17-modals--dialogs)
18. [Toast Notifications](#18-toast-notifications)
19. [Alert Banners](#19-alert-banners)
20. [Badges & Chips](#20-badges--chips)
21. [Progress Bars & Rings](#21-progress-bars--rings)
22. [Skeleton Loaders](#22-skeleton-loaders)
23. [Empty States](#23-empty-states)
24. [Loading & Error States](#24-loading--error-states)
25. [Pagination](#25-pagination)
26. [Search Bar](#26-search-bar)
27. [Data Tables](#27-data-tables)
28. [Mood Charts](#28-mood-charts)
29. [Avatars](#29-avatars)
30. [Dropdown Menus & Tooltips](#30-dropdown-menus--tooltips)
31. [Floating Action Button (FAB)](#31-floating-action-button-fab)

---

## 1. Buttons

### Purpose
Primary drivers for user actions (submit forms, navigate tabs, trigger modals).

### Variants
- **Primary Gradient Button (`.btn-blue`)**: Main high-emphasis CTA.
- **Secondary Gray Button (`.btn-gray`)**: Medium-emphasis auxiliary actions.
- **Icon Button (`.btn-icon`)**: Compact action trigger.
- **Text Button (`.btn-text`)**: Low-emphasis inline link action.

### Code Snippet
```html
<!-- Primary Button -->
<button type="submit" class="btn-blue">
  <span>Continue</span>
  <div class="spinner"></div>
</button>

<!-- Secondary Button -->
<button type="button" class="btn-gray">Cancel</button>
```

### States & CSS
- **Default**: `background: linear-gradient(135deg, #8B5CF6, #7C3AED)`
- **Hover**: `transform: translateY(-2px); box-shadow: 0 12px 28px rgba(124, 58, 237, 0.35)`
- **Active**: `transform: scale(0.98)`
- **Disabled**: `opacity: 0.5; cursor: not-allowed; box-shadow: none`

### Accessibility & Responsive
- `aria-label` required for icon-only variants. Minimum touch target height $48\text{px}$ on mobile.

---

## 2. Inputs & Form Controls

### Purpose
Capture single-line user data (email, username, password, numbers).

### Code Snippet
```html
<div class="form-group">
  <label for="email" class="field-label">Email</label>
  <div class="input-wrapper">
    <div class="input-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="4" width="20" height="16" rx="4"></rect>
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
      </svg>
    </div>
    <input type="text" id="email" name="username" class="form-input" placeholder="Enter your email" required />
  </div>
</div>
```

### States
- **Default**: `#F9FAFB` fill, `1.5px solid #E5E7EB` border, $16\text{px}$ radius.
- **Focus**: `#FFFFFF` background, `#8B5CF6` border, `0 0 0 4px rgba(139, 92, 246, 0.15)` focus ring.
- **Error**: `#FEF2F2` background, `#EF4444` border.

---

## 3. Textareas

### Purpose
Capture multi-line emotional logs and journal reflections.

### Code Snippet
```html
<textarea id="journal-input" class="inp t-body-lg" rows="6" placeholder="What's on your mind today?"></textarea>
```

### States & Responsive
- Auto-growing height on mobile, max-height scrolling on desktop.

---

## 4. Select Dropdowns

### Purpose
Select filter criteria or category tags.

### Code Snippet
```html
<select class="inp font-semibold cursor-pointer">
  <option value="all">All Entries</option>
  <option value="happy">Happy</option>
  <option value="calm">Calm</option>
</select>
```

---

## 5. Checkboxes & Radio Buttons

### Purpose
Form selections, privacy options, and settings preferences.

### Code Snippet
```html
<label class="flex items-center gap-3 cursor-pointer">
  <input type="checkbox" class="w-5 h-5 rounded-md accent-[#7C3AED]" />
  <span class="t-body-md">Keep my identity anonymous</span>
</label>
```

---

## 6. Cards & Containers

### Purpose
Base elevated surface for grouping related UI items.

### Code Snippet
```html
<div class="post-card p-6">
  <h3 class="t-h3 mb-2">Card Title</h3>
  <p class="t-body-md">Card description content.</p>
</div>
```

---

## 7. Stat Cards

### Purpose
Display numeric metrics (Journals count, Streak days, Connected peers).

### Code Snippet
```html
<div class="stat-tile" onclick="showTab('journal')">
  <div class="num">12</div>
  <div class="lbl">Journals</div>
</div>
```

---

## 8. Profile Cards

### Purpose
Display user identity, avatar initials, and status.

### Code Snippet
```html
<div class="flex items-center gap-4 p-6 rounded-3xl bg-white border border-gray-200">
  <div class="w-16 h-16 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xl">
    SP
  </div>
  <div>
    <h3 class="t-h3">Sujita Patel</h3>
    <p class="t-caption">Active member</p>
  </div>
</div>
```

---

## 9. Mood Cards & Selectors

### Purpose
Interactive mood check-in chips with emojis.

### Code Snippet
```html
<div class="flex gap-2 overflow-x-auto py-2">
  <button class="mood-pill active-pill"><span>😊</span> Great</button>
  <button class="mood-pill"><span>🙂</span> Good</button>
  <button class="mood-pill"><span>😐</span> Okay</button>
  <button class="mood-pill"><span>🙁</span> Not good</button>
  <button class="mood-pill"><span>😫</span> Awful</button>
</div>
```

---

## 10. AI Insight Cards

### Purpose
Display emotion sentiment analysis and suggestions.

### Code Snippet
```html
<div class="insight-card p-6">
  <span class="pill-tag pill-teal mb-2">Positive Trend</span>
  <h4 class="t-h4 mb-1">Increased Calmness</h4>
  <p class="t-body-md">You felt calm 40% more often this week compared to last week.</p>
</div>
```

---

## 11. Journal Entry Cards

### Purpose
Display individual past reflection entries with tags and timestamps.

### Code Snippet
```html
<div class="j-entry">
  <div class="flex justify-between items-center mb-2">
    <span class="t-h5">Feeling Grateful 🌸</span>
    <span class="t-caption">May 24, 10:30 AM</span>
  </div>
  <p class="t-body-sm line-clamp-2">Today was a beautiful day. I am grateful for the small things...</p>
</div>
```

---

## 12. Community Cards

### Purpose
Display peer connection requests and profile cards.

### Code Snippet
```html
<div class="peer-row">
  <div class="w-10 h-10 rounded-full bg-purple-500 text-white font-bold flex items-center justify-center">AS</div>
  <div class="flex-1">
    <div class="t-h5">Aarav Sharma</div>
    <div class="t-caption">94% Match · Supports each other</div>
  </div>
  <button class="btn-gray py-1.5 px-4 text-xs">Chat</button>
</div>
```

---

## 13. Chat Bubbles

### Purpose
Bidirectional peer-to-peer chat message bubbles.

### Code Snippet
```html
<!-- Self Message -->
<div class="flex justify-end mb-3">
  <div class="bubble bubble-self">I'm feeling good today, thanks! 😊</div>
</div>

<!-- Peer Message -->
<div class="flex justify-start mb-3">
  <div class="bubble bubble-other">That's great to hear! What made your day good?</div>
</div>
```

---

## 14. Sidebar Navigation

### Purpose
Fixed left navigation panel for desktop screen resolution ($\ge 1024\text{px}$).

### Code Snippet
```html
<div id="sidebar">
  <div class="snav-item active" onclick="showTab('dashboard')">
    <span>Today</span>
  </div>
</div>
```

---

## 15. Topbar Header

### Purpose
Sticky top banner with brand title, status, and logout actions.

### Code Snippet
```html
<div class="top-bar">
  <h1 class="t-h3">SoulCare</h1>
  <button onclick="logout()" class="btn-gray py-1.5 px-3 text-xs">Sign out</button>
</div>
```

---

## 16. Bottom Navigation Bar

### Purpose
Mobile navigation bar ($< 1024\text{px}$) fixed at screen bottom.

### Code Snippet
```html
<nav id="bot-nav">
  <button class="nav-item active" onclick="showTab('dashboard')">
    <span class="nav-label">Today</span>
  </button>
  <button class="nav-item" onclick="showTab('journal')">
    <span class="nav-label">Log</span>
  </button>
</nav>
```

---

## 17. Modals & Dialogs

### Purpose
Overlay dialog for confirmations and actions.

### Code Snippet
```html
<div id="confirm-modal" class="hidden fixed inset-0 flex items-center justify-center z-[200] p-4 bg-black/50 backdrop-blur-sm">
  <div class="w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-2xl">
    <p id="confirm-msg" class="t-body-md mb-6"></p>
    <div class="flex gap-3">
      <button id="confirm-ok" class="btn-blue flex-1">Confirm</button>
      <button onclick="closeConfirm()" class="btn-gray flex-1">Cancel</button>
    </div>
  </div>
</div>
```

---

## 18. Toast Notifications

### Purpose
Transient alert messages displayed at screen bottom center.

### Code Snippet
```html
<div id="toast" class="hidden fixed bottom-20 left-1/2 -translate-x-1/2 t-body-sm px-6 py-3 rounded-full z-[100] bg-white border border-gray-200 shadow-xl whitespace-nowrap">
  Entry saved successfully ✨
</div>
```

---

## 19. Alert Banners

### Purpose
Inline error or status alerts.

### Code Snippet
```html
<div class="error-banner" id="errorBanner" role="alert">
  <span id="errorMessage">Invalid credentials.</span>
</div>
```

---

## 20. Badges & Chips

### Purpose
Categorical tags and status indicators.

### Code Snippet
```html
<span class="pill-tag pill-teal">✦ Positive</span>
<span class="pill-tag pill-coral">✦ Reflection</span>
```

---

## 21. Progress Bars & Rings

### Purpose
Visual indicators for streak progress and completion percentage.

### Code Snippet
```html
<div class="cycle-ring">
  <div class="cycle-ring-inner">7 Day<br/>Streak</div>
</div>
```

---

## 22. Skeleton Loaders

### Purpose
Placeholders rendered while data is fetching asynchronously.

### Code Snippet
```html
<div class="animate-pulse bg-gray-200 h-12 rounded-2xl w-full mb-3"></div>
```

---

## 23. Empty States

### Purpose
Reassuring visual and message when no data is available.

### Code Snippet
```html
<div class="text-center py-12">
  <div class="text-4xl mb-3">🌸</div>
  <h4 class="t-h4 mb-1">No entries yet</h4>
  <p class="t-body-sm mb-4">Start your wellness journey by writing your first reflection.</p>
  <button class="btn-blue py-2.5 px-6" style="width:auto">Write Entry</button>
</div>
```

---

## 24. Loading & Error States

### Purpose
Button spinners and fallback messages.

### Code Snippet
```html
<div class="spinner"></div>
```

---

## 25. Pagination

### Purpose
Page navigation for long lists.

### Code Snippet
```html
<div class="flex justify-center items-center gap-2 py-4">
  <button class="btn-gray py-1.5 px-3 text-xs">Previous</button>
  <span class="t-caption">Page 1 of 4</span>
  <button class="btn-gray py-1.5 px-3 text-xs">Next</button>
</div>
```

---

## 26. Search Bar

### Purpose
Filter peer users or past journal entries.

### Code Snippet
```html
<input type="text" placeholder="Search by keyword..." class="inp mb-4" />
```

---

## 27. Data Tables

### Purpose
Structured tabular view for administrative metrics (`beta_admin.html`).

### Code Snippet
```html
<table class="w-full text-left border-collapse">
  <thead>
    <tr class="border-b border-gray-200 t-label">
      <th class="py-3 px-4">User</th>
      <th class="py-3 px-4">Status</th>
      <th class="py-3 px-4">Joined</th>
    </tr>
  </thead>
  <tbody>
    <tr class="border-b border-gray-100 t-body-sm">
      <td class="py-3 px-4 font-semibold">sujitapatel</td>
      <td class="py-3 px-4"><span class="pill-tag pill-teal">Active</span></td>
      <td class="py-3 px-4">May 24, 2026</td>
    </tr>
  </tbody>
</table>
```

---

## 28. Mood Charts

### Purpose
Bar chart displaying weekly emotion fluctuations.

### Code Snippet
```html
<div class="flex items-end gap-3 h-24 mb-3">
  <div class="flex-1 bg-purple-200 rounded-t-lg h-[40%]"></div>
  <div class="flex-1 bg-purple-400 rounded-t-lg h-[70%]"></div>
  <div class="flex-1 bg-purple-600 rounded-t-lg h-[90%]"></div>
</div>
```

---

## 29. Avatars

### Purpose
Circular avatar initials and profile badges.

### Code Snippet
```html
<div class="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black flex items-center justify-center">
  SP
</div>
```

---

## 30. Dropdown Menus & Tooltips

### Purpose
Contextual action menus and tooltip overlays.

### Code Snippet
```html
<div class="relative inline-block">
  <button class="btn-gray py-1 px-3 text-xs">Options ▾</button>
</div>
```

---

## 31. Floating Action Button (FAB)

### Purpose
Quick entry write button on mobile views.

### Code Snippet
```html
<button class="fixed bottom-20 right-6 w-14 h-14 rounded-full bg-purple-600 text-white text-2xl shadow-xl flex items-center justify-center z-50">
  +
</button>
```
