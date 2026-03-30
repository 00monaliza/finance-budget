// Auto-generated types for Supabase schema
// Run: npx supabase gen types typescript --local > src/shared/types/database.ts

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at'>;
        Update: Partial<Omit<Category, 'id' | 'created_at'>>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Transaction, 'id' | 'created_at'>>;
      };
      budgets: {
        Row: Budget;
        Insert: Omit<Budget, 'id' | 'created_at'>;
        Update: Partial<Omit<Budget, 'id' | 'created_at'>>;
      };
      goals: {
        Row: Goal;
        Insert: Omit<Goal, 'id' | 'created_at'>;
        Update: Partial<Omit<Goal, 'id' | 'created_at'>>;
      };
      ai_chats: {
        Row: AIChat;
        Insert: Omit<AIChat, 'id' | 'created_at'>;
        Update: never;
      };
    };
  };
}

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
}

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
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string;
  color: string;
  created_at: string;
}

export interface AIChat {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  context: Record<string, unknown> | null;
  created_at: string;
}

export interface TransactionFilter {
  type?: Transaction['type'];
  category_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}
