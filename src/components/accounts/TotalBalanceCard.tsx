import { Wallet } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/formatCurrency';

interface TotalBalanceCardProps {
  total: number;
  accountCount: number;
}

export function TotalBalanceCard({ total, accountCount }: TotalBalanceCardProps) {
  return (
    <div className="rounded-2xl p-6 bg-gradient-to-br from-[#376E6F] to-[#1C3334] border border-[#376E6F]/30 relative overflow-hidden">
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/5" />

      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-xl bg-white/10">
          <Wallet size={18} className="text-white" />
        </div>
        <span className="text-white/70 text-sm font-medium">Общий баланс</span>
      </div>

      <p className="text-4xl font-bold text-white tracking-tight">
        {formatCurrency(total)}
      </p>
      <p className="text-white/50 text-sm mt-1">{accountCount} счёт{accountCount === 1 ? '' : accountCount < 5 ? 'а' : 'ов'}</p>
    </div>
  );
}
