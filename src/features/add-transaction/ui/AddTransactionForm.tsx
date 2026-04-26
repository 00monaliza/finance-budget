import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { Button, Input, Card, Modal } from '@/shared/ui';
import { createTransaction } from '@/entities/transaction';
import { createCategory, deleteCategory, fetchCategories } from '@/entities/category';
import { useAuthStore } from '@/entities/user';
import { useAutoCategorize } from '@/features/auto-categorize';
import { cn } from '@/shared/lib/cn';

const schema = z.object({
  type:        z.enum(['income', 'expense', 'transfer']),
  amount:      z.number({ error: 'Введите сумму' }).positive('Сумма должна быть больше 0'),
  category_id: z.string().optional(),
  description: z.string().optional(),
  date:        z.string().min(1, 'Введите дату'),
  account:     z.enum(['main', 'kaspi', 'cash']),
}).superRefine((data, ctx) => {
  if (data.type !== 'transfer' && !data.category_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['category_id'],
      message: 'Выберите категорию',
    });
  }
});
type FormData = z.infer<typeof schema>;

const TYPE_LABELS = {
  expense:  'Расход',
  income:   'Доход',
  transfer: 'Перевод',
};
const ACCOUNT_LABELS = {
  main:  'Основной',
  kaspi: 'Kaspi',
  cash:  'Наличные',
};
const CATEGORY_TYPE_LABELS = {
  expense: 'Расход',
  income: 'Доход',
  both: 'Оба типа',
};

export function AddTransactionForm() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const [manageError, setManageError] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense' | 'both'>('expense');

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type:        'expense',
      category_id: '',
      date:        new Date().toISOString().split('T')[0],
      account:     'main',
    },
  });

  const { trigger: triggerCategorize } = useAutoCategorize(
    categories,
    (id) => setValue('category_id', id, { shouldValidate: true })
  );

  const selectedType = watch('type');
  const selectedCategoryId = watch('category_id');
  const filteredCategories = categories.filter(
    c => c.type === selectedType || c.type === 'both'
  );

  const createCategoryMutation = useMutation({
    mutationFn: (payload: { name: string; icon: string; type: 'income' | 'expense' | 'both' }) =>
      createCategory({
        user_id: user!.id,
        name_ru: payload.name,
        icon: payload.icon || '🏷️',
        type: payload.type,
      }),
    onSuccess: (created) => {
      setManageError('');
      setNewCategoryName('');
      setNewCategoryIcon('');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      if (selectedType !== 'transfer' && (created.type === selectedType || created.type === 'both')) {
        setValue('category_id', created.id, { shouldValidate: true });
      }
    },
    onError: (error) => {
      setManageError(error instanceof Error ? error.message : 'Не удалось создать категорию');
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: string) => deleteCategory(categoryId),
    onSuccess: (_data, deletedCategoryId) => {
      setManageError('');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      if (selectedCategoryId === deletedCategoryId) {
        setValue('category_id', '', { shouldValidate: true });
      }
    },
    onError: (error) => {
      setManageError(error instanceof Error ? error.message : 'Не удалось удалить категорию');
    },
  });

  useEffect(() => {
    if (selectedType === 'transfer') {
      setValue('category_id', '', { shouldValidate: false });
      return;
    }

    if (filteredCategories.length === 0) {
      setValue('category_id', '', { shouldValidate: true });
      return;
    }

    if (!selectedCategoryId || !filteredCategories.some(c => c.id === selectedCategoryId)) {
      setValue('category_id', filteredCategories[0].id, { shouldValidate: true });
    }
  }, [filteredCategories, selectedCategoryId, selectedType, setValue]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => createTransaction({
      ...data,
      user_id: user!.id,
      amount: data.amount,
      category_id: data.type === 'transfer' ? null : (data.category_id ?? null),
      description: data.description ?? null,
      tags: null,
      ai_categorized: false,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      navigate('/transactions');
    },
  });

  const onSubmit = (data: FormData) => mutation.mutate(data);

  const onCreateCategory = () => {
    const name = newCategoryName.trim();
    if (!name) {
      setManageError('Введите название категории');
      return;
    }

    createCategoryMutation.mutate({
      name,
      icon: newCategoryIcon.trim(),
      type: newCategoryType,
    });
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card>
        <h2 className="text-lg font-semibold text-white mb-5">Новая транзакция</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Type toggle */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Тип</label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(['expense', 'income', 'transfer'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => field.onChange(type)}
                      className={cn(
                        'flex-1 py-2 text-sm font-medium rounded-xl border transition-colors',
                        field.value === type
                          ? type === 'expense'
                            ? 'bg-[#E24B4A] text-white border-[#E24B4A]'
                            : type === 'income'
                            ? 'bg-[#1D9E75] text-white border-[#1D9E75]'
                            : 'bg-[#378ADD] text-white border-[#378ADD]'
                            : 'bg-white/5 text-white/70 border-white/15 hover:border-white/30'
                      )}
                    >
                      {TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Amount */}
          <div>
            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <Input
                  label="Сумма (₸)"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  error={errors.amount?.message}
                  value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              )}
            />
          </div>

          {/* Category */}
          {selectedType !== 'transfer' && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className="block text-sm font-medium text-white/80">Категория</label>
                <button
                  type="button"
                  onClick={() => {
                    setManageError('');
                    setManageCategoriesOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1 text-xs font-medium text-white/75 transition-colors hover:border-white/30 hover:bg-white/10"
                >
                  <Plus size={12} /> Управлять
                </button>
              </div>

              {categoriesLoading ? (
                <p className="text-sm text-white/55">Загрузка категорий...</p>
              ) : filteredCategories.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-[#E24B4A]">Нет категорий для выбранного типа. Добавьте свою категорию.</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setManageError('');
                      setManageCategoriesOpen(true);
                    }}
                    leftIcon={<Plus size={14} />}
                  >
                    Добавить категорию
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {filteredCategories.map(cat => {
                    const selected = selectedCategoryId === cat.id;
                    return (
                      <label
                        key={cat.id}
                        className={cn(
                          'flex flex-col items-center gap-1 p-2.5 rounded-xl border cursor-pointer transition-colors text-center',
                          selected
                            ? 'border-[#5DCAA5] bg-[#5DCAA5]/12'
                            : 'border-white/15 hover:border-white/30'
                        )}
                      >
                        <input
                          type="radio"
                          value={cat.id}
                          {...register('category_id')}
                          className="sr-only"
                        />
                        <span className="text-xl">{cat.icon}</span>
                        <span className="text-xs text-white/75 leading-tight">{cat.name_ru}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {errors.category_id && (
                <p className="text-xs text-[#E24B4A] mt-1">{errors.category_id.message}</p>
              )}
            </div>
          )}

          {/* Description with AI categorize */}
          <div className="relative">
            <Input
              label="Описание (необязательно)"
              placeholder="Например: Обед в кафе"
              rightIcon={<Sparkles size={14} className="text-[#DA7B93]" />}
              {...register('description', {
                onChange: (e) => triggerCategorize(e.target.value),
              })}
            />
            <p className="text-xs text-white/50 mt-1">AI автоматически подберёт категорию</p>
          </div>

          {/* Date & Account row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Input
                label="Дата"
                type="date"
                error={errors.date?.message}
                {...register('date')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Счёт</label>
              <select
                {...register('account')}
                className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
              >
                {(['main', 'kaspi', 'cash'] as const).map(acc => (
                  <option key={acc} value={acc}>{ACCOUNT_LABELS[acc]}</option>
                ))}
              </select>
            </div>
          </div>

          {mutation.isError && (
            <div className="bg-red-50 text-[#E24B4A] text-sm px-4 py-2.5 rounded-xl">
              {mutation.error instanceof Error ? mutation.error.message : 'Ошибка сохранения'}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => navigate('/transactions')}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              className="flex-1"
              loading={mutation.isPending}
              disabled={selectedType !== 'transfer' && filteredCategories.length === 0}
            >
              Сохранить
            </Button>
          </div>
        </form>

        <Modal
          open={manageCategoriesOpen}
          onClose={() => setManageCategoriesOpen(false)}
          title="Управление категориями"
          size="lg"
        >
          <div className="space-y-5">
            <div className="rounded-xl border border-white/12 bg-white/5 p-4 space-y-3">
              <p className="text-sm font-medium text-white">Добавить новую категорию</p>
              <Input
                label="Название"
                placeholder="Например: Такси"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/80">Тип</label>
                  <select
                    value={newCategoryType}
                    onChange={(e) => setNewCategoryType(e.target.value as 'income' | 'expense' | 'both')}
                    className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
                  >
                    <option value="expense">Расход</option>
                    <option value="income">Доход</option>
                    <option value="both">Оба типа</option>
                  </select>
                </div>

                <Input
                  label="Иконка (опционально)"
                  placeholder="🏷️"
                  maxLength={2}
                  value={newCategoryIcon}
                  onChange={(e) => setNewCategoryIcon(e.target.value)}
                />
              </div>

              <Button
                type="button"
                onClick={onCreateCategory}
                loading={createCategoryMutation.isPending}
                leftIcon={<Plus size={14} />}
                className="w-full"
              >
                Добавить категорию
              </Button>

              {manageError && <p className="text-xs text-[#E24B4A]">{manageError}</p>}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-white">Список категорий</p>
              <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                {categories.length === 0 ? (
                  <p className="text-sm text-white/55">Категорий пока нет.</p>
                ) : (
                  categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex flex-col gap-2 rounded-xl border border-white/12 bg-white/5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg leading-none">{cat.icon}</span>
                        <div>
                          <p className="text-sm text-white">{cat.name_ru}</p>
                          <p className="text-xs text-white/55">
                            {CATEGORY_TYPE_LABELS[cat.type]} {cat.is_default ? '• Системная' : '• Пользовательская'}
                          </p>
                        </div>
                      </div>

                      {cat.is_default ? (
                        <span className="rounded-lg border border-white/15 px-2 py-1 text-xs text-white/60">Защищена</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => deleteCategoryMutation.mutate(cat.id)}
                          disabled={deleteCategoryMutation.isPending}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E24B4A]/50 px-2 py-1 text-xs text-[#E24B4A] transition-colors hover:bg-[#E24B4A]/10 disabled:opacity-60"
                        >
                          <Trash2 size={12} /> Удалить
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Modal>
      </Card>
    </div>
  );
}
