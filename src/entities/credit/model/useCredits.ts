import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/entities/user';
import {
  fetchCredits, createCredit, updateCredit,
  deleteCredit, makePayment, type Credit, type NewCredit,
} from './creditsApi';

export function useCredits() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['credits', user?.id],
    queryFn: () => fetchCredits(user!.id),
    enabled: !!user,
  });
}

export function useAddCredit() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  return useMutation({
    mutationFn: (credit: NewCredit) => createCredit({ ...credit, user_id: user!.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credits'] }),
  });
}

export function useUpdateCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Credit> }) =>
      updateCredit(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credits'] }),
  });
}

export function useDeleteCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCredit,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credits'] }),
  });
}

export function useMakePayment() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  return useMutation({
    mutationFn: ({ creditId, accountId, amount }: { creditId: string; accountId: string; amount: number }) =>
      makePayment({ creditId, accountId, amount, userId: user!.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credits'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export type { Credit, NewCredit };
