import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { NewInvestment, Investment } from '@/entities/investment';

const TYPES = [
  { value: 'deposit', label: '🏦 Депозит' },
  { value: 'stocks', label: '📈 Акции' },
  { value: 'crypto', label: '₿ Крипто' },
  { value: 'real_estate', label: '🏠 Недвижимость' },
  { value: 'bonds', label: '📄 Облигации' },
  { value: 'other', label: '💼 Другое' },
];

interface AddInvestmentModalProps {
  onClose: () => void;
  onSave: (inv: NewInvestment) => void;
  initial?: Partial<Investment>;
}

export function AddInvestmentModal({ onClose, onSave, initial }: AddInvestmentModalProps) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    type: initial?.type ?? 'deposit',
    invested_amount: String(initial?.invested_amount ?? ''),
    current_value: String(initial?.current_value ?? ''),
    annual_return_rate: String(initial?.annual_return_rate ?? ''),
    start_date: initial?.start_date ?? '',
    notes: initial?.notes ?? '',
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.name || !form.invested_amount) return;
    onSave({
      name: form.name,
      type: form.type as NewInvestment['type'],
      invested_amount: parseFloat(form.invested_amount),
      current_value: form.current_value ? parseFloat(form.current_value) : null,
      annual_return_rate: form.annual_return_rate ? parseFloat(form.annual_return_rate) : null,
      start_date: form.start_date || null,
      notes: form.notes || null,
      account_id: null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#2F4454] rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">Добавить инвестицию</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Название (напр. Kaspi Депозит)"
            className="w-full bg-[#1C3334] text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#DA7B93]"
          />

          <div className="grid grid-cols-2 gap-2">
            {TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => set('type', t.value)}
                className={cn(
                  'py-2.5 rounded-xl text-sm font-medium border transition-colors text-left px-3',
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
              { key: 'invested_amount', label: 'Вложено ₸' },
              { key: 'current_value', label: 'Текущая стоимость ₸' },
              { key: 'annual_return_rate', label: 'Доходность % год.' },
            ].map(({ key, label }) => (
              <div key={key} className={key === 'invested_amount' ? 'col-span-2' : ''}>
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
              <label className="text-xs text-white/50 mb-1 block">Дата начала</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
                className="w-full bg-[#1C3334] text-white rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#DA7B93] text-sm"
              />
            </div>
          </div>

          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Заметки (необязательно)"
            rows={2}
            className="w-full bg-[#1C3334] text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#DA7B93] resize-none text-sm"
          />
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/10 text-white/70 hover:bg-white/15">Отмена</button>
          <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-[#DA7B93] text-white font-semibold hover:bg-[#c96a82]">Сохранить</button>
        </div>
      </div>
    </div>
  );
}
