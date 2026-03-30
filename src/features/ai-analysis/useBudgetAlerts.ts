import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/entities/user';
import { fetchBudgets, fetchSpentByCategory } from '@/entities/budget';

export interface BudgetAlert {
  budgetId: string;
  categoryName: string;
  icon: string;
  spent: number;
  limit: number;
  pct: number;
  isOver: boolean;
}

export function useBudgetAlerts() {
  const { user } = useAuthStore();
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', user?.id, year, month],
    queryFn: () => fetchBudgets(user!.id, year, month),
    enabled: !!user,
  });

  const { data: spent = {} } = useQuery({
    queryKey: ['spent', user?.id, year, month],
    queryFn: () => fetchSpentByCategory(user!.id, year, month),
    enabled: !!user,
  });

  const alerts: BudgetAlert[] = budgets
    .map(b => {
      const s   = spent[b.category_id] ?? 0;
      const pct = b.limit_amount > 0 ? (s / b.limit_amount) * 100 : 0;
      return {
        budgetId:     b.id,
        categoryName: b.categories?.name_ru ?? 'Категория',
        icon:         b.categories?.icon ?? '📦',
        spent:        s,
        limit:        b.limit_amount,
        pct,
        isOver:       s > b.limit_amount,
      };
    })
    .filter(a => a.pct >= (budgets.find(b => b.id === a.budgetId)?.notify_at_pct ?? 80));

  return alerts;
}
