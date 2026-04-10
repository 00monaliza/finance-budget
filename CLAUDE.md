# CLAUDE.md — FinanceAI Platform

## Восстановление сессии (ОБЯЗАТЕЛЬНО при старте)

```bash
cat PROGRESS.md 2>/dev/null || echo "Новая сессия"
git log --oneline -10 2>/dev/null || echo "Git не инициализирован"
```

После чтения — восстанови трекер задач и продолжай с первой незакрытой задачи.

После каждой закрытой задачи:
1. `git add -A && git commit -m "feat: [описание] [N/total]"`
2. Обнови `PROGRESS.md` — отметь задачу ✅

---

## О проекте

**FinanceAI** — персональная финансовая платформа для казахстанского рынка.

- Учёт доходов/расходов с AI-анализом (ключи API хранятся только в локальном .env.local)
- Категоризация, бюджеты, лимиты
- Казахстанская специфика: валюта ₸, интеграция Kaspi Bank CSV
- i18n: ru / kz / en
- Уведомления: Telegram + Email

**Stack:** React 18 + TypeScript · Vite · Supabase · Tailwind CSS · Feature-Sliced Design

---

## Архитектура: Feature-Sliced Design

```
src/
├── app/                      # Инициализация приложения
│   ├── providers/            # QueryClient, Router, i18n, Supabase
│   ├── styles/               # Глобальные стили, CSS-переменные
│   └── main.tsx
│
├── pages/                    # Роуты (только композиция)
│   ├── dashboard/
│   ├── transactions/
│   ├── budgets/
│   ├── analytics/
│   ├── settings/
│   └── auth/
│
├── widgets/                  # Сложные UI-блоки (несколько фич)
│   ├── Sidebar/
│   ├── Header/
│   ├── TransactionTable/
│   ├── BudgetOverview/
│   └── AIChat/
│
├── features/                 # Бизнес-сценарии
│   ├── add-transaction/      # Форма добавления транзакции
│   ├── ai-analysis/          # Запрос к Claude API
│   ├── auto-categorize/      # AI-категоризация при вводе
│   ├── import-csv/           # Импорт выписки Kaspi
│   ├── set-budget-limit/     # Установка лимита по категории
│   ├── auth/                 # Login / Register / Logout
│   └── export-report/        # Экспорт PDF/Excel
│
├── entities/                 # Бизнес-сущности
│   ├── transaction/
│   │   ├── model/            # Zustand store + types
│   │   ├── api/              # Supabase queries (TanStack Query)
│   │   └── ui/               # TransactionCard, TransactionBadge
│   ├── category/
│   │   ├── model/
│   │   └── ui/               # CategoryTag, CategoryIcon
│   ├── budget/
│   │   ├── model/
│   │   └── ui/               # BudgetBar, BudgetCard
│   └── user/
│       ├── model/            # Auth store
│       └── ui/               # Avatar, UserMenu
│
└── shared/                   # Переиспользуемое (без бизнес-логики)
    ├── api/
    │   ├── supabase.ts       # Клиент Supabase
    │   └── claude.ts         # Клиент Claude API
    ├── config/
    │   ├── env.ts            # Переменные окружения
    │   └── constants.ts      # CATEGORIES, CURRENCIES, LIMITS
    ├── i18n/
    │   ├── ru.json
    │   ├── kz.json
    │   └── en.json
    ├── lib/
    │   ├── formatCurrency.ts # Форматирование ₸
    │   ├── formatDate.ts
    │   └── cn.ts             # clsx + tailwind-merge
    └── ui/                   # Базовые компоненты (без логики)
        ├── Button/
        ├── Input/
        ├── Modal/
        ├── Card/
        ├── Badge/
        ├── Skeleton/
        └── Chart/
```

---

## База данных: Supabase Schema

### Таблицы

```sql
-- Категории (предзаполненные + пользовательские)
CREATE TABLE categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name_ru     text NOT NULL,
  name_kz     text,
  name_en     text,
  icon        text NOT NULL,          -- emoji или lucide icon name
  color       text NOT NULL,          -- hex цвет
  type        text CHECK (type IN ('income', 'expense', 'both')),
  is_default  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- Транзакции
CREATE TABLE transactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount        numeric(12, 2) NOT NULL CHECK (amount > 0),
  type          text NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  category_id   uuid REFERENCES categories(id),
  description   text,
  date          date NOT NULL DEFAULT CURRENT_DATE,
  account       text DEFAULT 'main',  -- main / kaspi / cash
  tags          text[],
  ai_categorized boolean DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Бюджеты (лимиты по категории на месяц)
CREATE TABLE budgets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id   uuid REFERENCES categories(id) NOT NULL,
  limit_amount  numeric(12, 2) NOT NULL CHECK (limit_amount > 0),
  period        text CHECK (period IN ('month', 'week', 'year')) DEFAULT 'month',
  year          int NOT NULL,
  month         int CHECK (month BETWEEN 1 AND 12),
  notify_at_pct int DEFAULT 80,       -- уведомить при достижении N%
  created_at    timestamptz DEFAULT now(),
  UNIQUE (user_id, category_id, period, year, month)
);

-- Цели (накопления)
CREATE TABLE goals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name          text NOT NULL,
  target_amount numeric(12, 2) NOT NULL,
  current_amount numeric(12, 2) DEFAULT 0,
  deadline      date,
  icon          text DEFAULT '🎯',
  color         text DEFAULT '#1D9E75',
  created_at    timestamptz DEFAULT now()
);

-- AI-диалоги (история чатов с Claude)
CREATE TABLE ai_chats (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role        text CHECK (role IN ('user', 'assistant')) NOT NULL,
  content     text NOT NULL,
  context     jsonb,                  -- снапшот данных бюджета на момент запроса
  created_at  timestamptz DEFAULT now()
);

-- RLS (Row Level Security)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Политики: пользователь видит только свои данные
CREATE POLICY "own_data" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON budgets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON ai_chats FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_or_default" ON categories FOR SELECT
  USING (auth.uid() = user_id OR is_default = true);
CREATE POLICY "own_insert" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Индексы

```sql
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_user_category ON transactions(user_id, category_id);
CREATE INDEX idx_budgets_user_period ON budgets(user_id, year, month);
```

---

## Claude API: системный промпт

Файл: `src/shared/api/claude.ts`

```typescript
export const FINANCE_SYSTEM_PROMPT = `
Ты — персональный финансовый советник FinanceAI.
Отвечай на русском языке, кратко и конкретно (2-4 предложения).
Используй данные бюджета пользователя для точных советов.
Всегда упоминай конкретные цифры из предоставленных данных.
Валюта — казахстанский тенге (₸).
Не давай общих советов — только на основе реальных цифр пользователя.
`.trim();

export async function askClaude(
  question: string,
  budgetContext: BudgetContext
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: FINANCE_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Данные бюджета:\n${JSON.stringify(budgetContext, null, 2)}\n\nВопрос: ${question}`
        }
      ]
    })
  });
  const data = await response.json();
  return data.content[0].text;
}

export async function autoCategorize(
  description: string,
  categories: Category[]
): Promise<string> {
  // Быстрая категоризация — используем Haiku для скорости
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      system: 'Верни ТОЛЬКО id категории из списка. Без объяснений.',
      messages: [{
        role: 'user',
        content: `Категории: ${JSON.stringify(categories.map(c => ({ id: c.id, name: c.name_ru })))}\nТранзакция: "${description}"\nid категории:`
      }]
    })
  });
  const data = await response.json();
  return data.content[0].text.trim();
}
```

---

## Переменные окружения

Файл: `.env.local`

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_APP_URL=http://localhost:5173
```

> ⚠️ В продакшне Anthropic API вызывать через Supabase Edge Function (не из браузера)

---

## Дизайн-токены (CSS переменные)

```css
:root {
  /* Бренд-палитра */
  --color-brand-primary:   #2F4454;   /* тёмно-синий — основной */
  --color-brand-secondary: #376E6F;   /* бирюзовый */
  --color-brand-accent:    #DA7B93;   /* розовый — акцент */
  --color-brand-dark:      #2E151B;   /* тёмно-бордовый */
  --color-brand-darkest:   #1C3334;   /* зелёно-чёрный */

  /* Семантика */
  --color-income:   #1D9E75;
  --color-expense:  #E24B4A;
  --color-warning:  #EF9F27;
  --color-neutral:  #888780;

  /* Типографика */
  --font-display: 'Cabinet Grotesk', sans-serif;
  --font-body:    'Instrument Sans', sans-serif;
  --font-mono:    'JetBrains Mono', monospace;

  /* Радиусы */
  --radius-sm:  6px;
  --radius-md:  10px;
  --radius-lg:  16px;
  --radius-xl:  24px;
}
```

---

## Роуты приложения

```
/                    → redirect → /dashboard
/auth/login          → LoginPage
/auth/register       → RegisterPage
/dashboard           → DashboardPage      [protected]
/transactions        → TransactionsPage   [protected]
/transactions/new    → AddTransactionPage [protected]
/budgets             → BudgetsPage        [protected]
/analytics           → AnalyticsPage      [protected]
/goals               → GoalsPage          [protected]
/ai                  → AIAdvisorPage      [protected]
/settings            → SettingsPage       [protected]
/settings/import     → ImportCSVPage      [protected]
```

---

## Категории по умолчанию (seed data)

```typescript
export const DEFAULT_CATEGORIES = [
  // Расходы
  { name_ru: 'Еда и продукты',  icon: '🛒', color: '#1D9E75', type: 'expense' },
  { name_ru: 'Транспорт',       icon: '🚌', color: '#378ADD', type: 'expense' },
  { name_ru: 'Кафе и рестораны',icon: '☕', color: '#EF9F27', type: 'expense' },
  { name_ru: 'Развлечения',     icon: '🎬', color: '#D4537E', type: 'expense' },
  { name_ru: 'Здоровье',        icon: '💊', color: '#E24B4A', type: 'expense' },
  { name_ru: 'Одежда',          icon: '👕', color: '#534AB7', type: 'expense' },
  { name_ru: 'Связь',           icon: '📱', color: '#376E6F', type: 'expense' },
  { name_ru: 'Жильё и ЖКХ',    icon: '🏠', color: '#2F4454', type: 'expense' },
  { name_ru: 'Образование',     icon: '📚', color: '#5DCAA5', type: 'expense' },
  { name_ru: 'Прочее',          icon: '📦', color: '#888780', type: 'expense' },
  // Доходы
  { name_ru: 'Зарплата',        icon: '💼', color: '#1D9E75', type: 'income'  },
  { name_ru: 'Фриланс',         icon: '💻', color: '#378ADD', type: 'income'  },
  { name_ru: 'Подарки',         icon: '🎁', color: '#DA7B93', type: 'income'  },
  { name_ru: 'Инвестиции',      icon: '📈', color: '#534AB7', type: 'income'  },
];
```

---

## Команды разработки

```bash
# Установка
npm create vite@latest financeai -- --template react-ts
cd financeai
npm install

# Зависимости
npm install @supabase/supabase-js @tanstack/react-query zustand
npm install react-router-dom react-hook-form zod @hookform/resolvers
npm install recharts lucide-react clsx tailwind-merge
npm install i18next react-i18next
npm install -D tailwindcss postcss autoprefixer @types/node

# Supabase CLI
npx supabase init
npx supabase db push        # применить миграции
npx supabase gen types typescript --local > src/shared/types/database.ts

# Dev
npm run dev
```

---

## Порядок разработки (фазы)

### Фаза 1 — Основа (текущий спринт)
- [ ] Инициализация проекта (Vite + TS + Tailwind)
- [ ] Настройка Supabase (schema + RLS + seed categories)
- [ ] Auth (login/register/logout)
- [ ] Layout (Sidebar + Header)
- [ ] shared/ui базовые компоненты

### Фаза 2 — Транзакции
- [ ] Добавление транзакции (форма + валидация)
- [ ] Список транзакций (фильтры + поиск + пагинация)
- [ ] AI-категоризация при вводе (Haiku)
- [ ] Импорт CSV Kaspi

### Фаза 3 — Бюджеты и аналитика
- [ ] Бюджеты по категориям (лимиты)
- [ ] Dashboard (метрики, графики)
- [ ] Analytics page (Recharts)
- [ ] Цели накоплений

### Фаза 4 — AI Советник
- [ ] AI Chat (Claude Sonnet)
- [ ] История диалогов (Supabase)
- [ ] Умные уведомления

### Фаза 5 — Полировка
- [ ] i18n (ru/kz/en)
- [ ] Dark mode
- [ ] PWA (manifest + service worker)
- [ ] Деплой на Vercel + DNS на ps.kz

---

## Соглашения по коду

```typescript
// Именование файлов
TransactionCard.tsx       // компонент — PascalCase
useTransactions.ts        // хук — camelCase с use
transactionApi.ts         // API — camelCase
transaction.types.ts      // типы — kebab-case с суффиксом

// Экспорты из слоёв FSD — ТОЛЬКО через index.ts
// src/entities/transaction/index.ts
export { TransactionCard } from './ui/TransactionCard';
export { useTransactionStore } from './model/store';
export type { Transaction } from './model/types';

// Запрещено: импортировать напрямую из внутренностей слоя
// ❌ import { TransactionCard } from '@/entities/transaction/ui/TransactionCard'
// ✅ import { TransactionCard } from '@/entities/transaction'

// Path aliases (vite.config.ts)
// @/app, @/pages, @/widgets, @/features, @/entities, @/shared
```

---

## Типы TypeScript

```typescript
// src/entities/transaction/model/types.ts
export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category_id: string;
  description: string;
  date: string;
  account: 'main' | 'kaspi' | 'cash';
  tags: string[];
  ai_categorized: boolean;
  created_at: string;
}

export interface TransactionFilter {
  type?: Transaction['type'];
  category_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// src/shared/types/budget-context.ts
export interface BudgetContext {
  period: { month: number; year: number };
  totals: { income: number; expense: number; balance: number };
  by_category: Array<{ name: string; amount: number; pct: number }>;
  top_transactions: Array<{ description: string; amount: number; type: string }>;
  budget_limits: Array<{ category: string; limit: number; spent: number; pct: number }>;
}
```

---

## Kaspi CSV парсер

```typescript
// src/features/import-csv/lib/parseKaspiCSV.ts
export function parseKaspiCSV(csvText: string): Partial<Transaction>[] {
  const lines = csvText.split('\n').slice(1); // пропустить заголовок
  return lines
    .filter(Boolean)
    .map(line => {
      const [date, description, amount, type] = line.split(';');
      return {
        date: parseKaspiDate(date),
        description: description?.trim(),
        amount: Math.abs(parseFloat(amount?.replace(',', '.') || '0')),
        type: parseFloat(amount || '0') < 0 ? 'expense' : 'income',
      };
    })
    .filter(t => t.amount && t.amount > 0);
}
```

