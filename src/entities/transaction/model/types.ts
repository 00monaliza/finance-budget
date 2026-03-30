export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category_id: string | null;
  description: string | null;
  date: string;
  account: 'main' | 'kaspi' | 'cash';
  tags: string[] | null;
  ai_categorized: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  categories?: {
    id: string;
    name_ru: string;
    icon: string;
    color: string;
  } | null;
}

export interface TransactionFilter {
  type?: Transaction['type'];
  category_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}
