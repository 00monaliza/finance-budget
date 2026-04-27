import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/entities/user';
import { fetchDebts, createDebt, settleDebt, deleteDebt, type Debt, type NewDebt } from './debtsApi';

export function useDebts() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['debts', user?.id],
    queryFn: () => fetchDebts(user!.id),
    enabled: !!user,
  });
}

export function useAddDebt() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  return useMutation({
    mutationFn: (debt: NewDebt) => createDebt({ ...debt, user_id: user!.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  });
}

export function useSettleDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: settleDebt,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  });
}

export function useDeleteDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteDebt,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  });
}

export type { Debt, NewDebt };
