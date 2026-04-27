import { CreditCard } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import type { Credit } from '@/entities/credit';

interface UpcomingPaymentsProps {
  credits: Credit[];
}

export function UpcomingPayments({ credits }: UpcomingPaymentsProps) {
  const now = new Date();

  const upcoming = credits
    .filter(c => c.payment_day != null)
    .map(c => {
      const d = new Date(now.getFullYear(), now.getMonth(), c.payment_day!);
      if (d <= now) d.setMonth(d.getMonth() + 1);
      const daysLeft = Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
      return { ...c, dueDate: d, daysLeft };
    })
    .filter(c => c.daysLeft <= 14)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  if (!upcoming.length) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] backdrop-blur-xl p-5">
      <h3 className="text-sm font-medium text-white/70 uppercase tracking-[0.1em] mb-3">Ближайшие платежи</h3>
      <div className="space-y-2">
        {upcoming.map(c => (
          <div key={c.id} className="flex items-center justify-between gap-3 bg-white/5 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2">
              <CreditCard size={14} className="text-[#DA7B93] shrink-0" />
              <div>
                <p className="text-sm text-white font-medium">{c.name}</p>
                <p className="text-xs text-white/50">
                  {c.daysLeft === 0 ? 'Сегодня' : c.daysLeft === 1 ? 'Завтра' : `через ${c.daysLeft} дн.`}
                </p>
              </div>
            </div>
            <span className="text-sm font-semibold text-[#DA7B93]">{formatCurrency(c.monthly_payment)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
