import { useState } from 'react';
import { Trash2, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import type { Credit } from '@/entities/credit';
import type { Account } from '@/entities/account';

interface CreditCardProps {
  credit: Credit;
  accounts: Account[];
  onDelete: (id: string) => void;
  onPayment: (creditId: string, accountId: string, amount: number) => void;
}

const TYPE_LABELS: Record<string, string> = {
  credit: 'Кредит', installment: 'Рассрочка',
  mortgage: 'Ипотека', other: 'Другое',
};

export function CreditCard({ credit, accounts, onDelete, onPayment }: CreditCardProps) {
  const [showPayment, setShowPayment] = useState(false);
  const [amount, setAmount] = useState(String(credit.monthly_payment));
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');

  const paidPct = Math.round(((credit.total_amount - credit.remaining_amount) / credit.total_amount) * 100);

  const nextPaymentDate = credit.payment_day
    ? (() => {
        const now = new Date();
        const d = new Date(now.getFullYear(), now.getMonth(), credit.payment_day);
        if (d <= now) d.setMonth(d.getMonth() + 1);
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      })()
    : null;

  return (
    <div className="bg-[#2F4454] rounded-2xl p-5 border border-white/10 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#DA7B93]/20">
            <CreditCard size={16} className="text-[#DA7B93]" />
          </div>
          <div>
            <p className="font-semibold text-white">{credit.name}</p>
            <p className="text-xs text-white/50">{TYPE_LABELS[credit.type]}{credit.interest_rate > 0 ? ` · ${credit.interest_rate}%` : ''}</p>
          </div>
        </div>
        <button
          onClick={() => onDelete(credit.id)}
          className="p-1.5 text-white/30 hover:text-[#DA7B93] hover:bg-white/10 rounded-lg transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs text-white/60 mb-1.5">
          <span>Выплачено {paidPct}%</span>
          <span>{formatCurrency(credit.remaining_amount)} осталось</span>
        </div>
        <div className="h-2 bg-[#1C3334] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#376E6F] rounded-full transition-all"
            style={{ width: `${paidPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-[#1C3334] rounded-xl p-3">
          <p className="text-white/50 text-xs">Платёж/мес</p>
          <p className="text-white font-semibold mt-0.5">{formatCurrency(credit.monthly_payment)}</p>
        </div>
        <div className="bg-[#1C3334] rounded-xl p-3">
          <p className="text-white/50 text-xs">Следующий платёж</p>
          <p className="text-white font-semibold mt-0.5">{nextPaymentDate ?? '—'}</p>
        </div>
      </div>

      {showPayment ? (
        <div className="space-y-2">
          <select
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
            className="w-full bg-[#1C3334] text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#DA7B93]"
          >
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.icon} {a.name} ({formatCurrency(a.balance)})</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="flex-1 bg-[#1C3334] text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#DA7B93]"
            />
            <button
              onClick={() => {
                onPayment(credit.id, accountId, parseFloat(amount));
                setShowPayment(false);
              }}
              className="px-4 py-2.5 bg-[#DA7B93] text-white rounded-xl text-sm font-medium hover:bg-[#c96a82] transition-colors"
            >
              Внести
            </button>
            <button
              onClick={() => setShowPayment(false)}
              className="px-3 py-2.5 bg-white/10 text-white/60 rounded-xl text-sm hover:bg-white/15 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowPayment(true)}
          className="w-full py-2.5 bg-[#376E6F]/30 text-[#376E6F] border border-[#376E6F]/30 rounded-xl text-sm font-medium hover:bg-[#376E6F]/50 transition-colors"
        >
          Внести платёж
        </button>
      )}
    </div>
  );
}
