import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useCredits, useAddCredit, useDeleteCredit, useMakePayment } from '@/entities/credit';
import { useDebts, useAddDebt, useSettleDebt, useDeleteDebt } from '@/entities/debt';
import { useAccounts } from '@/entities/account';
import { CreditCard } from '@/components/credits/CreditCard';
import { AddCreditModal } from '@/components/credits/AddCreditModal';
import { DebtCard } from '@/components/credits/DebtCard';
import { AddDebtModal } from '@/components/credits/AddDebtModal';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { cn } from '@/shared/lib/cn';

type Tab = 'credits' | 'debts';
type DebtFilter = 'owe' | 'owed';

export default function CreditsPage() {
  const [tab, setTab] = useState<Tab>('credits');
  const [debtFilter, setDebtFilter] = useState<DebtFilter>('owe');
  const [showAddCredit, setShowAddCredit] = useState(false);
  const [showAddDebt, setShowAddDebt] = useState(false);

  const { data: credits = [] } = useCredits();
  const { data: debts = [] } = useDebts();
  const { data: accounts = [] } = useAccounts();

  const addCredit = useAddCredit();
  const deleteCredit = useDeleteCredit();
  const makePayment = useMakePayment();
  const addDebt = useAddDebt();
  const settleDebt = useSettleDebt();
  const deleteDebt = useDeleteDebt();

  const totalDebt = credits.reduce((s, c) => s + c.remaining_amount, 0);
  const monthlyPayments = credits.reduce((s, c) => s + c.monthly_payment, 0);

  const filteredDebts = debts.filter(d => d.direction === debtFilter);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Кредиты и долги</h1>
        <button
          onClick={() => tab === 'credits' ? setShowAddCredit(true) : setShowAddDebt(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#DA7B93] text-white rounded-xl text-sm font-medium hover:bg-[#c96a82] transition-colors"
        >
          <Plus size={16} /> Добавить
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#2F4454] p-1 rounded-xl">
        {[
          { v: 'credits' as Tab, l: 'Кредиты & Рассрочки' },
          { v: 'debts' as Tab, l: 'Долги' },
        ].map(({ v, l }) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === v ? 'bg-[#1C3334] text-white' : 'text-white/50 hover:text-white'
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === 'credits' && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#2F4454] rounded-2xl p-4 border border-white/10">
              <p className="text-white/50 text-xs">Общий долг</p>
              <p className="text-xl font-bold text-white mt-1">{formatCurrency(totalDebt)}</p>
            </div>
            <div className="bg-[#2F4454] rounded-2xl p-4 border border-white/10">
              <p className="text-white/50 text-xs">Платежей/мес</p>
              <p className="text-xl font-bold text-[#DA7B93] mt-1">{formatCurrency(monthlyPayments)}</p>
            </div>
          </div>

          {credits.length === 0 ? (
            <div className="text-center py-16 text-white/40">
              <p className="text-4xl mb-3">🏦</p>
              <p>Нет активных кредитов</p>
            </div>
          ) : (
            <div className="space-y-4">
              {credits.map(credit => (
                <CreditCard
                  key={credit.id}
                  credit={credit}
                  accounts={accounts}
                  onDelete={(id) => deleteCredit.mutate(id)}
                  onPayment={(creditId, accountId, amount) =>
                    makePayment.mutate({ creditId, accountId, amount })
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'debts' && (
        <>
          {/* Direction filter */}
          <div className="flex gap-1 bg-[#2F4454] p-1 rounded-xl w-fit">
            {[
              { v: 'owe' as DebtFilter, l: 'Я должен' },
              { v: 'owed' as DebtFilter, l: 'Мне должны' },
            ].map(({ v, l }) => (
              <button
                key={v}
                onClick={() => setDebtFilter(v)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  debtFilter === v ? 'bg-[#1C3334] text-white' : 'text-white/50 hover:text-white'
                )}
              >
                {l}
              </button>
            ))}
          </div>

          {filteredDebts.length === 0 ? (
            <div className="text-center py-16 text-white/40">
              <p className="text-4xl mb-3">🤝</p>
              <p>Нет долгов в этой категории</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDebts.map(debt => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  onSettle={(id) => settleDebt.mutate(id)}
                  onDelete={(id) => deleteDebt.mutate(id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showAddCredit && (
        <AddCreditModal
          accounts={accounts}
          onClose={() => setShowAddCredit(false)}
          onSave={(credit) => addCredit.mutate(credit)}
        />
      )}

      {showAddDebt && (
        <AddDebtModal
          onClose={() => setShowAddDebt(false)}
          onSave={(debt) => addDebt.mutate(debt)}
        />
      )}
    </div>
  );
}
