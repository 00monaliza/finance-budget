import { supabase } from '@/shared/api/supabase';

export interface Credit {
  id: string;
  user_id: string;
  account_id: string | null;
  name: string;
  type: 'credit' | 'installment' | 'mortgage' | 'other';
  total_amount: number;
  remaining_amount: number;
  monthly_payment: number;
  interest_rate: number;
  start_date: string | null;
  end_date: string | null;
  payment_day: number | null;
  is_active: boolean;
  created_at: string;
}

export type NewCredit = Omit<Credit, 'id' | 'user_id' | 'is_active' | 'created_at'>;

export async function fetchCredits(userId: string) {
  const { data, error } = await supabase
    .from('credits')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('end_date', { ascending: true });
  if (error) throw error;
  return data as Credit[];
}

export async function createCredit(credit: NewCredit & { user_id: string }) {
  const { data, error } = await supabase
    .from('credits')
    .insert(credit)
    .select()
    .single();
  if (error) throw error;
  return data as Credit;
}

export async function updateCredit(id: string, updates: Partial<Credit>) {
  const { data, error } = await supabase
    .from('credits')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Credit;
}

export async function deleteCredit(id: string) {
  const { error } = await supabase
    .from('credits')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
}

export async function makePayment({
  creditId,
  accountId,
  amount,
  userId,
}: {
  creditId: string;
  accountId: string;
  amount: number;
  userId: string;
}) {
  const { data: credit } = await supabase
    .from('credits')
    .select('remaining_amount')
    .eq('id', creditId)
    .single();

  const newRemaining = Math.max(0, (credit?.remaining_amount ?? 0) - amount);

  await supabase.from('credits').update({
    remaining_amount: newRemaining,
    is_active: newRemaining > 0,
  }).eq('id', creditId);

  const { data: acc } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', accountId)
    .single();

  await supabase.from('accounts')
    .update({ balance: (acc?.balance ?? 0) - amount })
    .eq('id', accountId);

  await supabase.from('transactions').insert({
    user_id: userId,
    account_id: accountId,
    amount,
    type: 'expense',
    category: 'credit_payment',
    description: 'Платёж по кредиту',
  });
}
