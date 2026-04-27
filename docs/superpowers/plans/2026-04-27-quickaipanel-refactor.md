# QuickAIPanel Refactor & Feature Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the 429-line monolithic `QuickAIPanel.tsx` into focused hooks, utilities, and presentational subcomponents, and add live voice transcript, command history, and a "Delete" chip.

**Architecture:** Extract data-fetching into `useQuickAIData`, business logic into `useCommandExecutor` (with localStorage history), voice input into `useVoiceInput`. Presentational subcomponents (`ChipBar`, `InputRow`, `StatusBar`) receive only props. The main `QuickAIPanel.tsx` becomes a ~80-line orchestrator.

**Tech Stack:** React 19, TypeScript, TanStack Query v5, Zustand, React Router v7, Tailwind CSS v4, Lucide React, Web Speech API

---

## File Map

| Action | Path |
|--------|------|
| Create | `src/widgets/QuickAIPanel/lib/constants.ts` |
| Create | `src/widgets/QuickAIPanel/lib/parsers.ts` |
| Create | `src/widgets/QuickAIPanel/hooks/useVoiceInput.ts` |
| Create | `src/widgets/QuickAIPanel/hooks/useQuickAIData.ts` |
| Create | `src/widgets/QuickAIPanel/hooks/useCommandExecutor.ts` |
| Create | `src/widgets/QuickAIPanel/ui/ChipBar.tsx` |
| Create | `src/widgets/QuickAIPanel/ui/InputRow.tsx` |
| Create | `src/widgets/QuickAIPanel/ui/StatusBar.tsx` |
| Rewrite | `src/widgets/QuickAIPanel/QuickAIPanel.tsx` |
| Keep    | `src/widgets/QuickAIPanel/index.ts` (no change needed) |

---

## Task 1: Create `lib/constants.ts`

**Files:**
- Create: `src/widgets/QuickAIPanel/lib/constants.ts`

- [ ] **Step 1: Create the file**

```ts
// src/widgets/QuickAIPanel/lib/constants.ts
export const CHIPS = [
  { label: '💸 Расход',   template: 'добавь расход ' },
  { label: '💰 Доход',    template: 'добавь доход ' },
  { label: '🎯 Цель',     template: 'создай цель ' },
  { label: '📊 Лимит',    template: 'поставь лимит ' },
  { label: '🗑️ Удалить', template: 'удали последний расход' },
] as const;

export type Chip = typeof CHIPS[number];
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/widgets/QuickAIPanel/lib/constants.ts
git commit -m "feat(QuickAIPanel): add constants with 5th delete chip"
```

---

## Task 2: Create `lib/parsers.ts`

Extracts `parseTransactionFromText`, `parseGoalFromText`, and `resolveCategoryId` from the monolithic component.

**Files:**
- Create: `src/widgets/QuickAIPanel/lib/parsers.ts`

- [ ] **Step 1: Create the file**

```ts
// src/widgets/QuickAIPanel/lib/parsers.ts
import type { Category } from '@/entities/category';

const normalize = (v: string) => v.toLowerCase().replace(/\s+/g, ' ').trim();

export function resolveCategoryId(
  txType: 'income' | 'expense' | 'transfer',
  categories: Category[],
  categoryId?: string,
  categoryName?: string,
): string | null {
  if (txType === 'transfer') return null;
  const allowed = categories.filter(c => c.type === txType || c.type === 'both');
  if (categoryId && allowed.some(c => c.id === categoryId)) return categoryId;
  if (categoryName) {
    const src = normalize(categoryName);
    const match = allowed.find(c => {
      const cur = normalize(c.name_ru);
      return cur.includes(src) || src.includes(cur);
    });
    if (match) return match.id;
  }
  return allowed[0]?.id ?? null;
}

export function parseTransactionFromText(text: string): {
  amount?: number;
  account?: 'main' | 'kaspi' | 'cash';
  type?: 'income' | 'expense';
} {
  const lower = text.toLowerCase();
  let amount: number | undefined;
  for (const re of [/сумма\s+(\d[\d\s]*)/, /(\d[\d\s]*)\s*(?:тенге|тг|₸)/, /за\s+(\d[\d\s]*)/]) {
    const m = lower.match(re);
    if (m) {
      const n = parseFloat(m[1].replace(/\s/g, ''));
      if (n > 0) { amount = n; break; }
    }
  }
  if (!amount) {
    const m = lower.match(/\b(\d{2,})\b/);
    if (m) { const n = parseFloat(m[1]); if (n > 0) amount = n; }
  }
  const account: 'main' | 'kaspi' | 'cash' | undefined =
    /каспи|kaspi/i.test(lower) ? 'kaspi' : /налич/i.test(lower) ? 'cash' : undefined;
  const type: 'income' | 'expense' = /доход|зарплат|получил|получила|пришл/i.test(lower) ? 'income' : 'expense';
  return { amount, account, type };
}

const MONTHS: Record<string, string> = {
  январ: '01', феврал: '02', март: '03', апрел: '04', май: '05', мая: '05',
  июн: '06', июл: '07', август: '08', сентябр: '09', октябр: '10', ноябр: '11', декабр: '12',
};

export function parseGoalFromText(text: string): {
  name?: string;
  target_amount?: number;
  deadline?: string;
} {
  const lower = text.toLowerCase();
  const amountMatch = lower.match(/(\d[\d\s]*(?:млн|миллион\w*)?)\s*(?:тенге|тг|₸)?/);
  let target_amount: number | undefined;
  if (amountMatch) {
    const raw = amountMatch[1].replace(/\s/g, '');
    const num = parseFloat(raw);
    target_amount = /млн|миллион/i.test(amountMatch[0]) ? num * 1_000_000 : num;
  }
  let deadline: string | undefined;
  const dm = lower.match(
    /до\s+(\d{1,2})\s+(январ|феврал|март|апрел|май|мая|июн|июл|август|сентябр|октябр|ноябр|декабр)\w*/,
  );
  if (dm) {
    deadline = `${new Date().getFullYear()}-${MONTHS[dm[2]] ?? '01'}-${String(dm[1]).padStart(2, '0')}`;
  }
  const keys = ['жильё','жилье','машин','авто','отпуск','путешеств','ноутбук','телефон','образован','свадьб','ремонт','пенси','бизнес'];
  const found = keys.find(k => lower.includes(k));
  const name = found
    ? found.charAt(0).toUpperCase() + found.slice(1).replace(/[аяеёиоуыэюь]+$/, '')
    : undefined;
  return { name, target_amount, deadline };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/widgets/QuickAIPanel/lib/parsers.ts
git commit -m "feat(QuickAIPanel): extract parsers to lib/parsers.ts"
```

---

## Task 3: Create `hooks/useVoiceInput.ts`

Encapsulates `SpeechRecognition` with live interim transcript.

**Files:**
- Create: `src/widgets/QuickAIPanel/hooks/useVoiceInput.ts`

- [ ] **Step 1: Create the file**

```ts
// src/widgets/QuickAIPanel/hooks/useVoiceInput.ts
import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;    // confirmed final result — caller should sync to input
  interimText: string;   // live interim text while speaking
  start: () => void;
  stop: () => void;
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimText('');
  }, []);

  const start = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR: new () => any = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) { alert('Голосовой ввод доступен только в Chrome / Edge.'); return; }

    setTranscript('');
    setInterimText('');

    const r = new SR();
    r.lang = 'ru-RU';
    r.interimResults = true;
    r.maxAlternatives = 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += text;
        else interim += text;
      }
      if (final) {
        setTranscript(final);
        setInterimText('');
      } else {
        setInterimText(interim);
      }
    };

    r.onerror = () => { setIsListening(false); setInterimText(''); };
    r.onend = () => { setIsListening(false); setInterimText(''); };

    recognitionRef.current = r;
    r.start();
    setIsListening(true);
  }, []);

  useEffect(() => () => { recognitionRef.current?.stop(); }, []);

  return { isListening, transcript, interimText, start, stop };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/widgets/QuickAIPanel/hooks/useVoiceInput.ts
git commit -m "feat(QuickAIPanel): add useVoiceInput hook with live interim transcript"
```

---

## Task 4: Create `hooks/useQuickAIData.ts`

Encapsulates the three `useQuery` calls and `invalidateAll`.

**Files:**
- Create: `src/widgets/QuickAIPanel/hooks/useQuickAIData.ts`

- [ ] **Step 1: Create the file**

```ts
// src/widgets/QuickAIPanel/hooks/useQuickAIData.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllTransactions } from '@/entities/transaction';
import { fetchCategories } from '@/entities/category';
import { fetchBudgets, fetchSpentByCategory } from '@/entities/budget';
import type { Transaction } from '@/entities/transaction';
import type { Category } from '@/entities/category';

interface UseQuickAIDataOptions {
  userId: string | undefined;
  isOpen: boolean;
}

interface UseQuickAIDataReturn {
  allTxns: Transaction[];
  categories: Category[];
  invalidateAll: () => void;
}

export function useQuickAIData({ userId, isOpen }: UseQuickAIDataOptions): UseQuickAIDataReturn {
  const queryClient = useQueryClient();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: allTxns = [] } = useQuery({
    queryKey: ['transactions-all', userId],
    queryFn: () => fetchAllTransactions(userId!),
    enabled: !!userId && isOpen,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    enabled: isOpen,
  });

  // Fetched for cache warmth only — not returned
  useQuery({
    queryKey: ['budgets', userId, year, month],
    queryFn: () => fetchBudgets(userId!, year, month),
    enabled: !!userId && isOpen,
  });

  useQuery({
    queryKey: ['spent', userId, year, month],
    queryFn: () => fetchSpentByCategory(userId!, year, month),
    enabled: !!userId && isOpen,
  });

  const invalidateAll = () => {
    [
      'transactions', 'transactions-all', 'transactions-year',
      'transactions-month-structure', 'totals', 'spent', 'budgets',
    ].forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  return { allTxns, categories, invalidateAll };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/widgets/QuickAIPanel/hooks/useQuickAIData.ts
git commit -m "feat(QuickAIPanel): add useQuickAIData hook"
```

---

## Task 5: Create `hooks/useCommandExecutor.ts`

The heaviest hook — all command execution logic, status state machine, and localStorage history.

**Files:**
- Create: `src/widgets/QuickAIPanel/hooks/useCommandExecutor.ts`

- [ ] **Step 1: Create the file**

```ts
// src/widgets/QuickAIPanel/hooks/useCommandExecutor.ts
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/entities/user';
import { createTransaction, deleteTransaction } from '@/entities/transaction';
import { upsertBudget } from '@/entities/budget';
import { createGoal } from '@/entities/goal';
import { detectChatIntent } from '@/shared/api/gemini';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { resolveCategoryId, parseTransactionFromText, parseGoalFromText } from '../lib/parsers';
import type { Category } from '@/entities/category';
import type { Transaction } from '@/entities/transaction';

export type Status =
  | { kind: 'idle' }
  | { kind: 'executing' }
  | { kind: 'success'; msg: string }
  | { kind: 'error'; msg: string };

const HISTORY_KEY = 'quickai_history';
const MAX_HISTORY = 5;

function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); }
  catch { return []; }
}

interface UseCommandExecutorOptions {
  categories: Category[];
  allTxns: Transaction[];
  onClose: () => void;
  invalidateAll: () => void;
}

export interface UseCommandExecutorReturn {
  status: Status;
  execute: (text: string) => void;
  history: string[];
  clearHistory: () => void;
}

export function useCommandExecutor({
  categories,
  allTxns,
  onClose,
  invalidateAll,
}: UseCommandExecutorOptions): UseCommandExecutorReturn {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [history, setHistory] = useState<string[]>(loadHistory);
  const isExecutingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Auto-close 1.8s after success
  useEffect(() => {
    if (status.kind !== 'success') return;
    const t = setTimeout(() => { onClose(); setStatus({ kind: 'idle' }); }, 1800);
    return () => clearTimeout(t);
  }, [status, onClose]);

  const addToHistory = useCallback((text: string) => {
    setHistory(prev => {
      const next = [text, ...prev.filter(h => h !== text)].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  const execute = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isExecutingRef.current) return;
    isExecutingRef.current = true;

    const run = async () => {
      setStatus({ kind: 'executing' });

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      let intent;
      try {
        intent = await detectChatIntent(trimmed, {
          categories: categories.map(c => ({ id: c.id, name_ru: c.name_ru, type: c.type })),
        });
      } catch {
        if (isMountedRef.current) setStatus({ kind: 'error', msg: 'Не удалось распознать команду.' });
        return;
      }

      if (!isMountedRef.current) return;

      if (intent.intent === 'none') {
        setStatus({ kind: 'error', msg: 'Не распознана команда. Попробуйте: "добавь расход 4500 такси".' });
        return;
      }

      try {
        if (intent.intent === 'show_commands_help') { navigate('/ai'); onClose(); return; }
        if (intent.intent === 'open_management') { navigate('/transactions'); onClose(); return; }

        if (intent.intent === 'delete_last_transaction') {
          const scope = intent.delete_transaction?.scope ?? 'last';
          const sorted = [...allTxns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const candidate =
            scope === 'last_expense' ? sorted.find(t => t.type === 'expense') :
            scope === 'last_income'  ? sorted.find(t => t.type === 'income')  : sorted[0];
          if (!candidate) { setStatus({ kind: 'error', msg: 'Транзакций для удаления не найдено.' }); return; }
          await deleteTransaction(candidate.id);
          if (!isMountedRef.current) return;
          invalidateAll();
          addToHistory(trimmed);
          setStatus({ kind: 'success', msg: `Удалена: ${candidate.type === 'income' ? 'доход' : 'расход'} ${formatCurrency(candidate.amount)}${candidate.description ? ` "${candidate.description}"` : ''}.` });
          return;
        }

        if (intent.intent === 'update_budget_limit') {
          const b = intent.budget ?? {};
          const limitAmount = Number(b.limit_amount ?? NaN);
          if (!Number.isFinite(limitAmount) || limitAmount < 0) {
            setStatus({ kind: 'error', msg: 'Укажите сумму лимита. Пример: "поставь лимит 50000 на еду".' });
            return;
          }
          const catId = resolveCategoryId('expense', categories, b.category_id, b.category_name);
          const catName = catId
            ? categories.find(c => c.id === catId)?.name_ru ?? b.category_name ?? 'Категория'
            : b.category_name ?? 'Категория';
          if (!catId) { setStatus({ kind: 'error', msg: 'Не удалось определить категорию. Уточните название.' }); return; }
          const period = (b.period && ['month', 'week', 'year'].includes(b.period))
            ? b.period as 'month' | 'week' | 'year'
            : 'month';
          await upsertBudget({
            user_id: user!.id, category_id: catId, limit_amount: limitAmount,
            period, year: b.year ?? year, month: b.month ?? month, notify_at_pct: 80,
          });
          if (!isMountedRef.current) return;
          queryClient.invalidateQueries({ queryKey: ['budgets'] });
          queryClient.invalidateQueries({ queryKey: ['spent'] });
          addToHistory(trimmed);
          setStatus({ kind: 'success', msg: `Лимит "${catName}": ${formatCurrency(limitAmount)}.` });
          return;
        }

        if (intent.intent === 'create_goal') {
          const g = intent.goal ?? {};
          let gName = g.name;
          let gTarget = Number(g.target_amount ?? NaN);
          let gDeadline = g.deadline;
          if (!gName || !Number.isFinite(gTarget) || gTarget <= 0) {
            const local = parseGoalFromText(trimmed);
            gName = gName || local.name;
            if (!Number.isFinite(gTarget) || gTarget <= 0) gTarget = local.target_amount ?? NaN;
            gDeadline = gDeadline || local.deadline;
          }
          if (!gName || !Number.isFinite(gTarget) || gTarget <= 0) {
            setStatus({ kind: 'error', msg: 'Укажите название и сумму. Пример: "создай цель Машина на 3 миллиона".' });
            return;
          }
          const deadline = gDeadline && /^\d{4}-\d{2}-\d{2}$/.test(gDeadline) ? gDeadline : null;
          await createGoal({
            user_id: user!.id, name: gName, target_amount: gTarget,
            current_amount: Number(g.current_amount ?? 0) || 0,
            deadline, icon: g.icon ?? '🎯', color: g.color ?? '#1D9E75',
          });
          if (!isMountedRef.current) return;
          queryClient.invalidateQueries({ queryKey: ['goals'] });
          addToHistory(trimmed);
          setStatus({ kind: 'success', msg: `Цель "${gName}" создана на ${formatCurrency(gTarget)}${deadline ? ` · до ${deadline}` : ''}.` });
          return;
        }

        if (intent.intent === 'create_transaction') {
          const tx = intent.transaction ?? {};
          let type = tx.type ?? 'expense';
          let amount = Number(tx.amount ?? NaN);
          let txAccount = tx.account;

          if (!Number.isFinite(amount) || amount <= 0) {
            const local = parseTransactionFromText(trimmed);
            if (!Number.isFinite(amount) || amount <= 0) amount = local.amount ?? NaN;
            if (!txAccount) txAccount = local.account;
            if (tx.type === undefined) type = local.type ?? 'expense';
          }

          if (!Number.isFinite(amount) || amount <= 0) {
            setStatus({ kind: 'error', msg: intent.reply ?? 'Укажите сумму. Пример: "добавь расход 4500 такси".' });
            return;
          }
          const date = typeof tx.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tx.date)
            ? tx.date
            : new Date().toISOString().split('T')[0];
          const account: 'main' | 'kaspi' | 'cash' =
            txAccount && ['main', 'kaspi', 'cash'].includes(txAccount)
              ? txAccount as 'main' | 'kaspi' | 'cash'
              : 'main';
          const categoryId = resolveCategoryId(type, categories, tx.category_id, tx.category_name);
          const categoryName = categoryId ? categories.find(c => c.id === categoryId)?.name_ru ?? null : null;
          if (type !== 'transfer' && !categoryId) {
            setStatus({ kind: 'error', msg: 'Не удалось определить категорию. Уточните.' });
            return;
          }
          await createTransaction({
            user_id: user!.id, amount, type,
            category_id: type === 'transfer' ? null : categoryId,
            description: tx.description?.trim() || null,
            date, account, tags: null, ai_categorized: true,
          });
          if (!isMountedRef.current) return;
          invalidateAll();
          addToHistory(trimmed);
          const typeLabel = type === 'income' ? 'доход' : type === 'transfer' ? 'перевод' : 'расход';
          setStatus({ kind: 'success', msg: `Добавлен ${typeLabel} ${formatCurrency(amount)}${categoryName ? ` · ${categoryName}` : ''}.` });
          return;
        }
      } catch (err) {
        if (isMountedRef.current)
          setStatus({ kind: 'error', msg: err instanceof Error ? err.message : 'Произошла ошибка.' });
      }
    };

    run().finally(() => { isExecutingRef.current = false; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, allTxns, user, navigate, queryClient, onClose, invalidateAll, addToHistory]);

  return { status, execute, history, clearHistory };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/widgets/QuickAIPanel/hooks/useCommandExecutor.ts
git commit -m "feat(QuickAIPanel): add useCommandExecutor hook with history"
```

---

## Task 6: Create `ui/ChipBar.tsx`

**Files:**
- Create: `src/widgets/QuickAIPanel/ui/ChipBar.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/widgets/QuickAIPanel/ui/ChipBar.tsx
import { cn } from '@/shared/lib/cn';
import type { Chip } from '../lib/constants';

interface ChipBarProps {
  chips: readonly Chip[];
  activeChip: string | null;
  onChipClick: (chip: Chip) => void;
}

export function ChipBar({ chips, activeChip, onChipClick }: ChipBarProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(chip => (
        <button
          key={chip.label}
          type="button"
          onClick={() => onChipClick(chip)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs transition-colors',
            activeChip === chip.label
              ? 'border-[#DA7B93]/60 bg-[#DA7B93]/15 text-[#DA7B93]'
              : 'border-white/15 bg-white/6 text-white/70 hover:border-white/30 hover:text-white',
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/widgets/QuickAIPanel/ui/ChipBar.tsx
git commit -m "feat(QuickAIPanel): add ChipBar subcomponent"
```

---

## Task 7: Create `ui/InputRow.tsx`

Shows the input field, mic toggle, send button, and live interim voice text below the row.

**Files:**
- Create: `src/widgets/QuickAIPanel/ui/InputRow.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/widgets/QuickAIPanel/ui/InputRow.tsx
import type { RefObject } from 'react';
import { Mic, MicOff, Send, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface InputRowProps {
  inputRef: RefObject<HTMLInputElement>;
  value: string;
  interimText: string;
  isListening: boolean;
  isExecuting: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onMicToggle: () => void;
}

export function InputRow({
  inputRef,
  value,
  interimText,
  isListening,
  isExecuting,
  onChange,
  onSubmit,
  onMicToggle,
}: InputRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSubmit()}
          placeholder="или напишите команду..."
          disabled={isExecuting}
          className="flex-1 rounded-xl border border-white/15 bg-white/8 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#DA7B93] disabled:opacity-60"
        />
        <button
          type="button"
          onClick={onMicToggle}
          disabled={isExecuting}
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-50',
            isListening
              ? 'bg-[#E24B4A] text-white animate-pulse'
              : 'border border-white/20 text-white/60 hover:bg-white/10',
          )}
        >
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!value.trim() || isExecuting}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DA7B93] text-white transition-colors hover:bg-[#e68fa4] disabled:opacity-50"
        >
          {isExecuting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>

      {isListening && interimText && (
        <p className="px-1 text-xs italic text-white/40">{interimText}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/widgets/QuickAIPanel/ui/InputRow.tsx
git commit -m "feat(QuickAIPanel): add InputRow subcomponent with interim voice text"
```

---

## Task 8: Create `ui/StatusBar.tsx`

**Files:**
- Create: `src/widgets/QuickAIPanel/ui/StatusBar.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/widgets/QuickAIPanel/ui/StatusBar.tsx
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { Status } from '../hooks/useCommandExecutor';

interface StatusBarProps {
  status: Status;
}

export function StatusBar({ status }: StatusBarProps) {
  if (status.kind === 'idle') return null;

  if (status.kind === 'executing') {
    return (
      <p className="flex items-center gap-1.5 text-xs text-white/55">
        <Loader2 size={12} className="animate-spin" /> Выполняю...
      </p>
    );
  }

  if (status.kind === 'success') {
    return (
      <p className="flex items-center gap-1.5 text-xs text-[#5DCAA5]">
        <CheckCircle size={12} /> {status.msg}
      </p>
    );
  }

  return (
    <p className="flex items-center gap-1.5 text-xs text-[#E24B4A]">
      <AlertCircle size={12} /> {status.msg}
    </p>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/widgets/QuickAIPanel/ui/StatusBar.tsx
git commit -m "feat(QuickAIPanel): add StatusBar subcomponent"
```

---

## Task 9: Rewrite `QuickAIPanel.tsx`

Replace the 429-line monolith with a slim orchestrator that calls the hooks and renders the subcomponents.

**Files:**
- Rewrite: `src/widgets/QuickAIPanel/QuickAIPanel.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
// src/widgets/QuickAIPanel/QuickAIPanel.tsx
import { useState, useRef, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useAuthStore } from '@/entities/user';
import { CHIPS } from './lib/constants';
import { useVoiceInput } from './hooks/useVoiceInput';
import { useQuickAIData } from './hooks/useQuickAIData';
import { useCommandExecutor } from './hooks/useCommandExecutor';
import { ChipBar } from './ui/ChipBar';
import { InputRow } from './ui/InputRow';
import { StatusBar } from './ui/StatusBar';

interface QuickAIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  placement?: 'below' | 'above';
}

export function QuickAIPanel({ isOpen, onClose, anchorRef }: QuickAIPanelProps) {
  const { user } = useAuthStore();
  const [input, setInput] = useState('');
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { allTxns, categories, invalidateAll } = useQuickAIData({ userId: user?.id, isOpen });
  const voice = useVoiceInput();
  const { status, execute, history, clearHistory } = useCommandExecutor({
    categories,
    allTxns,
    onClose,
    invalidateAll,
  });

  // Sync confirmed voice transcript → input
  useEffect(() => {
    if (voice.transcript) setInput(voice.transcript);
  }, [voice.transcript]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Stop voice when panel closes
  useEffect(() => {
    if (!isOpen) voice.stop();
  }, [isOpen, voice.stop]);

  // Reset state on open
  useEffect(() => {
    if (!isOpen) return;
    setInput('');
    setActiveChip(null);
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/12 bg-[rgba(13,27,38,0.96)] shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
          <Sparkles size={14} className="text-[#DA7B93]" />
          AI-команда
        </span>
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/10">
          <X size={14} className="text-white/50" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        <ChipBar
          chips={CHIPS}
          activeChip={activeChip}
          onChipClick={chip => {
            setInput(chip.template);
            setActiveChip(chip.label);
            inputRef.current?.focus();
          }}
        />

        {history.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {history.map(h => (
              <button
                key={h}
                type="button"
                onClick={() => setInput(h)}
                className="max-w-[10rem] truncate rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-white/50 transition-colors hover:border-white/20 hover:text-white/80"
              >
                {h}
              </button>
            ))}
            <button
              type="button"
              onClick={clearHistory}
              className="ml-auto text-[10px] text-white/30 transition-colors hover:text-white/60"
            >
              ✕ clear
            </button>
          </div>
        )}

        <InputRow
          inputRef={inputRef}
          value={input}
          interimText={voice.interimText}
          isListening={voice.isListening}
          isExecuting={status.kind === 'executing'}
          onChange={setInput}
          onSubmit={() => execute(input)}
          onMicToggle={voice.isListening ? voice.stop : voice.start}
        />

        <StatusBar status={status} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start dev server and open the app in browser**

```bash
npm run dev
```

Open `http://localhost:5173`, click the AI button in the header. Verify:
- All 5 chips render (including 🗑️ Удалить)
- Clicking a chip fills the input
- Mic button toggles voice input
- Interim voice text appears in italics below the input while speaking
- After speaking, confirmed text appears in the input field
- Submitting a command shows "Выполняю..." then success/error
- Successful commands appear in history row
- Clicking a history item fills the input
- ✕ clear removes history
- Escape and outside-click close the panel

- [ ] **Step 4: Commit**

```bash
git add src/widgets/QuickAIPanel/QuickAIPanel.tsx
git commit -m "refactor(QuickAIPanel): slim orchestrator using hooks and subcomponents"
```

---

## Task 10: Final cleanup commit

- [ ] **Step 1: Check for leftover artifacts**

```bash
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 2: Commit all new files together**

```bash
git add src/widgets/QuickAIPanel/
git status
git commit -m "feat(QuickAIPanel): complete refactor — hooks, subcomponents, history, live voice transcript"
```

> Note: if all previous tasks were committed individually, this step may show nothing to commit — that's fine.
