import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/entities/user';
import {
  fetchInvestments, createInvestment, updateInvestment,
  deleteInvestment, type Investment, type NewInvestment,
} from './investmentsApi';

export function useInvestments() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['investments', user?.id],
    queryFn: () => fetchInvestments(user!.id),
    enabled: !!user,
  });
}

export function usePortfolioStats(investments: Investment[]) {
  const totalInvested = investments.reduce((s, i) => s + i.invested_amount, 0);
  const totalCurrent = investments.reduce((s, i) => s + (i.current_value ?? i.invested_amount), 0);
  const returnPct = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;

  const byType = investments.reduce<Record<string, number>>((acc, i) => {
    acc[i.type] = (acc[i.type] ?? 0) + i.invested_amount;
    return acc;
  }, {});

  return { totalInvested, totalCurrent, returnPct, byType };
}

export function useAddInvestment() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  return useMutation({
    mutationFn: (inv: NewInvestment) => createInvestment({ ...inv, user_id: user!.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investments'] }),
  });
}

export function useUpdateInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Investment> }) =>
      updateInvestment(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investments'] }),
  });
}

export function useDeleteInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteInvestment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investments'] }),
  });
}

export type { Investment, NewInvestment };
