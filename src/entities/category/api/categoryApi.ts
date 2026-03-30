import { supabase } from '@/shared/api/supabase';
import type { Category } from '../model/types';

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name_ru');
  if (error) throw error;
  return (data ?? []) as Category[];
}
