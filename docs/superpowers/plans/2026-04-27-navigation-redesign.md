# Navigation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace sidebar navigation with a mobile-first Bottom Tab Bar (5 tabs: Главная, Операции, Аналитика, Цели, Профиль) using lucide-react icons.

**Architecture:** Remove `Sidebar` widget and hamburger menu. Add `BottomTabBar` fixed at the bottom of `AppLayout`. Merge Budgets into Операции tab. Move Accounts/Credits/Investments/AI into Профиль page. Keep all existing page components unchanged.

**Tech Stack:** React 19, React Router v7, Tailwind CSS v4, lucide-react

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/widgets/BottomTabBar/BottomTabBar.tsx` | 5-tab fixed bottom navigation |
| Create | `src/widgets/BottomTabBar/index.ts` | barrel export |
| Modify | `src/app/layouts/AppLayout.tsx` | remove Sidebar, add BottomTabBar, adjust padding |
| Modify | `src/widgets/Header/Header.tsx` | remove hamburger button, update PAGE_TITLES |
| Create | `src/pages/profile/ProfilePage.tsx` | replaces SettingsPage — accounts/credits/investments/AI links |
| Modify | `src/pages/transactions/TransactionsPage.tsx` | add Бюджеты tab switcher inside Операции |
| Modify | `src/app/router.tsx` | add `/profile`, redirect `/settings` → `/profile`, `/budgets` → `/transactions` |

---

## Task 1: BottomTabBar component

**Files:**
- Create: `src/widgets/BottomTabBar/BottomTabBar.tsx`
- Create: `src/widgets/BottomTabBar/index.ts`

- [ ] **Step 1: Create the component**

```tsx
// src/widgets/BottomTabBar/BottomTabBar.tsx
import { NavLink } from 'react-router-dom';
import { Home, ArrowLeftRight, BarChart3, Target, User } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

const TABS = [
  { to: '/dashboard',    icon: Home,            label: 'Главная'   },
  { to: '/transactions', icon: ArrowLeftRight,  label: 'Операции'  },
  { to: '/analytics',    icon: BarChart3,        label: 'Аналитика' },
  { to: '/goals',        icon: Target,           label: 'Цели'      },
  { to: '/profile',      icon: User,             label: 'Профиль'   },
] as const;

export function BottomTabBar() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-white/10 bg-[rgba(13,27,38,0.95)] backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
              isActive ? 'text-[#5DCAA5]' : 'text-white/45 hover:text-white/70'
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Create barrel export**

```ts
// src/widgets/BottomTabBar/index.ts
export { BottomTabBar } from './BottomTabBar';
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/widgets/BottomTabBar/
git commit -m "feat(nav): add BottomTabBar widget with 5 tabs"
```

---

## Task 2: Refactor AppLayout

**Files:**
- Modify: `src/app/layouts/AppLayout.tsx`

- [ ] **Step 1: Replace Sidebar with BottomTabBar, add bottom padding to main**

```tsx
// src/app/layouts/AppLayout.tsx
import { Outlet } from 'react-router-dom';
import { Header } from '@/widgets/Header';
import { BottomTabBar } from '@/widgets/BottomTabBar';
import { ParticleBackground } from '@/shared/ui';

export function AppLayout() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#0d1b26]">
      <Header />
      <main className="relative flex-1 overflow-y-auto bg-[#0d1b26] px-3 py-4 pb-24 sm:px-5 sm:py-5 lg:p-6 lg:pb-6">
        <ParticleBackground />
        <div className="pointer-events-none absolute -left-20 top-[-80px] h-64 w-64 rounded-full bg-[#5DCAA5]/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-[#DA7B93]/20 blur-3xl" />
        <div className="relative z-10">
          <Outlet />
        </div>
      </main>
      <BottomTabBar />
    </div>
  );
}
```

Note: `pb-24` on main ensures content doesn't hide behind the bottom bar. On desktop (`lg:pb-6`) we reset it — optionally the bottom bar can be hidden on desktop (see Task 6 optional step).

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/layouts/AppLayout.tsx
git commit -m "feat(nav): replace Sidebar with BottomTabBar in AppLayout"
```

---

## Task 3: Refactor Header

**Files:**
- Modify: `src/widgets/Header/Header.tsx`

- [ ] **Step 1: Remove hamburger button and onMenuClick prop; update PAGE_TITLES**

```tsx
// src/widgets/Header/Header.tsx
import { useState, useRef } from 'react';
import { Bell, Plus, X, AlertTriangle, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/entities/user';
import { useBudgetAlerts } from '@/features/ai-analysis';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { cn } from '@/shared/lib/cn';
import { QuickAIPanel } from '@/widgets/QuickAIPanel';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':        'Главная',
  '/transactions':     'Операции',
  '/analytics':        'Аналитика',
  '/goals':            'Цели',
  '/profile':          'Профиль',
  '/accounts':         'Счета',
  '/credits':          'Кредиты',
  '/investments':      'Инвестиции',
  '/ai':               'AI Советник',
  '/settings/import':  'Импорт CSV',
};

export function Header() {
  const { pathname } = useLocation();
  const { user } = useAuthStore();
  const alerts = useBudgetAlerts();
  const [showAlerts, setShowAlerts] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const aiButtonRef = useRef<HTMLButtonElement>(null);

  const title = PAGE_TITLES[pathname] ?? 'Bonssai';
  const name = user?.user_metadata?.full_name ?? user?.email ?? '';
  const initials = name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[rgba(13,27,38,0.85)] px-3 text-white backdrop-blur-xl sm:px-5">
      <h1 className="truncate text-base font-semibold text-white">{title}</h1>

      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <div className="relative">
          <button
            ref={aiButtonRef}
            type="button"
            onClick={() => setShowAIPanel(v => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DA7B93]/50 bg-[#DA7B93]/10 px-2.5 py-2 text-sm font-medium text-[#DA7B93] transition-colors hover:bg-[#DA7B93]/20 sm:px-3"
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline text-xs">AI</span>
          </button>
          <QuickAIPanel isOpen={showAIPanel} onClose={() => setShowAIPanel(false)} anchorRef={aiButtonRef} />
        </div>

        <Link
          to="/transactions/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#5DCAA5] px-2.5 py-2 text-sm font-medium text-[#0d1b26] transition-colors hover:bg-[#71d9b6] sm:px-4"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Добавить</span>
        </Link>

        <div className="relative">
          <button
            onClick={() => setShowAlerts(v => !v)}
            className="relative rounded-xl p-2 transition-colors hover:bg-white/10"
          >
            <Bell size={20} className="text-white/70" />
            {alerts.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#E24B4A] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {alerts.length}
              </span>
            )}
          </button>

          {showAlerts && (
            <>
              <div className="fixed inset-0" onClick={() => setShowAlerts(false)} />
              <div className="absolute right-0 top-12 z-50 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/12 bg-[rgba(13,27,38,0.94)] shadow-[0_24px_64px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:w-80">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <span className="text-sm font-semibold text-white">Уведомления</span>
                  <button onClick={() => setShowAlerts(false)} className="rounded-lg p-1 hover:bg-white/10">
                    <X size={14} className="text-white/50" />
                  </button>
                </div>
                {alerts.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-white/55">Нет уведомлений</div>
                ) : (
                  <div className="max-h-72 divide-y divide-white/8 overflow-y-auto">
                    {alerts.map(alert => (
                      <Link
                        key={alert.budgetId}
                        to="/transactions"
                        onClick={() => setShowAlerts(false)}
                        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/8"
                      >
                        <AlertTriangle
                          size={16}
                          className={cn('mt-0.5 shrink-0', alert.isOver ? 'text-[#E24B4A]' : 'text-[#EF9F27]')}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white/90">{alert.icon} {alert.categoryName}</p>
                          <p className="mt-0.5 text-xs text-white/65">
                            {alert.isOver
                              ? `Перерасход на ${formatCurrency(alert.spent - alert.limit)}`
                              : `${Math.round(alert.pct)}% бюджета использовано`}
                          </p>
                          <p className="text-xs text-white/45">{formatCurrency(alert.spent)} / {formatCurrency(alert.limit)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DA7B93] text-sm font-bold text-white">
          {initials || '?'}
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/widgets/Header/Header.tsx
git commit -m "feat(nav): remove hamburger from Header, update page titles"
```

---

## Task 4: ProfilePage

**Files:**
- Create: `src/pages/profile/ProfilePage.tsx`

This replaces `src/pages/settings/SettingsPage.tsx` as the main profile/settings destination. The old SettingsPage will be kept but its route redirected.

- [ ] **Step 1: Create ProfilePage**

```tsx
// src/pages/profile/ProfilePage.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wallet, CreditCard, TrendingUp, Bot, FileUp,
  LogOut, ChevronRight, Check, Mail,
  Home, Car,
} from 'lucide-react';
import { useAuthStore } from '@/entities/user';
import { useProfile, useUpsertProfile } from '@/entities/profile';
import { signOut } from '@/features/auth';
import { Button, Card, Input, Modal, Skeleton } from '@/shared/ui';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { cn } from '@/shared/lib/cn';

const GOAL_LABELS: Record<string, string> = {
  control:   'Контроль расходов',
  save:      'Накопления',
  pay_debts: 'Погашение долгов',
  invest:    'Инвестиции',
};

const HOUSING_LABELS: Record<string, string> = {
  own:      'Собственное жильё',
  rent:     'Аренда',
  mortgage: 'Ипотека',
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">{children}</h3>;
}

function RowLink({
  icon: Icon,
  label,
  sub,
  to,
  iconColor = 'text-white/60',
  iconBg = 'bg-white/8',
}: {
  icon: React.ElementType;
  label: string;
  sub?: string;
  to: string;
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/6">
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', iconBg, iconColor)}>
        <Icon size={17} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/90">{label}</p>
        {sub && <p className="text-xs text-white/45 mt-0.5">{sub}</p>}
      </div>
      <ChevronRight size={14} className="text-white/25 shrink-0" />
    </Link>
  );
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useProfile(user?.id);
  const upsertMutation = useUpsertProfile();

  const [editOpen, setEditOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [incomeInput, setIncomeInput] = useState('');
  const [goalInput, setGoalInput] = useState('');

  const openEdit = () => {
    setIncomeInput(profile?.monthly_income?.toString() ?? '');
    setGoalInput(profile?.financial_goal ?? '');
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!user) return;
    upsertMutation.mutate(
      {
        id: user.id,
        monthly_income: incomeInput ? parseFloat(incomeInput) : null,
        financial_goal: (goalInput as 'control' | 'save' | 'pay_debts' | 'invest') || null,
      },
      { onSuccess: () => setEditOpen(false) }
    );
  };

  const logoutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: () => { queryClient.clear(); navigate('/auth/login'); },
  });

  const email = user?.email ?? '';
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-4 text-white">
      {/* Avatar + email */}
      <Card>
        {isLoading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1D9E75]/20 text-xl font-bold text-[#5DCAA5] ring-2 ring-[#1D9E75]/30">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate font-semibold text-white">{email}</p>
              {profile?.financial_goal && (
                <span className="mt-1 inline-block rounded-full bg-[#1D9E75]/15 px-2.5 py-0.5 text-xs font-medium text-[#5DCAA5]">
                  {GOAL_LABELS[profile.financial_goal]}
                </span>
              )}
              {profile?.monthly_income && (
                <p className="mt-1 text-sm text-white/50">
                  {formatCurrency(profile.monthly_income)} / мес
                </p>
              )}
            </div>
            <button
              onClick={openEdit}
              className="shrink-0 rounded-xl border border-white/15 px-3 py-1.5 text-xs font-medium text-white/65 hover:border-white/30 hover:text-white transition-colors"
            >
              Изменить
            </button>
          </div>
        )}
      </Card>

      {/* Financial profile summary */}
      {profile && (profile.housing_type || profile.has_car) && (
        <div>
          <SectionTitle>Финансовый профиль</SectionTitle>
          <Card padding="sm" className="divide-y divide-white/8">
            {profile.housing_type && (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 text-white/60">
                  <Home size={17} />
                </div>
                <div>
                  <p className="text-sm text-white/85">{HOUSING_LABELS[profile.housing_type]}</p>
                  {profile.housing_monthly_cost && (
                    <p className="text-xs text-white/45">{formatCurrency(profile.housing_monthly_cost)} / мес</p>
                  )}
                </div>
              </div>
            )}
            {profile.has_car && (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 text-white/60">
                  <Car size={17} />
                </div>
                <div>
                  <p className="text-sm text-white/85">Автомобиль</p>
                  {profile.car_monthly_cost && (
                    <p className="text-xs text-white/45">{formatCurrency(profile.car_monthly_cost)} / мес</p>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* My finances */}
      <div>
        <SectionTitle>Мои финансы</SectionTitle>
        <Card padding="sm" className="divide-y divide-white/8">
          <RowLink icon={Wallet} label="Счета" to="/accounts" iconBg="bg-[#1D9E75]/15" iconColor="text-[#5DCAA5]" />
          <RowLink icon={CreditCard} label="Кредиты и долги" to="/credits" iconBg="bg-[#DA7B93]/15" iconColor="text-[#DA7B93]" />
          <RowLink icon={TrendingUp} label="Инвестиции" to="/investments" iconBg="bg-[#378ADD]/15" iconColor="text-[#378ADD]" />
        </Card>
      </div>

      {/* Tools */}
      <div>
        <SectionTitle>Инструменты</SectionTitle>
        <Card padding="sm" className="divide-y divide-white/8">
          <RowLink icon={Bot} label="AI Советник" sub="Анализ и рекомендации" to="/ai" iconBg="bg-[#DA7B93]/15" iconColor="text-[#DA7B93]" />
          <RowLink icon={FileUp} label="Импорт выписки Kaspi" sub="Загрузить CSV файл" to="/settings/import" iconBg="bg-[#EF9F27]/15" iconColor="text-[#EF9F27]" />
        </Card>
      </div>

      {/* Account */}
      <div>
        <SectionTitle>Аккаунт</SectionTitle>
        <Card padding="sm" className="divide-y divide-white/8">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 text-white/60">
              <Mail size={17} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/40">Email</p>
              <p className="truncate text-sm text-white/85">{email}</p>
            </div>
          </div>
          <button
            onClick={() => setLogoutOpen(true)}
            className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-[#E24B4A]/8"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E24B4A]/12 text-[#E24B4A]">
              <LogOut size={17} />
            </div>
            <span className="text-sm font-medium text-[#E24B4A]">Выйти</span>
          </button>
        </Card>
      </div>

      <p className="pb-2 text-center text-xs text-white/20">Bonssai · Умный учёт финансов</p>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Редактировать профиль">
        <div className="space-y-4">
          <Input
            label="Ежемесячный доход (₸)"
            type="number"
            placeholder="300 000"
            value={incomeInput}
            onChange={e => setIncomeInput(e.target.value)}
          />
          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">Финансовая цель</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(GOAL_LABELS) as [string, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setGoalInput(key)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                    goalInput === key
                      ? 'border-[#5DCAA5] bg-[#5DCAA5]/12 text-white'
                      : 'border-white/15 text-white/65 hover:border-white/30'
                  )}
                >
                  {goalInput === key && <Check size={14} className="shrink-0 text-[#5DCAA5]" />}
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <Button variant="secondary" className="flex-1" onClick={() => setEditOpen(false)}>Отмена</Button>
            <Button className="flex-1" loading={upsertMutation.isPending} onClick={handleSave}>Сохранить</Button>
          </div>
        </div>
      </Modal>

      {/* Logout confirmation */}
      <Modal open={logoutOpen} onClose={() => setLogoutOpen(false)} title="Выйти из аккаунта?">
        <div className="space-y-4">
          <p className="text-sm text-white/65">Вы будете перенаправлены на страницу входа.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" className="flex-1" onClick={() => setLogoutOpen(false)}>Отмена</Button>
            <Button
              className="flex-1 bg-[#E24B4A] hover:bg-[#c43c3b]"
              loading={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut size={16} />
              Выйти
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/profile/ProfilePage.tsx
git commit -m "feat(nav): add ProfilePage replacing SettingsPage"
```

---

## Task 5: Операции page — merge Budgets tab

**Files:**
- Modify: `src/pages/transactions/TransactionsPage.tsx`

- [ ] **Step 1: Add tab switcher between Транзакции and Бюджеты**

```tsx
// src/pages/transactions/TransactionsPage.tsx
import { useState } from 'react';
import { TransactionTable } from '@/widgets/TransactionTable';
import { BudgetOverview } from '@/widgets/BudgetOverview';
import { cn } from '@/shared/lib/cn';

const TABS = [
  { id: 'transactions', label: 'Транзакции' },
  { id: 'budgets',      label: 'Бюджеты'    },
] as const;

type TabId = typeof TABS[number]['id'];

export default function TransactionsPage() {
  const [tab, setTab] = useState<TabId>('transactions');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-white/6 p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
              tab === t.id
                ? 'bg-[#5DCAA5] text-[#0d1b26]'
                : 'text-white/55 hover:text-white'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'transactions' ? <TransactionTable /> : <BudgetOverview />}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/transactions/TransactionsPage.tsx
git commit -m "feat(nav): merge Budgets into Операции tab"
```

---

## Task 6: Update router

**Files:**
- Modify: `src/app/router.tsx`

- [ ] **Step 1: Add ProfilePage, redirect /settings → /profile, remove standalone /budgets**

```tsx
// src/app/router.tsx
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/entities/user';
import { useProfile } from '@/entities/profile';
import { AppLayout } from './layouts/AppLayout';

const OnboardingPage     = lazy(() => import('@/pages/onboarding/OnboardingPage'));
const LoginPage          = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage       = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage  = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const TransactionsPage   = lazy(() => import('@/pages/transactions/TransactionsPage'));
const AddTransactionPage = lazy(() => import('@/pages/transactions/AddTransactionPage'));
const ImportCSVPage      = lazy(() => import('@/pages/settings/ImportCSVPageRoute'));
const DashboardPage      = lazy(() => import('@/pages/dashboard/DashboardPage'));
const AnalyticsPage      = lazy(() => import('@/pages/analytics/AnalyticsPage'));
const GoalsPage          = lazy(() => import('@/pages/goals/GoalsPage'));
const AIAdvisorPage      = lazy(() => import('@/pages/ai/AIAdvisorPage'));
const AccountsPage       = lazy(() => import('@/pages/accounts/AccountsPage'));
const CreditsPage        = lazy(() => import('@/pages/credits/CreditsPage'));
const InvestmentsPage    = lazy(() => import('@/pages/investments/InvestmentsPage'));
const ProfilePage        = lazy(() => import('@/pages/profile/ProfilePage'));

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#0d1b26]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5DCAA5] border-t-transparent" />
    </div>
  );
}

function ProtectedRoute() {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth/login" replace />;
  return <Outlet />;
}

function OnboardedRoute() {
  const { user, isLoading } = useAuthStore();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  if (isLoading || profileLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth/login" replace />;
  if (profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

function GuestRoute() {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route element={<GuestRoute />}>
          <Route path="/auth/login"           element={<LoginPage />} />
          <Route path="/auth/register"        element={<RegisterPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>

        <Route element={<OnboardedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard"        element={<DashboardPage />} />
            <Route path="/transactions"     element={<TransactionsPage />} />
            <Route path="/transactions/new" element={<AddTransactionPage />} />
            <Route path="/analytics"        element={<AnalyticsPage />} />
            <Route path="/goals"            element={<GoalsPage />} />
            <Route path="/profile"          element={<ProfilePage />} />
            <Route path="/accounts"         element={<AccountsPage />} />
            <Route path="/credits"          element={<CreditsPage />} />
            <Route path="/investments"      element={<InvestmentsPage />} />
            <Route path="/ai"               element={<AIAdvisorPage />} />
            <Route path="/settings/import"  element={<ImportCSVPage />} />
            {/* Redirects for old routes */}
            <Route path="/settings"         element={<Navigate to="/profile" replace />} />
            <Route path="/budgets"          element={<Navigate to="/transactions" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | tail -20
```
Expected: build succeeds, no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/router.tsx
git commit -m "feat(nav): add /profile route, redirect /settings and /budgets"
```

---

## Task 7: Gitignore + cleanup

**Files:**
- Modify: `.gitignore`
- Delete: `src/pages/settings/SettingsPage.tsx` (replaced by ProfilePage)

- [ ] **Step 1: Add .superpowers to .gitignore**

Read the current `.gitignore`, then add the entry:

```
# Brainstorming mockups
.superpowers/
```

- [ ] **Step 2: Delete old SettingsPage**

```bash
rm src/pages/settings/SettingsPage.tsx
```

- [ ] **Step 3: Verify TypeScript — confirm nothing imports SettingsPage**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git rm src/pages/settings/SettingsPage.tsx
git commit -m "chore: remove old SettingsPage, add .superpowers to gitignore"
```

---

## Task 8: Final build verification

- [ ] **Step 1: Full build**

```bash
npm run build 2>&1 | tail -30
```
Expected: no errors, assets generated

- [ ] **Step 2: Final commit**

```bash
git add -A
git commit -m "feat: mobile-first navigation redesign with BottomTabBar [nav-redesign]"
```
