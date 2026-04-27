import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { NewAccount } from '@/entities/account';

const ACCOUNT_ICONS: Record<string, string> = {
  card: '💳', cash: '💵', deposit: '🏦',
  crypto: '₿', other: '💼',
};

const ACCOUNT_TYPES = [
  { value: 'card', label: 'Карта' },
  { value: 'cash', label: 'Наличные' },
  { value: 'deposit', label: 'Депозит' },
  { value: 'crypto', label: 'Крипто' },
  { value: 'other', label: 'Другое' },
];

const ACCOUNT_COLORS = [
  '#376E6F', '#DA7B93', '#2F4454',
  '#5B8FA8', '#E8A87C', '#7B9EA8', '#9B8EA8',
];

interface AddAccountModalProps {
  onClose: () => void;
  onSave: (account: NewAccount) => void;
  initial?: Partial<NewAccount & { id: string }>;
}

export function AddAccountModal({ onClose, onSave, initial }: AddAccountModalProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<NewAccount['type']>(initial?.type ?? 'card');
  const [balance, setBalance] = useState(String(initial?.balance ?? '0'));
  const [color, setColor] = useState(initial?.color ?? '#376E6F');

  const icon = ACCOUNT_ICONS[type] ?? '💼';

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name, type, balance: parseFloat(balance) || 0, currency: 'KZT', color, icon });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#2F4454] rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">
            {initial?.id ? 'Редактировать счёт' : 'Новый счёт'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/60 mb-1.5 block">Название</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Основной счёт"
              className="w-full bg-[#1C3334] text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#DA7B93]"
            />
          </div>

          <div>
            <label className="text-xs text-white/60 mb-1.5 block">Тип</label>
            <div className="grid grid-cols-3 gap-2">
              {ACCOUNT_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value as NewAccount['type'])}
                  className={cn(
                    'py-2.5 rounded-xl text-sm font-medium transition-colors border',
                    type === t.value
                      ? 'bg-[#DA7B93]/20 border-[#DA7B93] text-white'
                      : 'bg-[#1C3334] border-white/10 text-white/60 hover:border-white/30'
                  )}
                >
                  {ACCOUNT_ICONS[t.value]} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-white/60 mb-1.5 block">Начальный баланс</label>
            <div className="relative">
              <input
                type="number"
                value={balance}
                onChange={e => setBalance(e.target.value)}
                className="w-full bg-[#1C3334] text-white rounded-xl px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-[#DA7B93]"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#DA7B93]">₸</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-white/60 mb-1.5 block">Цвет</label>
            <div className="flex gap-2 flex-wrap">
              {ACCOUNT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-full border-2 transition-transform',
                    color === c ? 'border-white scale-110' : 'border-transparent scale-100'
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/10 text-white/70 hover:bg-white/15 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-[#DA7B93] text-white font-semibold hover:bg-[#c96a82] transition-colors"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
