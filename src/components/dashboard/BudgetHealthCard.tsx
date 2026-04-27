import { cn } from '@/shared/lib/cn';

type HealthStatus = 'excellent' | 'good' | 'warning' | 'critical';

function getBudgetHealth(income: number, expenses: number, credits: number): {
  status: HealthStatus;
  label: string;
  color: string;
  pct: number;
} {
  if (!income) return { status: 'good', label: 'Нет данных', color: '#5B8FA8', pct: 0 };
  const total = expenses + credits;
  const ratio = total / income;

  if (ratio < 0.5) return { status: 'excellent', label: 'Отлично', color: '#376E6F', pct: ratio * 100 };
  if (ratio < 0.7) return { status: 'good', label: 'Хорошо', color: '#5B8FA8', pct: ratio * 100 };
  if (ratio < 0.85) return { status: 'warning', label: 'Внимание', color: '#E8A87C', pct: ratio * 100 };
  return { status: 'critical', label: 'Критично', color: '#DA7B93', pct: Math.min(ratio * 100, 100) };
}

const EMOJI: Record<HealthStatus, string> = {
  excellent: '✅', good: '👍', warning: '⚠️', critical: '🚨',
};

interface BudgetHealthCardProps {
  income: number;
  expenses: number;
  creditsMonthly: number;
}

export function BudgetHealthCard({ income, expenses, creditsMonthly }: BudgetHealthCardProps) {
  const { status, label, color, pct } = getBudgetHealth(income, expenses, creditsMonthly);

  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] backdrop-blur-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white/70 uppercase tracking-[0.1em]">Здоровье бюджета</h3>
        <span className="text-sm font-semibold" style={{ color }}>
          {EMOJI[status]} {label}
        </span>
      </div>

      <div className="h-2.5 bg-[#1C3334] rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 text-center text-xs">
        <div className={cn('rounded-xl p-2', pct < 50 ? 'bg-[#376E6F]/20' : 'bg-white/5')}>
          <p className="text-white/50">Доход</p>
          <p className="text-white font-medium mt-0.5">{income ? Math.round(income / 1000) + 'k' : '—'}</p>
        </div>
        <div className="rounded-xl p-2 bg-white/5">
          <p className="text-white/50">Расходы</p>
          <p className="text-white font-medium mt-0.5">{expenses ? Math.round(expenses / 1000) + 'k' : '—'}</p>
        </div>
        <div className={cn('rounded-xl p-2', status === 'excellent' || status === 'good' ? 'bg-[#376E6F]/20' : 'bg-[#DA7B93]/10')}>
          <p className="text-white/50">Свободно</p>
          <p className="font-medium mt-0.5" style={{ color }}>
            {income ? Math.round((income - expenses - creditsMonthly) / 1000) + 'k' : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
