import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/entities/user';
import { fetchTransactions, fetchMonthTotals } from '@/entities/transaction';
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

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['ai-chats', user?.id],
    queryFn: () => fetchChatHistory(user!.id),
    enabled: !!user,
  });

  const { data: totals } = useQuery({
    queryKey: ['totals', user?.id, year, month],
    queryFn: () => fetchMonthTotals(user!.id, year, month),
    enabled: !!user,
  });

  const { data: recentTxns = [] } = useQuery({
    queryKey: ['transactions', user?.id, {}, 0],
    queryFn: () => fetchTransactions(user!.id, {}, 0, 10),
    enabled: !!user,
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', user?.id, year, month],
    queryFn: () => fetchBudgets(user!.id, year, month),
    enabled: !!user,
  });

  const { data: spent = {} } = useQuery({
    queryKey: ['spent', user?.id, year, month],
    queryFn: () => fetchSpentByCategory(user!.id, year, month),
    enabled: !!user,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const mutation = useMutation({
    mutationFn: async (question: string) => {
      await saveChatMessage(user!.id, 'user', question);

      const context: BudgetContext = {
        period: { month, year },
        totals: {
          income:  totals?.income  ?? 0,
          expense: totals?.expense ?? 0,
          balance: (totals?.income ?? 0) - (totals?.expense ?? 0),
        },
        by_category: budgets.map(b => ({
          name:   b.categories?.name_ru ?? 'Категория',
          amount: spent[b.category_id] ?? 0,
          pct:    b.limit_amount > 0 ? Math.round(((spent[b.category_id] ?? 0) / b.limit_amount) * 100) : 0,
        })),
        top_transactions: recentTxns.slice(0, 5).map(t => ({
          description: t.description ?? t.categories?.name_ru ?? '—',
          amount: t.amount,
          type: t.type,
        })),
        budget_limits: budgets.map(b => ({
          category: b.categories?.name_ru ?? 'Категория',
          limit:    b.limit_amount,
          spent:    spent[b.category_id] ?? 0,
          pct:      b.limit_amount > 0 ? Math.round(((spent[b.category_id] ?? 0) / b.limit_amount) * 100) : 0,
        })),
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
    if (!text.trim() || mutation.isPending) return;
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
          <h2 className="font-semibold text-white">AI Финансовый советник</h2>
          <p className="text-xs text-white/55">Powered by Gemini 2.0 Flash</p>
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
            <h3 className="font-semibold text-white mb-2">Привет! Я ваш AI советник</h3>
            <p className="text-sm text-white/55 mb-6">
              Задайте любой вопрос о ваших финансах — я анализирую ваши данные и даю конкретные советы
            </p>
            <div className="flex flex-col gap-2 w-full">
              {QUICK_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-left text-sm px-4 py-2.5 rounded-xl border border-white/15 hover:border-[#DA7B93]/50 hover:bg-[#DA7B93]/12 transition-colors text-white/75"
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
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
            placeholder="Задайте вопрос о ваших финансах..."
            disabled={mutation.isPending}
            className="flex-1 rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#5DCAA5] disabled:opacity-60"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || mutation.isPending}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#5DCAA5] text-[#0d1b26] transition-colors hover:bg-[#71d9b6] disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
