import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { NewCredit } from '@/entities/credit';
import type { Account } from '@/entities/account';

const CREDIT_TYPES = [
  { value: 'credit', label: '💳 Кредит' },
  { value: 'installment', label: '🛍 Рассрочка' },
  { value: 'mortgage', label: '🏦 Ипотека' },
  { value: 'other', label: '💼 Другое' },
];

interface AddCreditModalProps {
  accounts: Account[];
  onClose: () => void;
  onSave: (credit: NewCredit) => void;
}

export function AddCreditModal({ accounts, onClose, onSave }: AddCreditModalProps) {
  const [form, setForm] = useState({
    name: '',
    type: 'credit' as NewCredit['type'],
    total_amount: '',
    remaining_amount: '',
    monthly_payment: '',
    interest_rate: '0',
    payment_day: '',
    end_date: '',
    account_id: accounts[0]?.id ?? '',
    start_date: '',
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.name || !form.total_amount || !form.monthly_payment) return;
    onSave({
      name: form.name,
      type: form.type,
      total_amount: parseFloat(form.total_amount),
      remaining_amount: parseFloat(form.remaining_amount || form.total_amount),
      monthly_payment: parseFloat(form.monthly_payment),
      interest_rate: parseFloat(form.interest_rate) || 0,
      payment_day: parseInt(form.payment_day) || null,
      end_date: form.end_date || null,
      start_date: form.start_date || null,
      account_id: form.account_id || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#2F4454] rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">Добавить кредит</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Название (напр. Kaspi кредит)"
            className="w-full bg-[#1C3334] text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#DA7B93]"
          />

          <div className="grid grid-cols-2 gap-2">
            {CREDIT_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => set('type', t.value)}
                className={cn(
                  'py-2.5 rounded-xl text-sm font-medium border transition-colors',
                  form.type === t.value
                    ? 'border-[#DA7B93] bg-[#DA7B93]/20 text-white'
                    : 'border-white/10 bg-[#1C3334] text-white/60 hover:border-white/30'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'total_amount', label: 'Сумма кредита ₸' },
              { key: 'remaining_amount', label: 'Остаток ₸' },
              { key: 'monthly_payment', label: 'Платёж/мес ₸' },
              { key: 'interest_rate', label: 'Ставка %' },
              { key: 'payment_day', label: 'День оплаты' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-white/50 mb-1 block">{label}</label>
                <input
                  type="number"
                  value={(form as Record<string, string>)[key]}
                  onChange={e => set(key, e.target.value)}
                  className="w-full bg-[#1C3334] text-white rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#DA7B93] text-sm"
                />
              </div>
            ))}
            <div>
              <label className="text-xs text-white/50 mb-1 block">Дата закрытия</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => set('end_date', e.target.value)}
                className="w-full bg-[#1C3334] text-white rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#DA7B93] text-sm"
              />
            </div>
          </div>

          {accounts.length > 0 && (
            <div>
              <label className="text-xs text-white/50 mb-1 block">Списывать со счёта</label>
              <select
                value={form.account_id}
                onChange={e => set('account_id', e.target.value)}
                className="w-full bg-[#1C3334] text-white rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#DA7B93] text-sm"
              >
                <option value="">Не привязан</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/10 text-white/70 hover:bg-white/15">Отмена</button>
          <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-[#DA7B93] text-white font-semibold hover:bg-[#c96a82]">Добавить</button>
        </div>
      </div>
    </div>
  );
}
