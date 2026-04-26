import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/entities/user';
import { fetchBudgets, upsertBudget, deleteBudget, fetchSpentByCategory } from '@/entities/budget';
import { fetchCategories } from '@/entities/category';
import { Button, Card, Modal, Input, Skeleton } from '@/shared/ui';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { cn } from '@/shared/lib/cn';

function BudgetBar({ spent, limit, color }: { spent: number; limit: number; color: string }) {
  const pct = Math.min((spent / limit) * 100, 100);
  const isOver = spent > limit;
  const isWarning = pct >= 80 && !isOver;

  return (
    <div className="w-full h-2 bg-white/12 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${pct}%`,
          backgroundColor: isOver ? '#E24B4A' : isWarning ? '#EF9F27' : color,
        }}
      />
    </div>
  );
}

export function BudgetOverview() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);
  const [modalOpen, setModalOpen] = useState(false);
  const [limitInput, setLimitInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: ['budgets', user?.id, year, month],
    queryFn: () => fetchBudgets(user!.id, year, month),
    enabled: !!user,
  });

  const { data: spent = {} } = useQuery({
    queryKey: ['spent', user?.id, year, month],
    queryFn: () => fetchSpentByCategory(user!.id, year, month),
    enabled: !!user,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const addMutation = useMutation({
    mutationFn: () => upsertBudget({
      user_id: user!.id,
      category_id: categoryInput,
      limit_amount: parseFloat(limitInput),
      period: 'month',
      year,
      month,
      notify_at_pct: 80,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setModalOpen(false);
      setLimitInput('');
      setCategoryInput('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgets'] }),
  });

  const existingCategoryIds = new Set(budgets.map(b => b.category_id));
  const availableCategories = categories.filter(
    c => (c.type === 'expense' || c.type === 'both') && !existingCategoryIds.has(c.id)
  );

  const monthLabel = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Бюджеты</h2>
          <p className="text-sm text-white/55 capitalize">{monthLabel}</p>
        </div>
        <Button
          size="sm"
          leftIcon={<Plus size={14} />}
          onClick={() => setModalOpen(true)}
          disabled={availableCategories.length === 0}
          className="w-full sm:w-auto"
        >
          Добавить
        </Button>
      </div>

      {budgetsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : budgets.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-5xl mb-3">💰</div>
          <p className="font-medium text-white/75">Нет бюджетов</p>
          <p className="mt-1 text-sm text-white/55">Установите лимиты по категориям</p>
          <Button size="sm" className="mt-4" onClick={() => setModalOpen(true)}>
            Создать первый
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {budgets.map(budget => {
            const spentAmt  = spent[budget.category_id] ?? 0;
            const pct       = Math.min((spentAmt / budget.limit_amount) * 100, 100);
            const isOver    = spentAmt > budget.limit_amount;
            const isWarning = pct >= 80 && !isOver;

            return (
              <Card key={budget.id} className="group">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ backgroundColor: (budget.categories?.color ?? '#888') + '20' }}
                  >
                    {budget.categories?.icon ?? '📦'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white/90">
                      {budget.categories?.name_ru ?? 'Категория'}
                    </p>
                    <p className="text-xs text-white/50">
                      {formatCurrency(spentAmt)} / {formatCurrency(budget.limit_amount)}
                    </p>
                  </div>
                  {(isOver || isWarning) && (
                    <AlertTriangle
                      size={16}
                      className={isOver ? 'text-[#E24B4A]' : 'text-[#EF9F27]'}
                    />
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(budget.id)}
                    className="rounded-lg p-1.5 text-white/45 transition-all hover:bg-[#E24B4A]/10 hover:text-[#E24B4A] sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <BudgetBar
                  spent={spentAmt}
                  limit={budget.limit_amount}
                  color={budget.categories?.color ?? '#2F4454'}
                />

                <div className="flex justify-between mt-2">
                  <span className={cn('text-xs font-medium', isOver ? 'text-[#E24B4A]' : 'text-white/65')}>
                    {isOver ? `Перерасход на ${formatCurrency(spentAmt - budget.limit_amount)}` : `${Math.round(pct)}% использовано`}
                  </span>
                  <span className="text-xs text-white/45">
                    Осталось {formatCurrency(Math.max(budget.limit_amount - spentAmt, 0))}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Новый бюджет">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Категория</label>
            <select
              value={categoryInput}
              onChange={e => setCategoryInput(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
            >
              <option value="">Выберите категорию</option>
              {availableCategories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name_ru}</option>
              ))}
            </select>
          </div>

          <Input
            label="Лимит (₸)"
            type="number"
            min="0"
            placeholder="50 000"
            value={limitInput}
            onChange={e => setLimitInput(e.target.value)}
          />

          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
              Отмена
            </Button>
            <Button
              className="flex-1"
              loading={addMutation.isPending}
              disabled={!categoryInput || !limitInput || parseFloat(limitInput) <= 0}
              onClick={() => addMutation.mutate()}
            >
              Сохранить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
