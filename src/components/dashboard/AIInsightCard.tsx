import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { callGeminiInsight } from '@/shared/api/geminiInsight';

interface AIInsightCardProps {
  income: number;
  expenses: number;
  creditsMonthly: number;
  freeAmount: number;
  goal: string | null;
}

export function AIInsightCard({ income, expenses, creditsMonthly, freeAmount, goal }: AIInsightCardProps) {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!income) return;
    setLoading(true);
    try {
      const text = await callGeminiInsight({ income, expenses, creditsMonthly, freeAmount, goal });
      setInsight(text);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (income) load();
  }, []);

  if (!income) return null;

  return (
    <div className="rounded-2xl border border-[#DA7B93]/30 bg-[#DA7B93]/8 backdrop-blur-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#DA7B93]/20">
            <Sparkles size={14} className="text-[#DA7B93]" />
          </div>
          <span className="text-sm font-medium text-white/80">Совет Bonssai</span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-1.5 rounded-lg text-white/40 hover:text-[#DA7B93] hover:bg-white/10 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-3.5 bg-white/10 rounded animate-pulse w-full" />
          <div className="h-3.5 bg-white/10 rounded animate-pulse w-4/5" />
          <div className="h-3.5 bg-white/10 rounded animate-pulse w-2/3" />
        </div>
      ) : insight ? (
        <p className="text-sm text-white/80 leading-relaxed">{insight}</p>
      ) : (
        <p className="text-sm text-white/40">Нажмите обновить для получения совета</p>
      )}
    </div>
  );
}
