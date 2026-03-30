import { supabase } from '@/shared/api/supabase';
import type { Budget } from '../model/types';

export async function fetchBudgets(userId: string, year: number, month: number): Promise<Budget[]> {
  const { data, error } = await supabase
    .from('budgets')
    .select('*, categories(id, name_ru, icon, color)')
    .eq('user_id', userId)
    .eq('year', year)
    .eq('month', month);
  if (error) throw error;
  return (data ?? []) as Budget[];
}

export async function upsertBudget(
  payload: Omit<Budget, 'id' | 'created_at' | 'categories' | 'spent'>
): Promise<Budget> {
  const { data, error } = await supabase
    .from('budgets')
    .upsert(payload, { onConflict: 'user_id,category_id,period,year,month' })
    .select('*, categories(id, name_ru, icon, color)')
    .single();
  if (error) throw error;
  return data as Budget;
}

export async function deleteBudget(id: string): Promise<void> {
  const { error } = await supabase.from('budgets').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchSpentByCategory(
  userId: string,
  year: number,
  month: number
): Promise<Record<string, number>> {
  const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
  const dateTo   = new Date(year, month, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('transactions')
    .select('category_id, amount')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .gte('date', dateFrom)
    .lte('date', dateTo);

  if (error) throw error;

  return (data ?? []).reduce<Record<string, number>>((acc, t) => {
    if (t.category_id) {
      acc[t.category_id] = (acc[t.category_id] ?? 0) + t.amount;
    }
    return acc;
  }, {});
}
