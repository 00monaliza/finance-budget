// src/widgets/QuickAIPanel/QuickAIPanel.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Mic, MicOff, Send, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/entities/user';
import { createTransaction, fetchAllTransactions, deleteTransaction } from '@/entities/transaction';
import { fetchCategories } from '@/entities/category';
import { fetchBudgets, fetchSpentByCategory, upsertBudget } from '@/entities/budget';
import { createGoal } from '@/entities/goal';
import { detectChatIntent } from '@/shared/api/gemini';
import { cn } from '@/shared/lib/cn';
import { formatCurrency } from '@/shared/lib/formatCurrency';

interface QuickAIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}

type Status = { kind: 'idle' } | { kind: 'executing' } | { kind: 'success'; msg: string } | { kind: 'error'; msg: string };

const CHIPS = [
  { label: '💸 Расход',  template: 'добавь расход ' },
  { label: '💰 Доход',   template: 'добавь доход ' },
  { label: '🎯 Цель',    template: 'создай цель ' },
  { label: '📊 Лимит',   template: 'поставь лимит ' },
] as const;

export function QuickAIPanel({ isOpen, onClose, anchorRef }: QuickAIPanelProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isExecutingRef = useRef(false);
  const isMountedRef = useRef(true);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: allTxns = [] } = useQuery({
    queryKey: ['transactions-all', user?.id],
    queryFn: () => fetchAllTransactions(user!.id),
    enabled: !!user && isOpen,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    enabled: isOpen,
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', user?.id, year, month],
    queryFn: () => fetchBudgets(user!.id, year, month),
    enabled: !!user && isOpen,
  });

  const { data: spent = {} } = useQuery({
    queryKey: ['spent', user?.id, year, month],
    queryFn: () => fetchSpentByCategory(user!.id, year, month),
    enabled: !!user && isOpen,
  });

  // suppress unused-var lint — budgets/spent loaded for cache warmth
  void budgets; void spent;

  const normalize = (v: string) => v.toLowerCase().replace(/\s+/g, ' ').trim();

  const resolveCategoryId = (
    txType: 'income' | 'expense' | 'transfer',
    categoryId?: string,
    categoryName?: string,
  ): string | null => {
    if (txType === 'transfer') return null;
    const allowed = categories.filter(c => c.type === txType || c.type === 'both');
    if (categoryId && allowed.some(c => c.id === categoryId)) return categoryId;
    if (categoryName) {
      const src = normalize(categoryName);
      const match = allowed.find(c => { const cur = normalize(c.name_ru); return cur.includes(src) || src.includes(cur); });
      if (match) return match.id;
    }
    return allowed[0]?.id ?? null;
  };

  const invalidateAll = () => {
    ['transactions', 'transactions-all', 'transactions-year', 'transactions-month-structure', 'totals', 'spent', 'budgets']
      .forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
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

  // Stop recognition when panel closes or on unmount
  useEffect(() => {
    if (!isOpen) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, [isOpen]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  // Auto-focus input when opened
  useEffect(() => {
    if (!isOpen) return;
    setStatus({ kind: 'idle' });
    setInput('');
    setActiveChip(null);
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [isOpen]);

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR: new () => any = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) { alert('Голосовой ввод доступен только в Chrome / Edge.'); return; }
    const r = new SR();
    r.lang = 'ru-RU';
    r.interimResults = false;
    r.maxAlternatives = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => setInput(e.results[0][0].transcript);
    r.onerror = () => setIsListening(false);
    r.onend = () => setIsListening(false);
    recognitionRef.current = r;
    r.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const parseGoalFromText = (text: string) => {
    const lower = text.toLowerCase();
    const amountMatch = lower.match(/(\d[\d\s]*(?:млн|миллион\w*)?)\s*(?:тенге|тг|₸)?/);
    let target_amount: number | undefined;
    if (amountMatch) {
      const raw = amountMatch[1].replace(/\s/g, '');
      const num = parseFloat(raw);
      target_amount = /млн|миллион/i.test(amountMatch[0]) ? num * 1_000_000 : num;
    }
    const MONTHS: Record<string, string> = {
      январ: '01', феврал: '02', март: '03', апрел: '04', май: '05', мая: '05',
      июн: '06', июл: '07', август: '08', сентябр: '09', октябр: '10', ноябр: '11', декабр: '12',
    };
    let deadline: string | undefined;
    const dm = lower.match(/до\s+(\d{1,2})\s+(январ|феврал|март|апрел|май|мая|июн|июл|август|сентябр|октябр|ноябр|декабр)\w*/);
    if (dm) {
      deadline = `${new Date().getFullYear()}-${MONTHS[dm[2]] ?? '01'}-${String(dm[1]).padStart(2, '0')}`;
    }
    const keys = ['жильё','жилье','машин','авто','отпуск','путешеств','ноутбук','телефон','образован','свадьб','ремонт','пенси','бизнес'];
    const found = keys.find(k => lower.includes(k));
    const name = found ? found.charAt(0).toUpperCase() + found.slice(1).replace(/[аяеёиоуыэюь]+$/, '') : undefined;
    return { name, target_amount, deadline };
  };

  const executeCommand = async (text: string): Promise<void> => {
    setStatus({ kind: 'executing' });

    let intent;
    try {
      intent = await detectChatIntent(text, {
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
      if (intent.intent === 'show_commands_help') {
        navigate('/ai');
        onClose();
        return;
      }

      if (intent.intent === 'open_management') {
        navigate('/transactions');
        onClose();
        return;
      }

      if (intent.intent === 'delete_last_transaction') {
        const scope = intent.delete_transaction?.scope ?? 'last';
        const sorted = [...allTxns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const candidate = scope === 'last_expense' ? sorted.find(t => t.type === 'expense')
          : scope === 'last_income' ? sorted.find(t => t.type === 'income') : sorted[0];
        if (!candidate) { setStatus({ kind: 'error', msg: 'Транзакций для удаления не найдено.' }); return; }
        await deleteTransaction(candidate.id);
        if (!isMountedRef.current) return;
        invalidateAll();
        setStatus({ kind: 'success', msg: `Удалена транзакция: ${candidate.type === 'income' ? 'доход' : 'расход'} ${formatCurrency(candidate.amount)}${candidate.description ? ` "${candidate.description}"` : ''}.` });
        return;
      }

      if (intent.intent === 'update_budget_limit') {
        const b = intent.budget ?? {};
        const limitAmount = Number(b.limit_amount ?? NaN);
        if (!Number.isFinite(limitAmount) || limitAmount < 0) { setStatus({ kind: 'error', msg: 'Укажите сумму лимита. Пример: "поставь лимит 50000 на еду".' }); return; }
        const catId = resolveCategoryId('expense', b.category_id, b.category_name);
        const catName = catId ? categories.find(c => c.id === catId)?.name_ru ?? b.category_name ?? 'Категория' : b.category_name ?? 'Категория';
        if (!catId) { setStatus({ kind: 'error', msg: 'Не удалось определить категорию. Уточните название.' }); return; }
        const period = (b.period && ['month', 'week', 'year'].includes(b.period)) ? b.period as 'month' | 'week' | 'year' : 'month';
        await upsertBudget({ user_id: user!.id, category_id: catId, limit_amount: limitAmount, period, year: b.year ?? year, month: b.month ?? month, notify_at_pct: 80 });
        if (!isMountedRef.current) return;
        queryClient.invalidateQueries({ queryKey: ['budgets'] });
        queryClient.invalidateQueries({ queryKey: ['spent'] });
        setStatus({ kind: 'success', msg: `Лимит "${catName}": ${formatCurrency(limitAmount)}.` });
        return;
      }

      if (intent.intent === 'create_goal') {
        const g = intent.goal ?? {};
        let gName = g.name;
        let gTarget = Number(g.target_amount ?? NaN);
        let gDeadline = g.deadline;
        if (!gName || !Number.isFinite(gTarget) || gTarget <= 0) {
          const local = parseGoalFromText(text);
          gName = gName || local.name;
          if (!Number.isFinite(gTarget) || gTarget <= 0) gTarget = local.target_amount ?? NaN;
          gDeadline = gDeadline || local.deadline;
        }
        if (!gName || !Number.isFinite(gTarget) || gTarget <= 0) { setStatus({ kind: 'error', msg: 'Укажите название и сумму. Пример: "создай цель Машина на 3 миллиона".' }); return; }
        const deadline = gDeadline && /^\d{4}-\d{2}-\d{2}$/.test(gDeadline) ? gDeadline : null;
        await createGoal({ user_id: user!.id, name: gName, target_amount: gTarget, current_amount: Number(g.current_amount ?? 0) || 0, deadline, icon: g.icon ?? '🎯', color: g.color ?? '#1D9E75' });
        if (!isMountedRef.current) return;
        queryClient.invalidateQueries({ queryKey: ['goals'] });
        setStatus({ kind: 'success', msg: `Цель "${gName}" создана на ${formatCurrency(gTarget)}${deadline ? ` · до ${deadline}` : ''}.` });
        return;
      }

      if (intent.intent === 'create_transaction') {
        const tx = intent.transaction ?? {};
        const type = tx.type ?? 'expense';
        const amount = Number(tx.amount ?? NaN);
        if (!Number.isFinite(amount) || amount <= 0) { setStatus({ kind: 'error', msg: intent.reply ?? 'Укажите сумму. Пример: "добавь расход 4500 такси".' }); return; }
        const date = typeof tx.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tx.date) ? tx.date : new Date().toISOString().split('T')[0];
        const account: 'main' | 'kaspi' | 'cash' = tx.account && ['main', 'kaspi', 'cash'].includes(tx.account) ? tx.account : 'main';
        const categoryId = resolveCategoryId(type, tx.category_id, tx.category_name);
        const categoryName = categoryId ? categories.find(c => c.id === categoryId)?.name_ru ?? null : null;
        if (type !== 'transfer' && !categoryId) { setStatus({ kind: 'error', msg: 'Не удалось определить категорию. Уточните.' }); return; }
        await createTransaction({ user_id: user!.id, amount, type, category_id: type === 'transfer' ? null : categoryId, description: tx.description?.trim() || null, date, account, tags: null, ai_categorized: true });
        if (!isMountedRef.current) return;
        invalidateAll();
        const typeLabel = type === 'income' ? 'доход' : type === 'transfer' ? 'перевод' : 'расход';
        setStatus({ kind: 'success', msg: `Добавлен ${typeLabel} ${formatCurrency(amount)}${categoryName ? ` · ${categoryName}` : ''}.` });
        return;
      }
    } catch (err) {
      if (isMountedRef.current) setStatus({ kind: 'error', msg: err instanceof Error ? err.message : 'Произошла ошибка.' });
    }
  };

  // Auto-close 1.8s after success
  useEffect(() => {
    if (status.kind !== 'success') return;
    const t = setTimeout(() => { onClose(); setStatus({ kind: 'idle' }); setInput(''); }, 1800);
    return () => clearTimeout(t);
  }, [status, onClose]);

  const submit = () => {
    const trimmed = input.trim();
    if (!trimmed || status.kind === 'executing' || isExecutingRef.current) return;
    isExecutingRef.current = true;
    executeCommand(trimmed).finally(() => { isExecutingRef.current = false; });
  };

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
        {/* Chips */}
        <div className="flex flex-wrap gap-1.5">
          {CHIPS.map(chip => (
            <button
              key={chip.label}
              type="button"
              onClick={() => { setInput(chip.template); setActiveChip(chip.label); inputRef.current?.focus(); }}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                activeChip === chip.label
                  ? 'border-[#DA7B93]/60 bg-[#DA7B93]/15 text-[#DA7B93]'
                  : 'border-white/15 bg-white/6 text-white/70 hover:border-white/30 hover:text-white'
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Input row */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="или напишите команду..."
            disabled={status.kind === 'executing'}
            className="flex-1 rounded-xl border border-white/15 bg-white/8 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#DA7B93] disabled:opacity-60"
          />
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            disabled={status.kind === 'executing'}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-50',
              isListening ? 'bg-[#E24B4A] text-white animate-pulse' : 'border border-white/20 text-white/60 hover:bg-white/10'
            )}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!input.trim() || status.kind === 'executing'}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DA7B93] text-white transition-colors hover:bg-[#e68fa4] disabled:opacity-50"
          >
            {status.kind === 'executing' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>

        {/* Status */}
        {status.kind === 'executing' && (
          <p className="flex items-center gap-1.5 text-xs text-white/55">
            <Loader2 size={12} className="animate-spin" /> Выполняю...
          </p>
        )}
        {status.kind === 'success' && (
          <p className="flex items-center gap-1.5 text-xs text-[#5DCAA5]">
            <CheckCircle size={12} /> {status.msg}
          </p>
        )}
        {status.kind === 'error' && (
          <p className="flex items-center gap-1.5 text-xs text-[#E24B4A]">
            <AlertCircle size={12} /> {status.msg}
          </p>
        )}
      </div>
    </div>
  );
}
