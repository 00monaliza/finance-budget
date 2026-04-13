import { supabase } from '@/shared/api/supabase';
import type { Transaction, TransactionFilter } from '../model/types';

export async function fetchTransactions(
  userId: string,
  filter?: TransactionFilter,
  page = 0,
  pageSize = 20
): Promise<Transaction[]> {
  let query = supabase
    .from('transactions')
    .select('*, categories(id, name_ru, icon, color)')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (filter?.type)        query = query.eq('type', filter.type);
  if (filter?.category_id) query = query.eq('category_id', filter.category_id);
  if (filter?.date_from)   query = query.gte('date', filter.date_from);
  if (filter?.date_to)     query = query.lte('date', filter.date_to);
  if (filter?.search)      query = query.ilike('description', `%${filter.search}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

export async function fetchAllTransactions(
  userId: string,
  filter?: TransactionFilter,
  pageSize = 500
): Promise<Transaction[]> {
  const result: Transaction[] = [];
  let page = 0;

  while (true) {
    const chunk = await fetchTransactions(userId, filter, page, pageSize);
    result.push(...chunk);

    if (chunk.length < pageSize) break;
    page += 1;

    // Safety guard for unexpectedly large datasets in a single UI request.
    if (page > 100) break;
  }

  return result;
}

export async function createTransaction(
  payload: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'categories'>
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert(payload)
    .select('*, categories(id, name_ru, icon, color)')
    .single();
  if (error) throw error;
  return data as Transaction;
}

export async function updateTransaction(
  id: string,
  payload: Partial<Omit<Transaction, 'id' | 'created_at' | 'categories'>>
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', id)
    .select('*, categories(id, name_ru, icon, color)')
    .single();
  if (error) throw error;
  return data as Transaction;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchMonthTotals(userId: string, year: number, month: number) {
  const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
  const dateTo   = new Date(year, month, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('user_id', userId)
    .gte('date', dateFrom)
    .lte('date', dateTo);

  if (error) throw error;

  return (data ?? []).reduce(
    (acc, t) => {
      if (t.type === 'income')  acc.income  += t.amount;
      if (t.type === 'expense') acc.expense += t.amount;
      return acc;
    },
    { income: 0, expense: 0 }
  );
}
