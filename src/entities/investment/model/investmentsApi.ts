import { supabase } from '@/shared/api/supabase';

export interface Investment {
  id: string;
  user_id: string;
  account_id: string | null;
  name: string;
  type: 'deposit' | 'stocks' | 'crypto' | 'real_estate' | 'bonds' | 'other';
  invested_amount: number;
  current_value: number | null;
  annual_return_rate: number | null;
  start_date: string | null;
  notes: string | null;
  created_at: string;
}

export type NewInvestment = Omit<Investment, 'id' | 'user_id' | 'created_at'>;

export async function fetchInvestments(userId: string) {
  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Investment[];
}

export async function createInvestment(inv: NewInvestment & { user_id: string }) {
  const { data, error } = await supabase
    .from('investments')
    .insert(inv)
    .select()
    .single();
  if (error) throw error;
  return data as Investment;
}

export async function updateInvestment(id: string, updates: Partial<Investment>) {
  const { data, error } = await supabase
    .from('investments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Investment;
}

export async function deleteInvestment(id: string) {
  const { error } = await supabase.from('investments').delete().eq('id', id);
  if (error) throw error;
}
