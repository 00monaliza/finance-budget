import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, PlusCircle, MinusCircle } from 'lucide-react';
import { useAuthStore } from '@/entities/user';
import { fetchGoals, createGoal, updateGoal, deleteGoal } from '@/entities/goal';
import { Button, Card, Modal, Input, Skeleton } from '@/shared/ui';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { formatDate } from '@/shared/lib/formatDate';
import { cn } from '@/shared/lib/cn';

const ICONS = ['🎯', '🏠', '🚗', '✈️', '📱', '💻', '🎓', '💍', '🏋️', '🎸', '🌍', '💰'];
const COLORS = ['#1D9E75', '#378ADD', '#DA7B93', '#EF9F27', '#534AB7', '#E24B4A', '#376E6F', '#2F4454'];

type FormState = { name: string; target: string; current: string; deadline: string; icon: string; color: string };
const DEFAULT_FORM: FormState = { name: '', target: '', current: '0', deadline: '', icon: '🎯', color: '#1D9E75' };

export default function GoalsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [depositModal, setDepositModal] = useState<{ goalId: string; name: string; current: number } | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals', user?.id],
    queryFn: () => fetchGoals(user!.id),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: () => createGoal({
      user_id: user!.id,
      name: form.name,
      target_amount: parseFloat(form.target),
      current_amount: parseFloat(form.current || '0'),
      deadline: form.deadline || null,
      icon: form.icon,
      color: form.color,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['goals'] }); setModalOpen(false); setForm(DEFAULT_FORM); },
  });

  const depositMutation = useMutation({
    mutationFn: ({ id, newAmount }: { id: string; newAmount: number }) =>
      updateGoal(id, { current_amount: newAmount }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['goals'] }); setDepositModal(null); setDepositAmount(''); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });

  const handleDeposit = (add: boolean) => {
    if (!depositModal) return;
    const delta = parseFloat(depositAmount) * (add ? 1 : -1);
    const newAmount = Math.max(0, depositModal.current + delta);
    depositMutation.mutate({ id: depositModal.goalId, newAmount });
  };

  return (
    <div className="space-y-4 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Цели накоплений</h2>
          <p className="text-sm text-white/55">{goals.length} {goals.length === 1 ? 'цель' : 'целей'}</p>
        </div>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setModalOpen(true)}>
          Новая цель
        </Button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : goals.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-5xl mb-3">🎯</div>
          <p className="font-medium text-white/75">Нет целей</p>
          <p className="text-white/55 text-sm mt-1">Создайте первую цель накопления</p>
          <Button size="sm" className="mt-4" onClick={() => setModalOpen(true)}>Создать</Button>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {goals.map(goal => {
            const pct     = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
            const done    = goal.current_amount >= goal.target_amount;
            const remains = Math.max(goal.target_amount - goal.current_amount, 0);

            return (
              <Card key={goal.id} className="group relative">
                <button
                  onClick={() => deleteMutation.mutate(goal.id)}
                  className="absolute top-4 right-4 rounded-lg p-1.5 text-white/30 opacity-0 transition-all hover:bg-[#E24B4A]/10 hover:text-[#E24B4A] group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: goal.color + '20' }}
                  >
                    {goal.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{goal.name}</p>
                    {goal.deadline && (
                      <p className="text-xs text-white/50">до {formatDate(goal.deadline)}</p>
                    )}
                  </div>
                  {done && <span className="ml-auto text-lg">✅</span>}
                </div>

                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium" style={{ color: goal.color }}>
                      {formatCurrency(goal.current_amount)}
                    </span>
                    <span className="text-white/55">{formatCurrency(goal.target_amount)}</span>
                  </div>
                  <div className="h-2.5 bg-white/12 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: goal.color }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-white/50">
                    <span>{Math.round(pct)}% выполнено</span>
                    {!done && <span>осталось {formatCurrency(remains)}</span>}
                  </div>
                </div>

                <button
                  onClick={() => { setDepositModal({ goalId: goal.id, name: goal.name, current: goal.current_amount }); setDepositAmount(''); }}
                  className="w-full rounded-xl border border-dashed border-white/20 py-1.5 text-xs font-medium text-white/75 transition-colors hover:border-[#5DCAA5] hover:text-[#5DCAA5]"
                >
                  Внести / снять
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setForm(DEFAULT_FORM); }} title="Новая цель">
        <div className="space-y-4">
          <Input label="Название" placeholder="Например: Новая машина" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Цель (₸)" type="number" placeholder="500 000" value={form.target}
              onChange={e => setForm(f => ({ ...f, target: e.target.value }))} />
            <Input label="Уже накоплено" type="number" placeholder="0" value={form.current}
              onChange={e => setForm(f => ({ ...f, current: e.target.value }))} />
          </div>

          <Input label="Дедлайн (необязательно)" type="date" value={form.deadline}
            onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Иконка</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(icon => (
                <button key={icon} type="button" onClick={() => setForm(f => ({ ...f, icon }))}
                  className={cn('w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition-colors',
                    form.icon === icon ? 'border-[#5DCAA5] bg-[#5DCAA5]/12' : 'border-white/15 hover:border-white/30'
                  )}>
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Цвет</label>
            <div className="flex gap-2">
              {COLORS.map(color => (
                <button key={color} type="button" onClick={() => setForm(f => ({ ...f, color }))}
                  className={cn('w-7 h-7 rounded-full border-2 transition-all',
                    form.color === color ? 'border-white scale-110' : 'border-transparent'
                  )}
                  style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => { setModalOpen(false); setForm(DEFAULT_FORM); }}>Отмена</Button>
            <Button className="flex-1" loading={createMutation.isPending}
              disabled={!form.name || !form.target || parseFloat(form.target) <= 0}
              onClick={() => createMutation.mutate()}>
              Создать
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deposit modal */}
      <Modal open={!!depositModal} onClose={() => setDepositModal(null)} title={`Пополнить: ${depositModal?.name}`}>
        <div className="space-y-4">
          <Input label="Сумма (₸)" type="number" placeholder="10 000" value={depositAmount}
            onChange={e => setDepositAmount(e.target.value)} />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" leftIcon={<MinusCircle size={16} />}
              loading={depositMutation.isPending}
              disabled={!depositAmount || parseFloat(depositAmount) <= 0}
              onClick={() => handleDeposit(false)}>
              Снять
            </Button>
            <Button className="flex-1" leftIcon={<PlusCircle size={16} />}
              loading={depositMutation.isPending}
              disabled={!depositAmount || parseFloat(depositAmount) <= 0}
              onClick={() => handleDeposit(true)}>
              Внести
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
