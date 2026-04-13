import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/entities/user';
import { fetchAllTransactions } from '@/entities/transaction';
import { fetchBudgets, fetchSpentByCategory } from '@/entities/budget';
import { askAI } from '@/shared/api/gemini';
import { supabase } from '@/shared/api/supabase';
import type { BudgetContext } from '@/shared/types/budget-context';
import { cn } from '@/shared/lib/cn';

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
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-chats'] });
      setInput('');
    },
  });

  const send = (text: string) => {
    if (!text.trim() || mutation.isPending || isFinancialDataLoading) return;
    mutation.mutate(text.trim());
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <div className="w-10 h-10 rounded-2xl bg-[#DA7B93]/15 flex items-center justify-center">
          <Bot size={20} className="text-[#DA7B93]" />
        </div>
        <div>
          <h2 className="font-semibold text-white">BonssAi советник</h2>
          {/* <p className="text-xs text-white/55">Powered by Gemini</p> */}
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
                  disabled={isFinancialDataLoading || mutation.isPending}
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
                  'max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-[#2F4454] text-white rounded-tr-sm'
                    : 'bg-white/8 border border-white/12 text-white/85 rounded-tl-sm backdrop-blur-xl'
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            {mutation.isPending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#DA7B93]/15 flex items-center justify-center">
                  <Bot size={14} className="text-[#DA7B93]" />
                </div>
                <div className="bg-white/8 border border-white/12 rounded-2xl rounded-tl-sm px-4 py-3 backdrop-blur-xl">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 bg-[#DA7B93] rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-white/10">
        {isFinancialDataLoading && (
          <p className="mb-2 text-xs text-white/55">Загружаю все ваши транзакции для точного анализа...</p>
        )}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
            placeholder="Задайте вопрос о ваших финансах..."
            disabled={mutation.isPending || isFinancialDataLoading}
            className="flex-1 rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#5DCAA5] disabled:opacity-60"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || mutation.isPending || isFinancialDataLoading}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#5DCAA5] text-[#0d1b26] transition-colors hover:bg-[#71d9b6] disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
