import { CheckCircle, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { cn } from '@/shared/lib/cn';
import type { Debt } from '@/entities/debt';

interface DebtCardProps {
  debt: Debt;
  onSettle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DebtCard({ debt, onSettle, onDelete }: DebtCardProps) {
  const isOverdue = debt.due_date && new Date(debt.due_date) < new Date();

  return (
    <div className={cn(
      'bg-[#2F4454] rounded-2xl p-5 border transition-colors',
      isOverdue ? 'border-[#DA7B93]/50' : 'border-white/10'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-white">{debt.person_name}</p>
          {debt.description && (
            <p className="text-xs text-white/50 mt-0.5">{debt.description}</p>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onSettle(debt.id)}
            className="p-1.5 text-[#376E6F] hover:text-white hover:bg-[#376E6F]/20 rounded-lg transition-colors"
            title="Закрыть долг"
          >
            <CheckCircle size={16} />
          </button>
          <button
            onClick={() => onDelete(debt.id)}
            className="p-1.5 text-white/30 hover:text-[#DA7B93] hover:bg-white/10 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <p className="text-2xl font-bold text-white">{formatCurrency(debt.amount)}</p>

      {debt.due_date && (
        <p className={cn('text-xs mt-2', isOverdue ? 'text-[#DA7B93]' : 'text-white/50')}>
          {isOverdue ? '⚠️ Просрочен · ' : '📅 '}
          {new Date(debt.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}
    </div>
  );
}
