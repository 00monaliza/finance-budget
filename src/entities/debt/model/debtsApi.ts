import { supabase } from '@/shared/api/supabase';

export interface Debt {
  id: string;
  user_id: string;
  direction: 'owe' | 'owed';
  person_name: string;
  amount: number;
  description: string | null;
  due_date: string | null;
  is_settled: boolean;
  created_at: string;
}

export type NewDebt = Omit<Debt, 'id' | 'user_id' | 'is_settled' | 'created_at'>;

export async function fetchDebts(userId: string) {
  const { data, error } = await supabase
    .from('debts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_settled', false)
    .order('due_date', { ascending: true });
  if (error) throw error;
  return data as Debt[];
}

export async function createDebt(debt: NewDebt & { user_id: string }) {
  const { data, error } = await supabase
    .from('debts')
    .insert({ ...debt, is_settled: false })
    .select()
    .single();
  if (error) throw error;
  return data as Debt;
}

export async function settleDebt(id: string) {
  const { error } = await supabase
    .from('debts')
    .update({ is_settled: true })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteDebt(id: string) {
  const { error } = await supabase.from('debts').delete().eq('id', id);
  if (error) throw error;
}
