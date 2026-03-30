export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  limit_amount: number;
  period: 'month' | 'week' | 'year';
  year: number;
  month: number | null;
  notify_at_pct: number;
  created_at: string;
  // Joined
  categories?: {
    id: string;
    name_ru: string;
    icon: string;
    color: string;
  } | null;
  spent?: number;
}
