export interface BudgetContext {
  period: { month: number; year: number };
  totals: { income: number; expense: number; balance: number };
  by_category: Array<{ name: string; amount: number; pct: number }>;
  top_transactions: Array<{ description: string; amount: number; type: string }>;
  budget_limits: Array<{ category: string; limit: number; spent: number; pct: number }>;
  all_time?: {
    income: number;
    expense: number;
    balance: number;
    transactions_count: number;
  };
  month_transactions_count?: number;
}
