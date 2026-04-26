import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Bot, User, Sparkles, Mic, MicOff, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/entities/user';
import { createTransaction, fetchAllTransactions, deleteTransaction } from '@/entities/transaction';
import { fetchCategories } from '@/entities/category';
import { fetchBudgets, fetchSpentByCategory, upsertBudget } from '@/entities/budget';
import { createGoal } from '@/entities/goal';
import { askAI, detectChatIntent, type ChatCommandIntent } from '@/shared/api/gemini';
import { supabase } from '@/shared/api/supabase';
import type { BudgetContext } from '@/shared/types/budget-context';
import { cn } from '@/shared/lib/cn';
import { formatCurrency } from '@/shared/lib/formatCurrency';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const QUICK_QUESTIONS = [
  'Как я трачу деньги в этом месяце?',
  'Где я могу сократить расходы?',
  'Достигну ли я своих целей?',
  'Оцени мой финансовый план',
];

const COMMANDS_HELP = `Вот что я умею:\n\n💸 Транзакции:\n• "добавь расход 4500 такси"\n• "добавь доход 200000 зарплата"\n• "удали последний расход"\n\n📊 Бюджет:\n• "поставь лимит 50000 на еду"\n• "измени лимит развлечений на 30000"\n\n🎯 Цели:\n• "создай цель Машина на 3 миллиона до 2027-01-01"\n• "добавь цель Отпуск 500000"\n\n🗂️ Управление:\n• "открой управление транзакциями"\n\n❓ Советы:\n• "как я трачу деньги?"\n• "где сократить расходы?"`;

async function fetchChatHistory(userId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('ai_chats')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as ChatMessage[];
}

async function saveChatMessage(userId: string, role: 'user' | 'assistant', content: string) {
  await supabase.from('ai_chats').insert({ user_id: userId, role, content });
}

export function AIChat() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthFrom = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthTo = new Date(year, month, 0).toISOString().split('T')[0];

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['ai-chats', user?.id],
    queryFn: () => fetchChatHistory(user!.id),
    enabled: !!user,
  });

  const { data: allTxns = [], isLoading: allTxnsLoading } = useQuery({
    queryKey: ['transactions-all', user?.id],
    queryFn: () => fetchAllTransactions(user!.id),
    enabled: !!user,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: ['budgets', user?.id, year, month],
    queryFn: () => fetchBudgets(user!.id, year, month),
    enabled: !!user,
  });

  const { data: spent = {}, isLoading: spentLoading } = useQuery({
    queryKey: ['spent', user?.id, year, month],
    queryFn: () => fetchSpentByCategory(user!.id, year, month),
    enabled: !!user,
  });

  const monthTxns = useMemo(
    () => allTxns.filter((t) => t.date >= monthFrom && t.date <= monthTo),
    [allTxns, monthFrom, monthTo],
  );

  const monthTotals = useMemo(
    () => monthTxns.reduce(
      (acc, t) => {
        if (t.type === 'income') acc.income += t.amount;
        if (t.type === 'expense') acc.expense += t.amount;
        return acc;
      },
      { income: 0, expense: 0 },
    ),
    [monthTxns],
  );

  const allTimeTotals = useMemo(
    () => allTxns.reduce(
      (acc, t) => {
        if (t.type === 'income') acc.income += t.amount;
        if (t.type === 'expense') acc.expense += t.amount;
        return acc;
      },
      { income: 0, expense: 0 },
    ),
    [allTxns],
  );

  const monthByCategory = useMemo(() => {
    const map = new Map<string, { name: string; amount: number }>();
    const monthExpenseTotal = monthTxns
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    for (const transaction of monthTxns) {
      if (transaction.type !== 'expense') continue;
      const key = transaction.category_id ?? 'uncategorized';
      const name = transaction.categories?.name_ru ?? 'Без категории';
      const existing = map.get(key);
      if (existing) {
        existing.amount += transaction.amount;
      } else {
        map.set(key, { name, amount: transaction.amount });
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .map((item) => ({
        name: item.name,
        amount: item.amount,
        pct: monthExpenseTotal > 0 ? Math.round((item.amount / monthExpenseTotal) * 100) : 0,
      }));
  }, [monthTxns]);

  const topTransactions = useMemo(
    () => allTxns.slice(0, 10).map((t) => ({
      description: t.description ?? t.categories?.name_ru ?? '—',
      amount: t.amount,
      type: t.type,
    })),
    [allTxns],
  );

  const isFinancialDataLoading = allTxnsLoading || budgetsLoading || spentLoading;
  const isDataLoading = isFinancialDataLoading || categoriesLoading;
  const isBusy = isExecuting || isDataLoading;

  const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

  const resolveCategoryId = (
    txType: 'income' | 'expense' | 'transfer',
    categoryId?: string,
    categoryName?: string,
  ): string | null => {
    if (txType === 'transfer') return null;
    const allowed = categories.filter(c => c.type === txType || c.type === 'both');
    if (categoryId && allowed.some(c => c.id === categoryId)) return categoryId;
    if (categoryName) {
      const source = normalize(categoryName);
      const matched = allowed.find(c => {
        const current = normalize(c.name_ru);
        return current.includes(source) || source.includes(current);
      });
      if (matched) return matched.id;
    }
    return allowed[0]?.id ?? null;
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['transactions-all'] });
    queryClient.invalidateQueries({ queryKey: ['transactions-year'] });
    queryClient.invalidateQueries({ queryKey: ['transactions-month-structure'] });
    queryClient.invalidateQueries({ queryKey: ['totals'] });
    queryClient.invalidateQueries({ queryKey: ['spent'] });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const invalidateChat = () => queryClient.invalidateQueries({ queryKey: ['ai-chats'] });

  const saveMsg = async (role: 'user' | 'assistant', content: string) => {
    if (!user) return;
    await saveChatMessage(user.id, role, content);
    invalidateChat();
  };

  // Voice input
  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR: new () => any = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      alert('Ваш браузер не поддерживает голосовой ввод. Используйте Chrome или Edge.');
      return;
    }
    const recognition = new SR();
    recognition.lang = 'ru-RU';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput(text);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const mutation = useMutation({
    mutationFn: async (question: string) => {
      await saveChatMessage(user!.id, 'user', question);
      const context: BudgetContext = {
        period: { month, year },
        totals: {
          income:  monthTotals.income,
          expense: monthTotals.expense,
          balance: monthTotals.income - monthTotals.expense,
        },
        by_category: monthByCategory,
        top_transactions: topTransactions,
        budget_limits: budgets.map(b => ({
          category: b.categories?.name_ru ?? 'Категория',
          limit:    b.limit_amount,
          spent:    spent[b.category_id] ?? 0,
          pct:      b.limit_amount > 0 ? Math.round(((spent[b.category_id] ?? 0) / b.limit_amount) * 100) : 0,
        })),
        all_time: {
          income: allTimeTotals.income,
          expense: allTimeTotals.expense,
          balance: allTimeTotals.income - allTimeTotals.expense,
          transactions_count: allTxns.length,
        },
        month_transactions_count: monthTxns.length,
      };
      const answer = await askAI(question, context);
      await saveChatMessage(user!.id, 'assistant', answer);
      return answer;
    },
    onSuccess: () => { invalidateChat(); setInput(''); },
  });

  // Local regex fallback parsers — used when Gemini extracts intent but no structured data
  const parseGoalFromText = (text: string): { name?: string; target_amount?: number; deadline?: string } => {
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
      июн: '06', июл: '07', август: '08', сентябр: '09', октябр: '10',
      ноябр: '11', декабр: '12',
    };
    let deadline: string | undefined;
    const deadlineMatch = lower.match(/до\s+(\d{1,2})\s+(январ|феврал|март|апрел|май|мая|июн|июл|август|сентябр|октябр|ноябр|декабр)\w*/);
    if (deadlineMatch) {
      const day = String(deadlineMatch[1]).padStart(2, '0');
      const mon = MONTHS[deadlineMatch[2]] ?? '01';
      deadline = `${new Date().getFullYear()}-${mon}-${day}`;
    }

    const goalKeywords = ['жильё', 'жилье', 'машин', 'авто', 'отпуск', 'путешеств', 'ноутбук', 'телефон', 'образован', 'свадьб', 'ремонт', 'пенси', 'бизнес'];
    const found = goalKeywords.find(k => lower.includes(k));
    const name = found
      ? found.charAt(0).toUpperCase() + found.slice(1).replace(/[аяеёиоуыэюь]+$/, '')
      : undefined;

    return { name, target_amount, deadline };
  };

  const executeCommand = async (_text: string, intent: ChatCommandIntent): Promise<void> => {
    if (intent.intent === 'show_commands_help') {
      await saveMsg('assistant', COMMANDS_HELP);
      return;
    }

    if (intent.intent === 'open_management') {
      await saveMsg('assistant', 'Открываю раздел управления транзакциями.');
      navigate('/transactions');
      return;
    }

    if (intent.intent === 'delete_last_transaction') {
      const scope = intent.delete_transaction?.scope ?? 'last';
      const candidate = scope === 'last_expense'
        ? allTxns.find(t => t.type === 'expense')
        : scope === 'last_income'
          ? allTxns.find(t => t.type === 'income')
          : allTxns[0];

      if (!candidate) {
        await saveMsg('assistant', 'Не нашёл транзакций для удаления.');
        return;
      }

      await deleteTransaction(candidate.id);
      invalidateAll();

      const label = [
        candidate.type === 'income' ? 'доход' : 'расход',
        formatCurrency(candidate.amount),
        candidate.description ? `"${candidate.description}"` : null,
        candidate.date,
      ].filter(Boolean).join(' · ');
      await saveMsg('assistant', `Готово, удалена транзакция: ${label}.`);
      return;
    }

    if (intent.intent === 'update_budget_limit') {
      const b = intent.budget ?? {};
      const limitAmount = Number(b.limit_amount ?? NaN);

      if (!Number.isFinite(limitAmount) || limitAmount < 0) {
        await saveMsg('assistant', intent.reply ?? 'Укажите сумму лимита. Пример: "поставь лимит 50000 на еду".');
        return;
      }

      const catId = resolveCategoryId('expense', b.category_id, b.category_name);
      const catName = catId
        ? categories.find(c => c.id === catId)?.name_ru ?? b.category_name ?? 'Категория'
        : b.category_name ?? 'Категория';

      if (!catId) {
        await saveMsg('assistant', intent.reply ?? 'Не удалось определить категорию. Назовите её точнее.');
        return;
      }

      const period = (b.period && ['month', 'week', 'year'].includes(b.period)) ? b.period as 'month' | 'week' | 'year' : 'month';
      await upsertBudget({
        user_id: user!.id,
        category_id: catId,
        limit_amount: limitAmount,
        period,
        year: b.year ?? year,
        month: b.month ?? month,
        notify_at_pct: 80,
      });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['spent'] });
      await saveMsg('assistant', `Готово, лимит для "${catName}" установлен: ${formatCurrency(limitAmount)}.`);
      return;
    }

    if (intent.intent === 'create_goal') {
      const g = intent.goal ?? {};
      let gName = g.name;
      let gTargetAmount = Number(g.target_amount ?? NaN);
      let gDeadline = g.deadline;

      // Fallback: if Gemini returned intent but no data, parse locally
      if (!gName || !Number.isFinite(gTargetAmount) || gTargetAmount <= 0) {
        const local = parseGoalFromText(_text);
        gName = gName || local.name;
        if (!Number.isFinite(gTargetAmount) || gTargetAmount <= 0) gTargetAmount = local.target_amount ?? NaN;
        gDeadline = gDeadline || local.deadline;
      }

      const targetAmount = gTargetAmount;
      if (!gName || !Number.isFinite(targetAmount) || targetAmount <= 0) {
        await saveMsg('assistant', intent.reply ?? 'Укажите название и сумму цели. Пример: "создай цель Машина на 3 миллиона".');
        return;
      }

      const resolvedDeadline = gDeadline && /^\d{4}-\d{2}-\d{2}$/.test(gDeadline) ? gDeadline : null;
      await createGoal({
        user_id: user!.id,
        name: gName,
        target_amount: targetAmount,
        current_amount: Number(g.current_amount ?? 0) || 0,
        deadline: resolvedDeadline,
        icon: g.icon ?? '🎯',
        color: g.color ?? '#1D9E75',
      });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      await saveMsg('assistant', `Готово, цель "${gName}" создана на ${formatCurrency(targetAmount)}${resolvedDeadline ? ` · дедлайн ${resolvedDeadline}` : ''}.`);
      return;
    }

    if (intent.intent === 'create_transaction') {
      const tx = intent.transaction ?? {};
      const type = tx.type ?? 'expense';
      const amount = Number(tx.amount ?? NaN);

      if (!Number.isFinite(amount) || amount <= 0) {
        await saveMsg('assistant', intent.reply ?? 'Укажите сумму. Пример: "добавь расход 4500 такси".');
        return;
      }

      const date = typeof tx.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tx.date)
        ? tx.date : new Date().toISOString().split('T')[0];
      const account: 'main' | 'kaspi' | 'cash' = tx.account && ['main', 'kaspi', 'cash'].includes(tx.account)
        ? tx.account : 'main';
      const categoryId = resolveCategoryId(type, tx.category_id, tx.category_name);
      const categoryName = categoryId ? categories.find(c => c.id === categoryId)?.name_ru ?? null : null;

      if (type !== 'transfer' && !categoryId) {
        await saveMsg('assistant', 'Не смог определить категорию. Назовите её прямо в команде.');
        return;
      }

      await createTransaction({
        user_id: user!.id,
        amount,
        type,
        category_id: type === 'transfer' ? null : categoryId,
        description: tx.description?.trim() || null,
        date,
        account,
        tags: null,
        ai_categorized: true,
      });
      invalidateAll();

      const typeLabel = type === 'income' ? 'доход' : type === 'transfer' ? 'перевод' : 'расход';
      const details = [
        `${typeLabel} ${formatCurrency(amount)}`,
        categoryName ? `категория: ${categoryName}` : null,
        tx.description ? `комментарий: "${tx.description}"` : null,
      ].filter(Boolean).join(', ');
      await saveMsg('assistant', `Готово, добавил ${details}.`);
    }
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || mutation.isPending || isBusy) return;

    setInput('');

    const intent = await (async () => {
      try {
        return await detectChatIntent(trimmed, {
          categories: categories.map(c => ({ id: c.id, name_ru: c.name_ru, type: c.type })),
        });
      } catch {
        return { intent: 'none' as const };
      }
    })();

    if (intent.intent !== 'none') {
      await saveMsg('user', trimmed);
      setIsExecuting(true);
      try {
        await executeCommand(trimmed, intent);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Произошла ошибка при выполнении команды.';
        await saveMsg('assistant', `Ошибка: ${msg}`);
      } finally {
        setIsExecuting(false);
      }
    } else {
      mutation.mutate(trimmed);
    }
  };

  const isPending = mutation.isPending || isExecuting;

  return (
    <div className="mx-auto flex h-[calc(100dvh-8.5rem)] min-h-[26rem] w-full max-w-2xl flex-col sm:h-[calc(100dvh-10rem)]">
      {/* Header */}
      <div className="mb-3 flex items-center gap-3 px-1 sm:mb-4">
        <div className="w-10 h-10 rounded-2xl bg-[#DA7B93]/15 flex items-center justify-center">
          <Bot size={20} className="text-[#DA7B93]" />
        </div>
        <div>
          <h2 className="font-semibold text-white">BonssAi советник</h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-2">
        {historyLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-[#DA7B93] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Sparkles size={40} className="text-[#DA7B93] mb-4" />
            <h3 className="font-semibold text-white mb-2">Привет! Я ваш BonssAi советник</h3>
            <p className="text-sm text-white/55 mb-6">
              Задайте любой вопрос о ваших финансах — я анализирую ваши данные и даю конкретные советы
            </p>
            <div className="flex flex-col gap-2 w-full">
              {QUICK_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={isBusy || isPending}
                  className="text-left text-sm px-4 py-2.5 rounded-xl border border-white/15 hover:border-[#DA7B93]/50 hover:bg-[#DA7B93]/12 transition-colors text-white/75 disabled:opacity-50 disabled:hover:border-white/15 disabled:hover:bg-transparent"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {history.map(msg => (
              <div
                key={msg.id}
                className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : '')}
              >
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                  msg.role === 'user' ? 'bg-[#2F4454]' : 'bg-[#DA7B93]/15'
                )}>
                  {msg.role === 'user'
                    ? <User size={14} className="text-white" />
                    : <Bot size={14} className="text-[#DA7B93]" />
                  }
                </div>
                <div className={cn(
                  'max-w-[88%] rounded-2xl px-3.5 py-3 text-sm leading-relaxed sm:max-w-[80%] sm:px-4 whitespace-pre-line',
                  msg.role === 'user'
                    ? 'bg-[#2F4454] text-white rounded-tr-sm'
                    : 'bg-white/8 border border-white/12 text-white/85 rounded-tl-sm backdrop-blur-xl'
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isPending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#DA7B93]/15 flex items-center justify-center">
                  <Bot size={14} className="text-[#DA7B93]" />
                </div>
                <div className="bg-white/8 border border-white/12 rounded-2xl rounded-tl-sm px-4 py-3 backdrop-blur-xl">
                  {isExecuting ? (
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <Loader2 size={14} className="animate-spin text-[#5DCAA5]" />
                      Выполняю...
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 bg-[#DA7B93] rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-white/10">
        {isDataLoading && (
          <p className="mb-2 text-xs text-white/55">Загружаю данные для точного анализа...</p>
        )}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
            placeholder="Спросите про финансы или: добавь расход 4500 такси"
            disabled={isPending || isDataLoading}
            className="flex-1 rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#5DCAA5] disabled:opacity-60"
          />
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            disabled={isPending || isDataLoading}
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-50 sm:h-12 sm:w-12',
              isListening
                ? 'bg-[#E24B4A] text-white animate-pulse'
                : 'border border-white/20 text-white/60 hover:bg-white/10'
            )}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || isPending || isDataLoading}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#5DCAA5] text-[#0d1b26] transition-colors hover:bg-[#71d9b6] disabled:opacity-50 sm:h-12 sm:w-12"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
