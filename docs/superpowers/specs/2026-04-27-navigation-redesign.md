# Navigation Redesign — Bonssai

**Date:** 2026-04-27
**Status:** Approved

## Goal

Replace sidebar navigation with a mobile-first Bottom Tab Bar. Reorganise sections into 5 logical tabs. Use lucide-react icons throughout — no emojis in navigation UI.

## Structure

### Bottom Tab Bar (5 tabs)

| Tab | Icon (lucide) | Route | Description |
|-----|--------------|-------|-------------|
| Главная | `Home` | `/dashboard` | Balance overview, quick-access cards, AI button |
| Операции | `ArrowLeftRight` | `/transactions` | Transactions list, budgets, CSV import |
| Аналитика | `BarChart3` | `/analytics` | Monthly charts, category breakdown |
| Цели | `Target` | `/goals` | Savings goals with progress |
| Профиль | `User` | `/profile` | Accounts, Credits, Investments, AI, logout |

### Tab: Главная (`/dashboard`)
- Total balance across all accounts
- Last 5 transactions
- Quick-access cards: Кредиты, Инвестиции, Цели (tap → navigates to section)
- Floating AI button (opens QuickAIPanel)

### Tab: Операции (`/transactions`)
- Transactions list with filters and search (existing TransactionTable widget)
- "Бюджеты" tab/toggle within this page
- Link to CSV import
- FAB (+) button to add transaction

### Tab: Аналитика (`/analytics`)
- Existing AnalyticsPage (bar chart + pie chart)
- No changes to content

### Tab: Цели (`/goals`)
- Existing GoalsPage
- No changes to content

### Tab: Профиль (`/profile`)
- User avatar (initials) + email
- Sections: Счета, Кредиты и долги, Инвестиции
- AI Советник link
- Импорт CSV link
- Edit financial profile (income, goal)
- Logout button

## What Changes

### Removed
- `Sidebar` component — replaced entirely by Bottom Tab Bar
- `/settings` route → replaced by `/profile`
- `/ai` as standalone nav item → AI button on dashboard + link in profile
- Separate `/accounts`, `/credits`, `/investments` nav items → accessible via Profile tab

### Kept
- All existing page components (AccountsPage, CreditsPage, InvestmentsPage, etc.)
- All routes still exist in router — only navigation surface changes
- AppLayout restructured: no sidebar, bottom bar instead

## Layout

```
┌─────────────────────────┐
│  Header (page title)    │  ← minimal, just page name
├─────────────────────────┤
│                         │
│     Page Content        │  ← scrollable
│                         │
│                         │
├─────────────────────────┤
│ 🏠  💸  📊  🎯  👤     │  ← Bottom Tab Bar (fixed)
└─────────────────────────┘
```

Header: show current page title + optional right action (e.g., + button on transactions).

Bottom bar: fixed at bottom, safe-area aware (`pb-safe`). Active tab highlighted with accent color. Icons from lucide-react, labels below icons.

## Mobile Considerations
- Bottom bar uses `padding-bottom: env(safe-area-inset-bottom)` for iPhone notch
- No hamburger menu — all navigation reachable with one thumb
- FAB (+) for adding transactions — large tap target, positioned above bottom bar
- Tab labels always visible (not icon-only) for clarity
