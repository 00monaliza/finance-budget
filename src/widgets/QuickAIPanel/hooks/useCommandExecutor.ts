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
