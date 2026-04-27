import { useState } from 'react';
import { Pencil, Trash2, Plus, Minus } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import type { Account } from '@/entities/account';

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
  onAdjust: (id: string, delta: number) => void;
}

export function AccountCard({ account, onEdit, onDelete, onAdjust }: AccountCardProps) {
  const [adjustMode, setAdjustMode] = useState<'add' | 'sub' | null>(null);
  const [amount, setAmount] = useState('');

  const handleAdjust = () => {
    const val = parseFloat(amount);
    if (!val || isNaN(val)) return;
    onAdjust(account.id, adjustMode === 'add' ? val : -val);
    setAdjustMode(null);
    setAmount('');
  };

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 border border-white/10 bg-[#2F4454] relative overflow-hidden"
      style={{ borderLeftColor: account.color, borderLeftWidth: 4 }}
    >
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 -translate-y-8 translate-x-8"
        style={{ background: account.color }}
      />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{account.icon || '💳'}</span>
          <div>
            <p className="font-semibold text-white">{account.name}</p>
            <p className="text-xs text-white/50 capitalize">{account.type}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(account)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(account.id)}
            className="p-1.5 rounded-lg text-white/40 hover:text-[#DA7B93] hover:bg-white/10 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div>
        <p className="text-2xl font-bold text-white">
          {formatCurrency(account.balance, account.currency)}
        </p>
        <p className="text-xs text-white/40">{account.currency}</p>
      </div>

      {adjustMode ? (
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Сумма"
            autoFocus
            className="flex-1 bg-[#1C3334] text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#DA7B93]"
          />
          <button
            onClick={handleAdjust}
            className="px-3 py-2 bg-[#DA7B93] text-white rounded-xl text-sm font-medium hover:bg-[#c96a82] transition-colors"
          >
            OK
          </button>
          <button
            onClick={() => { setAdjustMode(null); setAmount(''); }}
            className="px-3 py-2 bg-white/10 text-white rounded-xl text-sm hover:bg-white/20 transition-colors"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setAdjustMode('add')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#376E6F]/30 text-[#376E6F] rounded-xl text-sm font-medium hover:bg-[#376E6F]/50 transition-colors border border-[#376E6F]/30"
          >
            <Plus size={14} /> Пополнить
          </button>
          <button
            onClick={() => setAdjustMode('sub')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#DA7B93]/20 text-[#DA7B93] rounded-xl text-sm font-medium hover:bg-[#DA7B93]/30 transition-colors border border-[#DA7B93]/30"
          >
            <Minus size={14} /> Списать
          </button>
        </div>
      )}
    </div>
  );
}
