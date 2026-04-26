import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Trash2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/entities/user';
import { fetchTransactions, deleteTransaction } from '@/entities/transaction';
import { fetchCategories } from '@/entities/category';
import type { TransactionFilter } from '@/entities/transaction';
import { Badge, Button, Card, Skeleton } from '@/shared/ui';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { formatDateShort } from '@/shared/lib/formatDate';
import { cn } from '@/shared/lib/cn';
import { useQueryClient } from '@tanstack/react-query';

const PAGE_SIZE = 20;

export function TransactionTable() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<TransactionFilter>({});
  const [search, setSearch] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const queryFilter = { ...filter, search: search || undefined };

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', user?.id, queryFilter, page],
    queryFn: () => fetchTransactions(user!.id, queryFilter, page, PAGE_SIZE),
    enabled: !!user,
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить транзакцию?')) return;
    await deleteTransaction(id);
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <Card padding="sm" className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full flex-1 sm:min-w-56">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Поиск по описанию..."
            className="w-full rounded-xl border border-white/15 bg-white/8 py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
          />
        </div>

        <div className="w-full sm:w-auto">
          <div className="mb-1 flex items-center gap-2 sm:mb-0">
            <Filter size={16} className="text-white/40" />
            <span className="text-xs text-white/50 sm:hidden">Фильтр по типу</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(['', 'income', 'expense', 'transfer'] as const).map(type => (
              <button
                key={type}
                onClick={() => { setFilter(f => ({ ...f, type: type || undefined })); setPage(0); }}
                className={cn(
                  'shrink-0 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors',
                  (filter.type ?? '') === type
                    ? 'border-[#5DCAA5] bg-[#5DCAA5] text-[#0d1b26]'
                    : 'border-white/15 bg-white/5 text-white/70 hover:border-white/30'
                )}
              >
                {type === '' ? 'Все' : type === 'income' ? 'Доходы' : type === 'expense' ? 'Расходы' : 'Переводы'}
              </button>
            ))}
          </div>
        </div>

        <select
          value={filter.category_id ?? ''}
          onChange={e => { setFilter(f => ({ ...f, category_id: e.target.value || undefined })); setPage(0); }}
          className="w-full rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#5DCAA5] sm:w-auto"
        >
          <option value="">Все категории</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name_ru}</option>
          ))}
        </select>

        <Link to="/transactions/new" className="w-full sm:w-auto">
          <Button size="sm" leftIcon={<Plus size={14} />} className="w-full sm:w-auto">Добавить</Button>
        </Link>
      </Card>

      {/* Table */}
      <Card padding="none">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl mb-3">💸</div>
            <p className="font-medium text-white/75">Транзакций нет</p>
            <p className="mt-1 text-sm text-white/50">Добавьте первую транзакцию</p>
            <Link to="/transactions/new" className="inline-block mt-4">
              <Button size="sm">Добавить</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/8">
            {transactions.map(t => (
              <div key={t.id} className="group px-4 py-3.5 transition-colors hover:bg-white/6 sm:px-5">
                <div className="space-y-2 md:hidden">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                      style={{ backgroundColor: (t.categories?.color ?? '#888') + '20' }}
                    >
                      {t.categories?.icon ?? '📦'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white/90">
                        {t.description ?? t.categories?.name_ru ?? 'Без описания'}
                      </p>
                      <p className="mt-0.5 text-xs text-white/45">{t.categories?.name_ru}</p>
                    </div>
                    <span className={cn(
                      'shrink-0 text-sm font-semibold',
                      t.type === 'income' ? 'text-[#1D9E75]' : 'text-[#E24B4A]'
                    )}>
                      {t.type === 'income' ? '+' : '−'}{formatCurrency(t.amount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-white/45">{formatDateShort(t.date)}</span>
                    <Badge variant={t.type as 'income' | 'expense' | 'transfer'} dot className="shrink-0">
                      {t.type === 'income' ? 'Доход' : t.type === 'expense' ? 'Расход' : 'Перевод'}
                    </Badge>
                  </div>

                  <button
                    onClick={() => handleDelete(t.id)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/45 transition-colors hover:bg-[#E24B4A]/10 hover:text-[#E24B4A]"
                  >
                    <Trash2 size={12} /> Удалить
                  </button>
                </div>

                <div className="hidden items-center gap-4 md:flex">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                    style={{ backgroundColor: (t.categories?.color ?? '#888') + '20' }}
                  >
                    {t.categories?.icon ?? '📦'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white/90">
                      {t.description ?? t.categories?.name_ru ?? 'Без описания'}
                    </p>
                    <p className="mt-0.5 text-xs text-white/45">{t.categories?.name_ru}</p>
                  </div>

                  <span className="shrink-0 text-xs text-white/45">{formatDateShort(t.date)}</span>

                  <Badge variant={t.type as 'income' | 'expense' | 'transfer'} dot className="shrink-0">
                    {t.type === 'income' ? 'Доход' : t.type === 'expense' ? 'Расход' : 'Перевод'}
                  </Badge>

                  <span className={cn(
                    'w-28 shrink-0 text-right text-sm font-semibold',
                    t.type === 'income' ? 'text-[#1D9E75]' : 'text-[#E24B4A]'
                  )}>
                    {t.type === 'income' ? '+' : '−'}{formatCurrency(t.amount)}
                  </span>

                  <button
                    onClick={() => handleDelete(t.id)}
                    className="rounded-lg p-1.5 text-white/30 opacity-0 transition-all hover:bg-[#E24B4A]/10 hover:text-[#E24B4A] group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {transactions.length === PAGE_SIZE && (
          <div className="flex flex-col gap-2 border-t border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              ← Назад
            </Button>
            <span className="text-center text-sm text-white/55">Страница {page + 1}</span>
            <Button variant="ghost" size="sm" onClick={() => setPage(p => p + 1)}>
              Вперёд →
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
