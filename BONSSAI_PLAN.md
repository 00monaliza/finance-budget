# BONSSAI — Полный план реализации
## Claude Code Session Plan

> **Стек:** Next.js 14+ (App Router), Supabase, Zustand, TanStack Query, Tailwind CSS  
> **Цветовая палитра:** `#2F4454` / `#2E151B` / `#DA7B93` / `#376E6F` / `#1C3334`  
> **После каждой задачи:** `git commit -m "feat: [описание] [N/total]"` + обновить `PROGRESS.md`

---

## PROGRESS.md (создать в начале сессии)

```md
# Bonssai Upgrade Progress

## Tasks
- [ ] 1. DB Schema — Supabase миграции
- [ ] 2. Onboarding Flow — опрос после регистрации
- [ ] 3. Accounts Section — раздел счетов
- [ ] 4. Credits & Debts Section — кредиты, рассрочки, долги
- [ ] 5. AI Personalized Dashboard — персонализированный прогноз
- [ ] 6. Investments Section — инвестиционный раздел
- [ ] 7. Voice Assistant Integration — голосовой ввод
- [ ] 8. AI Market Analysis — ИИ-анализ (образовательный)

## Current Session
Started: [DATE]
Last completed: —
Next task: #1
```

---

## Инструкция восстановления сессии

```
При старте новой сессии:
1. Прочитай PROGRESS.md
2. Выполни: git log --oneline -10
3. Найди первую незакрытую задачу в PROGRESS.md
4. Продолжи с неё
```

---

## ЗАДАЧА 1 — Database Schema (Supabase)

### Файл: `supabase/migrations/001_bonssai_upgrade.sql`

```sql
-- =====================
-- USER PROFILE & ONBOARDING
-- =====================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  monthly_income NUMERIC(12,2),
  income_currency VARCHAR(3) DEFAULT 'KZT',
  housing_type VARCHAR(20) CHECK (housing_type IN ('own', 'rent', 'mortgage')),
  housing_monthly_cost NUMERIC(12,2),
  mortgage_remaining NUMERIC(12,2),
  has_car BOOLEAN DEFAULT FALSE,
  car_monthly_cost NUMERIC(12,2),
  financial_goal VARCHAR(30) CHECK (
    financial_goal IN ('control', 'save', 'pay_debts', 'invest')
  ),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- ACCOUNTS (СЧЕТА)
-- =====================
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('card', 'cash', 'deposit', 'crypto', 'other')),
  balance NUMERIC(12,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'KZT',
  color VARCHAR(7) DEFAULT '#376E6F',
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- TRANSACTIONS (существующие + новые)
-- =====================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  type VARCHAR(10) CHECK (type IN ('income', 'expense', 'transfer')),
  category VARCHAR(50),
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- CREDITS & INSTALLMENTS (КРЕДИТЫ / РАССРОЧКИ)
-- =====================
CREATE TABLE credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('credit', 'installment', 'mortgage', 'other')),
  total_amount NUMERIC(12,2) NOT NULL,
  remaining_amount NUMERIC(12,2) NOT NULL,
  monthly_payment NUMERIC(12,2) NOT NULL,
  interest_rate NUMERIC(5,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  payment_day INTEGER CHECK (payment_day BETWEEN 1 AND 31),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- DEBTS (ДОЛГИ: Я ДОЛЖЕН / МНЕ ДОЛЖНЫ)
-- =====================
CREATE TABLE debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  direction VARCHAR(10) CHECK (direction IN ('owe', 'owed')),
  person_name VARCHAR(100) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  due_date DATE,
  is_settled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- INVESTMENTS (ИНВЕСТИЦИИ)
-- =====================
CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('deposit', 'stocks', 'crypto', 'real_estate', 'bonds', 'other')),
  invested_amount NUMERIC(12,2) NOT NULL,
  current_value NUMERIC(12,2),
  annual_return_rate NUMERIC(5,2),
  start_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- AI CHAT HISTORY
-- =====================
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]',
  context_type VARCHAR(30),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: пользователь видит только свои данные
CREATE POLICY "user_own_data" ON user_profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "user_own_accounts" ON accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own_transactions" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own_credits" ON credits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own_debts" ON debts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own_investments" ON investments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own_ai" ON ai_conversations FOR ALL USING (auth.uid() = user_id);

-- Triggers для updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**После задачи:**
```bash
git add . && git commit -m "feat: supabase schema migrations [1/8]"
# Обнови PROGRESS.md: отметь задачу 1 выполненной
```

---

## ЗАДАЧА 2 — Onboarding Flow

### Логика: после регистрации проверяем `onboarding_completed`

### Файл: `src/middleware.ts`

```ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('onboarding_completed')
      .eq('id', session.user.id)
      .single()

    const isOnboardingPage = req.nextUrl.pathname === '/onboarding'
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth')

    if (!profile?.onboarding_completed && !isOnboardingPage && !isAuthPage) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

### Файл: `src/app/onboarding/page.tsx`

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { motion, AnimatePresence } from 'framer-motion'

const STEPS = [
  {
    id: 'income',
    title: 'Ваш ежемесячный доход',
    subtitle: 'Чистый доход после налогов',
    type: 'number',
    field: 'monthly_income',
    placeholder: '500 000',
    suffix: '₸',
  },
  {
    id: 'housing',
    title: 'Тип жилья',
    subtitle: 'Выберите вашу ситуацию',
    type: 'select',
    field: 'housing_type',
    options: [
      { value: 'own', label: '🏠 Собственное жильё', hasAmount: false },
      { value: 'rent', label: '🔑 Аренда', hasAmount: true, amountLabel: 'Сумма аренды/мес' },
      { value: 'mortgage', label: '🏦 Ипотека', hasAmount: true, amountLabel: 'Платёж/мес', hasExtra: true, extraLabel: 'Остаток долга' },
    ],
  },
  {
    id: 'credits',
    title: 'Активные кредиты или рассрочки',
    subtitle: 'Только суммарный ежемесячный платёж',
    type: 'toggle_number',
    field: 'has_credits',
    amountField: 'credits_monthly_total',
    placeholder: '45 000',
    suffix: '₸/мес',
  },
  {
    id: 'car',
    title: 'Есть ли у вас автомобиль?',
    subtitle: 'Топливо, страховка, обслуживание в месяц',
    type: 'toggle_number',
    field: 'has_car',
    amountField: 'car_monthly_cost',
    placeholder: '60 000',
    suffix: '₸/мес',
  },
  {
    id: 'goal',
    title: 'Ваша главная финансовая цель',
    subtitle: 'Это поможет ИИ персонализировать советы',
    type: 'goal_select',
    field: 'financial_goal',
    options: [
      { value: 'control', label: '📊 Контролировать расходы', desc: 'Знать куда уходят деньги' },
      { value: 'save', label: '💰 Накопить', desc: 'Создать подушку безопасности' },
      { value: 'pay_debts', label: '🎯 Закрыть долги', desc: 'Избавиться от кредитов быстрее' },
      { value: 'invest', label: '📈 Инвестировать', desc: 'Заставить деньги работать' },
    ],
  },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const currentStep = STEPS[step]
  const progress = ((step + 1) / STEPS.length) * 100

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else handleSubmit()
  }

  const handleSubmit = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('user_profiles').upsert({
      id: user.id,
      monthly_income: data.monthly_income,
      housing_type: data.housing_type,
      housing_monthly_cost: data.housing_monthly_cost,
      mortgage_remaining: data.mortgage_remaining,
      has_car: data.has_car,
      car_monthly_cost: data.car_monthly_cost,
      financial_goal: data.financial_goal,
      onboarding_completed: true,
    })

    // Создать дефолтный счёт
    await supabase.from('accounts').insert({
      user_id: user.id,
      name: 'Основной счёт',
      type: 'card',
      balance: 0,
      currency: 'KZT',
      color: '#376E6F',
    })

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#1C3334] flex flex-col items-center justify-center p-6">
      {/* Progress bar */}
      <div className="w-full max-w-md mb-8">
        <div className="flex justify-between text-xs text-[#DA7B93] mb-2">
          <span>Настройка профиля</span>
          <span>{step + 1} / {STEPS.length}</span>
        </div>
        <div className="h-1 bg-[#2F4454] rounded-full">
          <motion.div
            className="h-full bg-[#DA7B93] rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Step Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md bg-[#2F4454] rounded-2xl p-8 shadow-2xl"
        >
          <h2 className="text-2xl font-bold text-white mb-2">{currentStep.title}</h2>
          <p className="text-[#DA7B93] text-sm mb-6">{currentStep.subtitle}</p>

          {/* Render input based on type — см. компоненты ниже */}
          <OnboardingStepInput
            step={currentStep}
            data={data}
            onChange={(updates) => setData(prev => ({ ...prev, ...updates }))}
          />

          <button
            onClick={handleNext}
            disabled={loading}
            className="mt-8 w-full py-3 bg-[#DA7B93] text-white font-semibold rounded-xl
                       hover:bg-[#c96a82] transition-colors disabled:opacity-50"
          >
            {step === STEPS.length - 1
              ? loading ? 'Сохранение...' : 'Начать работу →'
              : 'Далее →'}
          </button>

          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="mt-3 w-full py-2 text-[#DA7B93] text-sm hover:text-white transition-colors"
            >
              ← Назад
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// Компонент для рендера разных типов инпутов
function OnboardingStepInput({ step, data, onChange }: any) {
  // Реализуй каждый type: 'number', 'select', 'toggle_number', 'goal_select'
  // Для 'number': <input type="number"> с suffix
  // Для 'select': карточки с опциями, при hasAmount — доп. инпут
  // Для 'toggle_number': переключатель Да/Нет, если Да — инпут суммы
  // Для 'goal_select': большие карточки с иконкой и описанием
}
```

**После задачи:**
```bash
git add . && git commit -m "feat: onboarding flow 5-step survey [2/8]"
```

---

## ЗАДАЧА 3 — Раздел "Счета" (Accounts)

### Файл: `src/app/(dashboard)/accounts/page.tsx`

**Что реализовать:**

```
UI структура:
├── Карточка "Общий баланс" — сумма всех активных счетов
├── Список счетов (AccountCard каждый):
│   ├── Иконка + цвет (пользователь выбирает)
│   ├── Название счёта
│   ├── Тип (карта/наличные/депозит)
│   ├── Баланс
│   └── Кнопки: Пополнить / Списать / Редактировать / Удалить
└── Кнопка "Добавить счёт" → модальное окно
```

### Файл: `src/hooks/useAccounts.ts`

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabase = createClientComponentClient()

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useTotalBalance(accounts: any[]) {
  return accounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) ?? 0
}

export function useAddAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (account: {
      name: string
      type: string
      balance: number
      currency: string
      color: string
      icon: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('accounts')
        .insert({ ...account, user_id: user!.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('accounts').update({ is_active: false }).eq('id', id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useUpdateBalance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, delta }: { id: string; delta: number }) => {
      // delta: +/- сумма
      const { data: acc } = await supabase
        .from('accounts').select('balance').eq('id', id).single()
      await supabase
        .from('accounts')
        .update({ balance: (acc?.balance || 0) + delta })
        .eq('id', id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}
```

### Компоненты для создания:

```
src/components/accounts/
├── AccountCard.tsx          — карточка счёта с балансом и действиями
├── AddAccountModal.tsx      — модалка: имя, тип, баланс, цвет, иконка
├── TransferModal.tsx        — перевод между счетами
└── TotalBalanceCard.tsx     — общий баланс (большая карточка вверху)
```

**Доступные иконки счетов (передай в AddAccountModal):**
```ts
const ACCOUNT_ICONS = {
  card: '💳', cash: '💵', deposit: '🏦',
  crypto: '₿', savings: '🐷', other: '💼'
}

const ACCOUNT_COLORS = [
  '#376E6F', '#DA7B93', '#2F4454',
  '#2E151B', '#1C3334', '#5B8FA8', '#E8A87C'
]
```

**После задачи:**
```bash
git add . && git commit -m "feat: accounts section with CRUD and balance tracking [3/8]"
```

---

## ЗАДАЧА 4 — Раздел "Кредиты, Рассрочки и Долги"

### Файл: `src/app/(dashboard)/credits/page.tsx`

**UI структура:**

```
Вкладки: [Кредиты & Рассрочки] [Долги]

--- Кредиты & Рассрочки ---
├── Сводка: Общий долг / Платежей в этом месяце / До закрытия (ближайший)
├── Список CreditCard:
│   ├── Название + тип
│   ├── Прогресс-бар (сколько выплачено)
│   ├── Остаток / Всего
│   ├── Платёж/мес + следующий платёж (дата)
│   └── Кнопка "Внести платёж" → вычитает из счёта + уменьшает remaining_amount
└── Кнопка "Добавить кредит"

--- Долги ---
├── "Я должен" / "Мне должны" — переключатель
├── Список DebtCard:
│   ├── Имя + сумма + дата возврата
│   ├── Статус: Активен / Просрочен / Закрыт
│   └── Кнопки: Закрыть долг / Редактировать / Удалить
└── Кнопка "Добавить долг"
```

### Файл: `src/hooks/useCredits.ts`

```ts
export function useCredits() {
  return useQuery({
    queryKey: ['credits'],
    queryFn: async () => {
      const { data } = await supabase
        .from('credits')
        .select('*')
        .eq('is_active', true)
        .order('end_date', { ascending: true })
      return data
    },
  })
}

export function useMakePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      creditId, accountId, amount
    }: { creditId: string; accountId: string; amount: number }) => {
      // 1. Уменьшить remaining_amount в credits
      const { data: credit } = await supabase
        .from('credits').select('remaining_amount').eq('id', creditId).single()
      
      const newRemaining = Math.max(0, credit!.remaining_amount - amount)
      
      await supabase.from('credits').update({
        remaining_amount: newRemaining,
        is_active: newRemaining > 0,
      }).eq('id', creditId)

      // 2. Списать со счёта
      const { data: acc } = await supabase
        .from('accounts').select('balance').eq('id', accountId).single()
      await supabase.from('accounts')
        .update({ balance: acc!.balance - amount }).eq('id', accountId)

      // 3. Записать транзакцию
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('transactions').insert({
        user_id: user!.id, account_id: accountId,
        amount, type: 'expense', category: 'credit_payment',
        description: `Платёж по кредиту`
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credits'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}
```

### AI-подсказки по стратегии погашения

```ts
// src/lib/ai/creditStrategy.ts
export async function getCreditStrategyAdvice(credits: any[], monthlyBudget: number) {
  const totalMonthlyPayments = credits.reduce((s, c) => s + c.monthly_payment, 0)
  const extra = monthlyBudget - totalMonthlyPayments

  const prompt = `
Пользователь имеет следующие кредиты:
${credits.map(c => `- ${c.name}: остаток ${c.remaining_amount}₸, платёж ${c.monthly_payment}₸/мес, ставка ${c.interest_rate}%`).join('\n')}

Дополнительно в месяц он может направить на погашение: ${extra > 0 ? extra + '₸' : 'ничего (бюджет в минусе)'}

Предложи стратегию: avalanche (сначала с высокой ставкой) или snowball (сначала маленький долг).
Дай конкретную рекомендацию в 3-4 предложениях на русском языке.
  `

  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message: prompt, context: 'credit_strategy' }),
  })
  return res.json()
}
```

**После задачи:**
```bash
git add . && git commit -m "feat: credits debts section with payment flow [4/8]"
```

---

## ЗАДАЧА 5 — AI Персонализированный Дашборд

### Файл: `src/app/api/ai/analyze/route.ts`

```ts
import Anthropic from '@anthropic-ai/sdk'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const client = new Anthropic()

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Собираем весь контекст пользователя
  const [profile, accounts, credits, debts, transactions] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('id', user.id).single(),
    supabase.from('accounts').select('*').eq('user_id', user.id).eq('is_active', true),
    supabase.from('credits').select('*').eq('user_id', user.id).eq('is_active', true),
    supabase.from('debts').select('*').eq('user_id', user.id).eq('is_settled', false),
    supabase.from('transactions')
      .select('*').eq('user_id', user.id)
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  ])

  const p = profile.data
  const totalBalance = accounts.data?.reduce((s, a) => s + a.balance, 0) ?? 0
  const totalCreditPayments = credits.data?.reduce((s, c) => s + c.monthly_payment, 0) ?? 0
  const monthlyExpenses = transactions.data
    ?.filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0) ?? 0

  const systemPrompt = `
Ты — персональный финансовый ИИ-ассистент по имени Bonssai.
Ты анализируешь финансы пользователя и даёшь практичные, конкретные советы на русском языке.
Ты НЕ даёшь юридических или инвестиционных рекомендаций как профессиональный советник.
Твои ответы — краткие, дружелюбные, с конкретными цифрами.
  `

  const userContext = `
ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ:
- Доход: ${p?.monthly_income?.toLocaleString('ru')}₸/мес
- Жильё: ${p?.housing_type} ${p?.housing_monthly_cost ? `(${p.housing_monthly_cost.toLocaleString('ru')}₸/мес)` : ''}
- Авто: ${p?.has_car ? `есть (${p.car_monthly_cost?.toLocaleString('ru')}₸/мес)` : 'нет'}
- Цель: ${p?.financial_goal}

СЧЕТА:
${accounts.data?.map(a => `- ${a.name}: ${a.balance.toLocaleString('ru')}₸`).join('\n')}
Общий баланс: ${totalBalance.toLocaleString('ru')}₸

КРЕДИТЫ/РАССРОЧКИ:
${credits.data?.length ? credits.data.map(c => `- ${c.name}: ${c.remaining_amount.toLocaleString('ru')}₸ (платёж ${c.monthly_payment.toLocaleString('ru')}₸/мес)`).join('\n') : 'нет'}
Итого платежей: ${totalCreditPayments.toLocaleString('ru')}₸/мес

РАСХОДЫ ЗА ПОСЛЕДНИЕ 30 ДНЕЙ: ${monthlyExpenses.toLocaleString('ru')}₸

СВОБОДНЫЕ СРЕДСТВА В МЕСЯЦ:
${((p?.monthly_income ?? 0) - totalCreditPayments - (p?.housing_monthly_cost ?? 0) - (p?.car_monthly_cost ?? 0)).toLocaleString('ru')}₸
  `

  const { message: userMessage } = await req.json()

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userContext + '\n\nВопрос: ' + userMessage }
    ],
  })

  return Response.json({
    reply: response.content[0].type === 'text' ? response.content[0].text : '',
  })
}
```

### Dashboard компоненты:

```
src/components/dashboard/
├── FinancialSummary.tsx    — Доход / Расходы / Свободные средства
├── BudgetHealthCard.tsx    — "Здоровье бюджета" — индикатор (хорошо/предупреждение/плохо)
├── AIInsightCard.tsx       — ИИ-совет дня (автоматически при загрузке)
├── UpcomingPayments.tsx    — Ближайшие платежи по кредитам (7 дней)
└── GoalProgressCard.tsx    — Прогресс к цели пользователя
```

### Логика BudgetHealthCard:

```ts
function getBudgetHealth(income: number, expenses: number, credits: number) {
  const total = expenses + credits
  const ratio = total / income

  if (ratio < 0.5) return { status: 'excellent', label: 'Отлично', color: '#376E6F' }
  if (ratio < 0.7) return { status: 'good', label: 'Хорошо', color: '#5B8FA8' }
  if (ratio < 0.85) return { status: 'warning', label: 'Внимание', color: '#E8A87C' }
  return { status: 'critical', label: 'Критично', color: '#DA7B93' }
}
```

**После задачи:**
```bash
git add . && git commit -m "feat: AI personalized dashboard with budget health [5/8]"
```

---

## ЗАДАЧА 6 — Раздел "Инвестиции"

### Важно: образовательный подход, НЕ финансовый совет

### Файл: `src/app/(dashboard)/investments/page.tsx`

```
UI структура:
├── Дисклеймер (1 строка): "Информация носит образовательный характер"
├── Сводка портфеля:
│   ├── Вложено всего
│   ├── Текущая стоимость (если указана)
│   └── Доходность % (расчётная)
├── Список InvestmentCard:
│   ├── Тип + название
│   ├── Вложено / Текущая стоимость
│   ├── Доходность (+ / -)
│   └── Срок инвестиции
├── Кнопка "Добавить инвестицию"
└── ИИ-анализ портфеля (кнопка "Анализировать")
    → диверсификация, риск-профиль, рекомендации по балансу
```

### Файл: `src/hooks/useInvestments.ts`

```ts
export function useInvestments() {
  return useQuery({
    queryKey: ['investments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('investments').select('*')
        .order('created_at', { ascending: false })
      return data
    },
  })
}

export function usePortfolioStats(investments: any[]) {
  const totalInvested = investments?.reduce((s, i) => s + i.invested_amount, 0) ?? 0
  const totalCurrent = investments?.reduce((s, i) => s + (i.current_value ?? i.invested_amount), 0) ?? 0
  const returnPct = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0

  const byType = investments?.reduce((acc, i) => {
    acc[i.type] = (acc[i.type] ?? 0) + i.invested_amount
    return acc
  }, {} as Record<string, number>)

  return { totalInvested, totalCurrent, returnPct, byType }
}
```

### AI промпт для анализа портфеля:

```ts
export function buildPortfolioAnalysisPrompt(investments: any[], profile: any) {
  const byType = investments.reduce((acc, i) => {
    acc[i.type] = (acc[i.type] ?? 0) + i.invested_amount
    return acc
  }, {})

  return `
Пользователь имеет следующий инвестиционный портфель:
${Object.entries(byType).map(([type, amount]) => `- ${type}: ${(amount as number).toLocaleString('ru')}₸`).join('\n')}

Его финансовая цель: ${profile?.financial_goal}
Свободные средства в месяц: [рассчитать из профиля]

Дай образовательный анализ:
1. Насколько диверсифицирован портфель?
2. Какой примерный риск-профиль?
3. Что можно рассмотреть для балансировки?

Напомни: это НЕ финансовый совет, а информация для самостоятельного принятия решений.
  `
}
```

**После задачи:**
```bash
git add . && git commit -m "feat: investments section with portfolio analysis [6/8]"
```

---

## ЗАДАЧА 7 — Голосовой ассистент

### Файл: `src/components/ai/VoiceAssistant.tsx`

```tsx
'use client'
import { useState, useRef, useCallback } from 'react'

export function VoiceAssistant({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    chunksRef.current = []

    recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
    recorder.onstop = async () => {
      setIsProcessing(true)
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })

      // Отправляем на наш API → Whisper / Web Speech API
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')

      try {
        const res = await fetch('/api/ai/transcribe', {
          method: 'POST', body: formData
        })
        const { transcript } = await res.json()
        onTranscript(transcript)
      } finally {
        setIsProcessing(false)
        stream.getTracks().forEach(t => t.stop())
      }
    }

    mediaRecorderRef.current = recorder
    recorder.start()
    setIsRecording(true)
  }, [onTranscript])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }, [])

  return (
    <button
      onMouseDown={startRecording}
      onMouseUp={stopRecording}
      onTouchStart={startRecording}
      onTouchEnd={stopRecording}
      className={`
        w-14 h-14 rounded-full flex items-center justify-center
        transition-all duration-200 shadow-lg
        ${isRecording
          ? 'bg-[#DA7B93] scale-110 animate-pulse'
          : 'bg-[#376E6F] hover:bg-[#2F4454]'}
      `}
      aria-label={isRecording ? 'Остановить запись' : 'Говорить'}
    >
      {isProcessing ? (
        <span className="text-white text-xs">...</span>
      ) : (
        <MicIcon active={isRecording} />
      )}
    </button>
  )
}
```

### Файл: `src/app/api/ai/transcribe/route.ts`

```ts
// Вариант А: Web Speech API (бесплатно, только браузер)
// → используй SpeechRecognition на клиенте напрямую

// Вариант Б: OpenAI Whisper (если добавишь ключ)
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  const formData = await req.formData()
  const audio = formData.get('audio') as File

  const transcription = await openai.audio.transcriptions.create({
    file: audio,
    model: 'whisper-1',
    language: 'ru',
  })

  return Response.json({ transcript: transcription.text })
}

// Вариант В: Web Speech API на клиенте (самый простой старт)
// src/hooks/useSpeechRecognition.ts
export function useSpeechRecognition(onResult: (text: string) => void) {
  const SpeechRecognition =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null

  const startListening = () => {
    if (!SpeechRecognition) return
    const recognition = new SpeechRecognition()
    recognition.lang = 'ru-RU'
    recognition.interimResults = false
    recognition.onresult = (e: any) => onResult(e.results[0][0].transcript)
    recognition.start()
    return recognition
  }

  return { startListening }
}
```

**После задачи:**
```bash
git add . && git commit -m "feat: voice assistant with speech recognition [7/8]"
```

---

## ЗАДАЧА 8 — Навигация и финальная интеграция

### Файл: `src/components/layout/Sidebar.tsx`

```tsx
const NAV_ITEMS = [
  { href: '/dashboard', icon: '📊', label: 'Обзор' },
  { href: '/accounts', icon: '💳', label: 'Счета' },
  { href: '/transactions', icon: '↕️', label: 'Транзакции' },
  { href: '/credits', icon: '🏦', label: 'Кредиты и долги' },
  { href: '/investments', icon: '📈', label: 'Инвестиции' },
  { href: '/ai', icon: '🤖', label: 'ИИ-ассистент' },
]
```

### Zustand store для глобального состояния:

```ts
// src/store/userStore.ts
import { create } from 'zustand'

interface UserStore {
  profile: any | null
  accounts: any[]
  setProfile: (p: any) => void
  setAccounts: (a: any[]) => void
  totalBalance: () => number
  freeMonthlyBudget: () => number
}

export const useUserStore = create<UserStore>((set, get) => ({
  profile: null,
  accounts: [],
  setProfile: (profile) => set({ profile }),
  setAccounts: (accounts) => set({ accounts }),
  totalBalance: () => get().accounts.reduce((s, a) => s + a.balance, 0),
  freeMonthlyBudget: () => {
    const p = get().profile
    if (!p) return 0
    return (p.monthly_income ?? 0)
      - (p.housing_monthly_cost ?? 0)
      - (p.car_monthly_cost ?? 0)
  },
}))
```

**После задачи:**
```bash
git add . && git commit -m "feat: navigation sidebar and zustand global store [8/8]"
# Обнови PROGRESS.md: все задачи выполнены
```

---

## ENV Variables (добавь в .env.local и Vercel)

```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key   # опционально, для Whisper
```

---

## Порядок запуска Claude Code

```
1. Открой проект bonssai в терминале
2. Создай PROGRESS.md (скопируй из начала этого файла)
3. Дай Claude Code этот план целиком как контекст
4. Скажи: "Начни с Задачи 1. После каждой задачи делай git commit и обновляй PROGRESS.md"
5. Если сессия прервётся: "Прочитай PROGRESS.md и git log, продолжи с первой незакрытой задачи"
```

---

## Итоговая структура проекта

```
src/
├── app/
│   ├── (auth)/
│   │   └── auth/
│   ├── onboarding/          ← НОВОЕ
│   ├── (dashboard)/
│   │   ├── dashboard/       ← УЛУЧШЕНО
│   │   ├── accounts/        ← НОВОЕ
│   │   ├── credits/         ← НОВОЕ
│   │   ├── investments/     ← НОВОЕ
│   │   └── ai/              ← УЛУЧШЕНО
│   └── api/
│       └── ai/
│           ├── chat/
│           ├── analyze/     ← НОВОЕ
│           └── transcribe/  ← НОВОЕ
├── components/
│   ├── accounts/
│   ├── credits/
│   ├── investments/
│   ├── dashboard/
│   ├── ai/
│   └── layout/
├── hooks/
│   ├── useAccounts.ts
│   ├── useCredits.ts
│   ├── useDebts.ts
│   ├── useInvestments.ts
│   └── useSpeechRecognition.ts
├── store/
│   └── userStore.ts
└── lib/
    └── ai/
        ├── creditStrategy.ts
        └── portfolioAnalysis.ts

supabase/
└── migrations/
    └── 001_bonssai_upgrade.sql
```
