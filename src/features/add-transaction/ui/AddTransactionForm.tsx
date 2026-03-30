import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button, Input, Card } from '@/shared/ui';
import { createTransaction } from '@/entities/transaction';
import { fetchCategories } from '@/entities/category';
import { useAuthStore } from '@/entities/user';
import { useAutoCategorize } from '@/features/auto-categorize';
import { cn } from '@/shared/lib/cn';

const schema = z.object({
  type:        z.enum(['income', 'expense', 'transfer']),
  amount:      z.number({ error: 'Введите сумму' }).positive('Сумма должна быть больше 0'),
  category_id: z.string().min(1, 'Выберите категорию'),
  description: z.string().optional(),
  date:        z.string().min(1, 'Введите дату'),
  account:     z.enum(['main', 'kaspi', 'cash']),
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

export function AddTransactionForm() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type:    'expense',
      date:    new Date().toISOString().split('T')[0],
      account: 'main',
    },
  });

  const { trigger: triggerCategorize } = useAutoCategorize(
    categories,
    (id) => setValue('category_id', id, { shouldValidate: true })
  );

  const selectedType = watch('type');
  const filteredCategories = categories.filter(
    c => c.type === selectedType || c.type === 'both'
  );

  const mutation = useMutation({
    mutationFn: (data: FormData) => createTransaction({
      ...data,
      user_id: user!.id,
      amount: data.amount,
      category_id: data.category_id,
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

  return (
    <div className="max-w-lg mx-auto">
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
                <div className="flex gap-2">
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
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Категория</label>
            <div className="grid grid-cols-3 gap-2">
              {filteredCategories.map(cat => {
                const selected = watch('category_id') === cat.id;
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
            {errors.category_id && (
              <p className="text-xs text-[#E24B4A] mt-1">{errors.category_id.message}</p>
            )}
          </div>

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
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                label="Дата"
                type="date"
                error={errors.date?.message}
                {...register('date')}
              />
            </div>
            <div className="flex-1">
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

          <div className="flex gap-3 pt-1">
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
            >
              Сохранить
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
