import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/entities/user';
import {
  fetchAccounts, createAccount, updateAccount,
  deleteAccount, adjustBalance, type Account, type NewAccount,
} from './accountsApi';

export function useAccounts() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: () => fetchAccounts(user!.id),
    enabled: !!user,
  });
}

export function useTotalBalance(accounts: Account[] | undefined) {
  return accounts?.reduce((sum, acc) => sum + (acc.balance ?? 0), 0) ?? 0;
}

export function useAddAccount() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  return useMutation({
    mutationFn: (account: NewAccount) => createAccount({ ...account, user_id: user!.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Account> }) =>
      updateAccount(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useAdjustBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, delta }: { id: string; delta: number }) => adjustBalance(id, delta),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}
