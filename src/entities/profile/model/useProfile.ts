import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProfile, upsertProfile, type UserProfile } from './profileApi';

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getProfile(userId!),
    enabled: !!userId,
  });
}

export function useUpsertProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertProfile,
    onSuccess: (data) => {
      qc.setQueryData(['profile', data.id], data);
    },
  });
}

export type { UserProfile };
