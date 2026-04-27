// src/widgets/QuickAIPanel/hooks/useQuickAIData.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllTransactions } from '@/entities/transaction';
import { fetchCategories } from '@/entities/category';
import { fetchBudgets, fetchSpentByCategory } from '@/entities/budget';
import type { Transaction } from '@/entities/transaction';
import type { Category } from '@/entities/category';

interface UseQuickAIDataOptions {
  userId: string | undefined;
  isOpen: boolean;
}

interface UseQuickAIDataReturn {
  allTxns: Transaction[];
  categories: Category[];
  invalidateAll: () => void;
}

export function useQuickAIData({ userId, isOpen }: UseQuickAIDataOptions): UseQuickAIDataReturn {
  const queryClient = useQueryClient();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: allTxns = [] } = useQuery({
    queryKey: ['transactions-all', userId],
    queryFn: () => fetchAllTransactions(userId!),
    enabled: !!userId && isOpen,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    enabled: isOpen,
  });

  // Fetched for cache warmth only — not returned
  useQuery({
    queryKey: ['budgets', userId, year, month],
    queryFn: () => fetchBudgets(userId!, year, month),
    enabled: !!userId && isOpen,
  });

  useQuery({
    queryKey: ['spent', userId, year, month],
    queryFn: () => fetchSpentByCategory(userId!, year, month),
    enabled: !!userId && isOpen,
  });

  const invalidateAll = () => {
    [
      'transactions', 'transactions-all', 'transactions-year',
      'transactions-month-structure', 'totals', 'spent', 'budgets',
    ].forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  return { allTxns, categories, invalidateAll };
}
