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

interface CreateCategoryPayload {
  user_id: string;
  name_ru: string;
  type: 'income' | 'expense' | 'both';
  icon?: string;
  color?: string;
}

export async function createCategory(payload: CreateCategoryPayload): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: payload.user_id,
      name_ru: payload.name_ru,
      name_kz: null,
      name_en: null,
      icon: payload.icon || '🏷️',
      color: payload.color || '#5DCAA5',
      type: payload.type,
      is_default: false,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Category;
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId);

  if (error) throw error;
}
