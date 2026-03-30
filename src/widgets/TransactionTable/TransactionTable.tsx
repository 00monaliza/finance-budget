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
      <Card padding="sm" className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Поиск по описанию..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F4454]"
          />
        </div>

        <div className="flex gap-2 items-center">
          <Filter size={16} className="text-gray-400" />
          {(['', 'income', 'expense', 'transfer'] as const).map(type => (
            <button
              key={type}
              onClick={() => { setFilter(f => ({ ...f, type: type || undefined })); setPage(0); }}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors',
                (filter.type ?? '') === type
                  ? 'bg-[#2F4454] text-white border-[#2F4454]'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              )}
            >
              {type === '' ? 'Все' : type === 'income' ? 'Доходы' : type === 'expense' ? 'Расходы' : 'Переводы'}
            </button>
          ))}
        </div>

        <select
          value={filter.category_id ?? ''}
          onChange={e => { setFilter(f => ({ ...f, category_id: e.target.value || undefined })); setPage(0); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2F4454]"
        >
          <option value="">Все категории</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name_ru}</option>
          ))}
        </select>

        <Link to="/transactions/new">
          <Button size="sm" leftIcon={<Plus size={14} />}>Добавить</Button>
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
            <p className="text-gray-500 font-medium">Транзакций нет</p>
            <p className="text-gray-400 text-sm mt-1">Добавьте первую транзакцию</p>
            <Link to="/transactions/new" className="inline-block mt-4">
              <Button size="sm">Добавить</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {transactions.map(t => (
              <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors group">
                {/* Category icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: (t.categories?.color ?? '#888') + '20' }}
                >
                  {t.categories?.icon ?? '📦'}
                </div>

                {/* Description & category */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {t.description ?? t.categories?.name_ru ?? 'Без описания'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.categories?.name_ru}</p>
                </div>

                {/* Date */}
                <span className="text-xs text-gray-400 shrink-0">{formatDateShort(t.date)}</span>

                {/* Type badge */}
                <Badge variant={t.type as 'income' | 'expense' | 'transfer'} dot className="shrink-0">
                  {t.type === 'income' ? 'Доход' : t.type === 'expense' ? 'Расход' : 'Перевод'}
                </Badge>

                {/* Amount */}
                <span className={cn(
                  'text-sm font-semibold w-28 text-right shrink-0',
                  t.type === 'income' ? 'text-[#1D9E75]' : 'text-[#E24B4A]'
                )}>
                  {t.type === 'income' ? '+' : '−'}{formatCurrency(t.amount)}
                </span>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(t.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-[#E24B4A] transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {transactions.length === PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              ← Назад
            </Button>
            <span className="text-sm text-gray-400">Страница {page + 1}</span>
            <Button variant="ghost" size="sm" onClick={() => setPage(p => p + 1)}>
              Вперёд →
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
