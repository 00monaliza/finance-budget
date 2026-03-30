export interface Category {
  id: string;
  user_id: string | null;
  name_ru: string;
  name_kz: string | null;
  name_en: string | null;
  icon: string;
  color: string;
  type: 'income' | 'expense' | 'both';
  is_default: boolean;
  created_at: string;
}
