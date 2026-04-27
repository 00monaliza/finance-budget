import { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { useInvestments, usePortfolioStats, useAddInvestment, useDeleteInvestment } from '@/entities/investment';
import { useProfile } from '@/entities/profile';
import { useAuthStore } from '@/entities/user';
import { InvestmentCard } from '@/components/investments/InvestmentCard';
import { AddInvestmentModal } from '@/components/investments/AddInvestmentModal';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { cn } from '@/shared/lib/cn';
import { callGeminiInsight } from '@/shared/api/geminiInsight';
import { env } from '@/shared/config/env';

const TYPE_LABELS: Record<string, string> = {
  deposit: 'Депозиты', stocks: 'Акции', crypto: 'Крипто',
  real_estate: 'Недвижимость', bonds: 'Облигации', other: 'Другое',
};

export default function InvestmentsPage() {
  const { data: investments = [], isLoading } = useInvestments();
  const { user } = useAuthStore();
  const { data: profile } = useProfile(user?.id);
  const stats = usePortfolioStats(investments);
  const addInvestment = useAddInvestment();
  const deleteInvestment = useDeleteInvestment();

  const [showAdd, setShowAdd] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const runAnalysis = async () => {
    if (!investments.length) return;
    setAiLoading(true);
    try {
      const byTypeDesc = Object.entries(stats.byType)
        .map(([t, v]) => `${TYPE_LABELS[t] ?? t}: ${formatCurrency(v)}`)
        .join(', ');

      const prompt = `
Пользователь имеет следующий инвестиционный портфель:
${byTypeDesc}
Вложено всего: ${formatCurrency(stats.totalInvested)}
Текущая стоимость: ${formatCurrency(stats.totalCurrent)}
Финансовая цель: ${profile?.financial_goal ?? 'не указана'}

Дай образовательный анализ (3-4 предложения на русском):
1. Насколько диверсифицирован портфель?
2. Какой примерный риск-профиль?
3. Что можно рассмотреть для балансировки?

Напомни: это НЕ финансовый совет, а информация для самостоятельных решений.
      `.trim();

      const res = await callGeminiInsight({
        income: profile?.monthly_income ?? 0,
        expenses: 0,
        creditsMonthly: 0,
        freeAmount: 0,
        goal: profile?.financial_goal ?? null,
      });
      void res;

      // Direct call for portfolio analysis
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 500, temperature: 0.4 },
          }),
        }
      );
      const data = await response.json();
      setAiAnalysis(data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? 'Не удалось получить анализ.');
    } finally {
      setAiLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#376E6F] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Инвестиции</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#DA7B93] text-white rounded-xl text-sm font-medium hover:bg-[#c96a82] transition-colors"
        >
          <Plus size={16} /> Добавить
        </button>
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-white/40 bg-white/5 rounded-xl px-4 py-2.5 border border-white/10">
        ℹ️ Информация носит образовательный характер и не является финансовым советом
      </div>

      {/* Portfolio Summary */}
      {investments.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#2F4454] rounded-2xl p-4 border border-white/10">
            <p className="text-white/50 text-xs">Вложено</p>
            <p className="text-lg font-bold text-white mt-1">{formatCurrency(stats.totalInvested)}</p>
          </div>
          <div className="bg-[#2F4454] rounded-2xl p-4 border border-white/10">
            <p className="text-white/50 text-xs">Текущая стоимость</p>
            <p className="text-lg font-bold text-white mt-1">{formatCurrency(stats.totalCurrent)}</p>
          </div>
          <div className="bg-[#2F4454] rounded-2xl p-4 border border-white/10">
            <p className="text-white/50 text-xs">Доходность</p>
            <p className={cn('text-lg font-bold mt-1', stats.returnPct >= 0 ? 'text-[#376E6F]' : 'text-[#DA7B93]')}>
              {stats.returnPct >= 0 ? '+' : ''}{stats.returnPct.toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* Distribution */}
      {Object.keys(stats.byType).length > 1 && (
        <div className="bg-[#2F4454] rounded-2xl p-5 border border-white/10">
          <p className="text-xs text-white/50 mb-3 uppercase tracking-wide">Распределение</p>
          <div className="space-y-2">
            {Object.entries(stats.byType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, amount]) => {
                const pct = stats.totalInvested > 0 ? (amount / stats.totalInvested) * 100 : 0;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/70">{TYPE_LABELS[type] ?? type}</span>
                      <span className="text-white">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-[#1C3334] rounded-full">
                      <div className="h-full bg-[#376E6F] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {investments.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          <p className="text-4xl mb-3">📈</p>
          <p>Нет инвестиций</p>
          <p className="text-sm mt-1">Добавьте первую инвестицию для отслеживания</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {investments.map(inv => (
            <InvestmentCard
              key={inv.id}
              investment={inv}
              onDelete={(id) => deleteInvestment.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* AI Analysis */}
      {investments.length > 0 && (
        <div className="rounded-2xl border border-[#DA7B93]/30 bg-[#DA7B93]/8 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#DA7B93]" />
              <span className="text-sm font-medium text-white/80">ИИ-анализ портфеля</span>
            </div>
            <button
              onClick={runAnalysis}
              disabled={aiLoading}
              className="px-3 py-1.5 bg-[#DA7B93] text-white text-xs rounded-lg font-medium hover:bg-[#c96a82] transition-colors disabled:opacity-50"
            >
              {aiLoading ? 'Анализирую...' : 'Анализировать'}
            </button>
          </div>
          {aiLoading ? (
            <div className="space-y-2">
              <div className="h-3 bg-white/10 rounded animate-pulse w-full" />
              <div className="h-3 bg-white/10 rounded animate-pulse w-4/5" />
              <div className="h-3 bg-white/10 rounded animate-pulse w-2/3" />
            </div>
          ) : aiAnalysis ? (
            <p className="text-sm text-white/80 leading-relaxed">{aiAnalysis}</p>
          ) : (
            <p className="text-sm text-white/40">Нажмите "Анализировать" для получения образовательного анализа</p>
          )}
        </div>
      )}

      {showAdd && (
        <AddInvestmentModal
          onClose={() => setShowAdd(false)}
          onSave={(inv) => addInvestment.mutate(inv)}
        />
      )}
    </div>
  );
}
