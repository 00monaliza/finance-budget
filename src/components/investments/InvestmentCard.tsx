import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { cn } from '@/shared/lib/cn';
import type { Investment } from '@/entities/investment';

const TYPE_LABELS: Record<string, string> = {
  deposit: '🏦 Депозит',
  stocks: '📈 Акции',
  crypto: '₿ Крипто',
  real_estate: '🏠 Недвижимость',
  bonds: '📄 Облигации',
  other: '💼 Другое',
};

interface InvestmentCardProps {
  investment: Investment;
  onDelete: (id: string) => void;
}

export function InvestmentCard({ investment: inv, onDelete }: InvestmentCardProps) {
  const current = inv.current_value ?? inv.invested_amount;
  const returnAmt = current - inv.invested_amount;
  const returnPct = inv.invested_amount > 0
    ? ((returnAmt / inv.invested_amount) * 100).toFixed(1)
    : '0.0';
  const isPositive = returnAmt >= 0;

  return (
    <div className="bg-[#2F4454] rounded-2xl p-5 border border-white/10 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-white">{inv.name}</p>
          <p className="text-xs text-white/50 mt-0.5">{TYPE_LABELS[inv.type] ?? inv.type}</p>
        </div>
        <button
          onClick={() => onDelete(inv.id)}
          className="p-1.5 text-white/30 hover:text-[#DA7B93] hover:bg-white/10 rounded-lg transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1C3334] rounded-xl p-3">
          <p className="text-white/50 text-xs">Вложено</p>
          <p className="text-white font-semibold mt-0.5 text-sm">{formatCurrency(inv.invested_amount)}</p>
        </div>
        <div className="bg-[#1C3334] rounded-xl p-3">
          <p className="text-white/50 text-xs">Текущая стоимость</p>
          <p className="text-white font-semibold mt-0.5 text-sm">{formatCurrency(current)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className={cn('flex items-center gap-1.5 text-sm font-semibold', isPositive ? 'text-[#376E6F]' : 'text-[#DA7B93]')}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{isPositive ? '+' : ''}{formatCurrency(returnAmt)} ({returnPct}%)</span>
        </div>
        {inv.annual_return_rate != null && (
          <span className="text-xs text-white/40">{inv.annual_return_rate}% год.</span>
        )}
      </div>

      {inv.start_date && (
        <p className="text-xs text-white/40">
          С {new Date(inv.start_date).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
        </p>
      )}
    </div>
  );
}
