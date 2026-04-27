import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { NewDebt } from '@/entities/debt';

interface AddDebtModalProps {
  onClose: () => void;
  onSave: (debt: NewDebt) => void;
}

export function AddDebtModal({ onClose, onSave }: AddDebtModalProps) {
  const [direction, setDirection] = useState<'owe' | 'owed'>('owe');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleSave = () => {
    if (!personName || !amount) return;
    onSave({
      direction,
      person_name: personName,
      amount: parseFloat(amount),
      description: description || null,
      due_date: dueDate || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#2F4454] rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">Добавить долг</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-3">
            {[
              { v: 'owe' as const, l: 'Я должен' },
              { v: 'owed' as const, l: 'Мне должны' },
            ].map(({ v, l }) => (
              <button
                key={v}
                type="button"
                onClick={() => setDirection(v)}
                className={cn(
                  'flex-1 py-3 rounded-xl text-sm font-medium border transition-colors',
                  direction === v
                    ? 'border-[#DA7B93] bg-[#DA7B93]/20 text-white'
                    : 'border-white/10 bg-[#1C3334] text-white/60 hover:border-white/30'
                )}
              >
                {l}
              </button>
            ))}
          </div>

          <input
            value={personName}
            onChange={e => setPersonName(e.target.value)}
            placeholder="Имя человека"
            className="w-full bg-[#1C3334] text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#DA7B93]"
          />

          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Сумма"
              className="w-full bg-[#1C3334] text-white rounded-xl px-4 py-3 pr-10 outline-none focus:ring-2 focus:ring-[#DA7B93]"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#DA7B93]">₸</span>
          </div>

          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Описание (необязательно)"
            className="w-full bg-[#1C3334] text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#DA7B93]"
          />

          <div>
            <label className="text-xs text-white/50 mb-1 block">Дата возврата (необязательно)</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full bg-[#1C3334] text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#DA7B93]"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/10 text-white/70 hover:bg-white/15">Отмена</button>
          <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-[#DA7B93] text-white font-semibold hover:bg-[#c96a82]">Добавить</button>
        </div>
      </div>
    </div>
  );
}
