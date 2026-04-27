import { supabase } from '@/shared/api/supabase';

export interface UserProfile {
  id: string;
  onboarding_completed: boolean;
  monthly_income: number | null;
  income_currency: string;
  housing_type: 'own' | 'rent' | 'mortgage' | null;
  housing_monthly_cost: number | null;
  mortgage_remaining: number | null;
  has_car: boolean;
  car_monthly_cost: number | null;
  financial_goal: 'control' | 'save' | 'pay_debts' | 'invest' | null;
  created_at: string;
  updated_at: string;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as UserProfile | null;
}

export async function upsertProfile(profile: Partial<UserProfile> & { id: string }) {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(profile)
    .select()
    .single();
  if (error) throw error;
  return data as UserProfile;
}
