import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  useAccounts, useTotalBalance, useAddAccount,
  useUpdateAccount, useDeleteAccount, useAdjustBalance,
  type Account,
} from '@/entities/account';
import { AccountCard } from '@/components/accounts/AccountCard';
import { TotalBalanceCard } from '@/components/accounts/TotalBalanceCard';
import { AddAccountModal } from '@/components/accounts/AddAccountModal';

export default function AccountsPage() {
  const { data: accounts = [], isLoading } = useAccounts();
  const total = useTotalBalance(accounts);
  const addAccount = useAddAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const adjustBalance = useAdjustBalance();

  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Account | null>(null);

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
        <h1 className="text-2xl font-bold text-white">Счета</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#DA7B93] text-white rounded-xl text-sm font-medium hover:bg-[#c96a82] transition-colors"
        >
          <Plus size={16} /> Добавить счёт
        </button>
      </div>

      <TotalBalanceCard total={total} accountCount={accounts.length} />

      {accounts.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          <p className="text-4xl mb-3">💳</p>
          <p>У вас ещё нет счетов</p>
          <p className="text-sm mt-1">Добавьте первый счёт, чтобы начать</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map(acc => (
            <AccountCard
              key={acc.id}
              account={acc}
              onEdit={setEditTarget}
              onDelete={(id) => deleteAccount.mutate(id)}
              onAdjust={(id, delta) => adjustBalance.mutate({ id, delta })}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddAccountModal
          onClose={() => setShowAdd(false)}
          onSave={(account) => addAccount.mutate(account)}
        />
      )}

      {editTarget && (
        <AddAccountModal
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(account) =>
            updateAccount.mutate({ id: editTarget.id, updates: account })
          }
        />
      )}
    </div>
  );
}
