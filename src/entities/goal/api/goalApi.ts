import { supabase } from '@/shared/api/supabase';
import type { Goal } from '../model/types';

export async function fetchGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Goal[];
}

export async function createGoal(payload: Omit<Goal, 'id' | 'created_at'>): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals').insert(payload).select().single();
  if (error) throw error;
  return data as Goal;
}

export async function updateGoal(id: string, payload: Partial<Omit<Goal, 'id' | 'created_at'>>): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data as Goal;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) throw error;
}
