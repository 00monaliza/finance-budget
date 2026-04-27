import { useState } from 'react';
import { TransactionTable } from '@/widgets/TransactionTable';
import { BudgetOverview } from '@/widgets/BudgetOverview';
import { cn } from '@/shared/lib/cn';

const TABS = [
  { id: 'transactions', label: 'Транзакции' },
  { id: 'budgets',      label: 'Бюджеты'    },
] as const;

type TabId = typeof TABS[number]['id'];

export default function TransactionsPage() {
  const [tab, setTab] = useState<TabId>('transactions');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-white/6 p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
              tab === t.id
                ? 'bg-[#5DCAA5] text-[#0d1b26]'
                : 'text-white/55 hover:text-white'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'transactions' ? <TransactionTable /> : <BudgetOverview />}
    </div>
  );
}
