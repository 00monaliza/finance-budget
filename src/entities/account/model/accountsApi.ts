import { supabase } from '@/shared/api/supabase';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: 'card' | 'cash' | 'deposit' | 'crypto' | 'other';
  balance: number;
  currency: string;
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
}

export type NewAccount = Omit<Account, 'id' | 'user_id' | 'is_active' | 'created_at'>;

export async function fetchAccounts(userId: string) {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Account[];
}

export async function createAccount(account: NewAccount & { user_id: string }) {
  const { data, error } = await supabase
    .from('accounts')
    .insert(account)
    .select()
    .single();
  if (error) throw error;
  return data as Account;
}

export async function updateAccount(id: string, updates: Partial<Account>) {
  const { data, error } = await supabase
    .from('accounts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Account;
}

export async function deleteAccount(id: string) {
  const { error } = await supabase
    .from('accounts')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
}

export async function adjustBalance(id: string, delta: number) {
  const { data: acc } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', id)
    .single();
  const { error } = await supabase
    .from('accounts')
    .update({ balance: (acc?.balance ?? 0) + delta })
    .eq('id', id);
  if (error) throw error;
}
