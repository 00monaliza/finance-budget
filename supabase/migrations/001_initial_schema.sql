-- FinanceAI: Initial Schema
-- Run this in Supabase SQL Editor

-- ============================================================
-- TABLES
-- ============================================================

-- Категории (предзаполненные + пользовательские)
CREATE TABLE IF NOT EXISTS categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name_ru     text NOT NULL,
  name_kz     text,
  name_en     text,
  icon        text NOT NULL,
  color       text NOT NULL,
  type        text CHECK (type IN ('income', 'expense', 'both')),
  is_default  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- Транзакции
CREATE TABLE IF NOT EXISTS transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount          numeric(12, 2) NOT NULL CHECK (amount > 0),
  type            text NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  category_id     uuid REFERENCES categories(id),
  description     text,
  date            date NOT NULL DEFAULT CURRENT_DATE,
  account         text DEFAULT 'main' CHECK (account IN ('main', 'kaspi', 'cash')),
  tags            text[],
  ai_categorized  boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Бюджеты
CREATE TABLE IF NOT EXISTS budgets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id   uuid REFERENCES categories(id) NOT NULL,
  limit_amount  numeric(12, 2) NOT NULL CHECK (limit_amount > 0),
  period        text CHECK (period IN ('month', 'week', 'year')) DEFAULT 'month',
  year          int NOT NULL,
  month         int CHECK (month BETWEEN 1 AND 12),
  notify_at_pct int DEFAULT 80,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (user_id, category_id, period, year, month)
);

-- Цели накоплений
CREATE TABLE IF NOT EXISTS goals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name            text NOT NULL,
  target_amount   numeric(12, 2) NOT NULL,
  current_amount  numeric(12, 2) DEFAULT 0,
  deadline        date,
  icon            text DEFAULT '🎯',
  color           text DEFAULT '#1D9E75',
  created_at      timestamptz DEFAULT now()
);

-- AI диалоги
CREATE TABLE IF NOT EXISTS ai_chats (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role        text CHECK (role IN ('user', 'assistant')) NOT NULL,
  content     text NOT NULL,
  context     jsonb,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_transactions_user_date     ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_period        ON budgets(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_ai_chats_user_created      ON ai_chats(user_id, created_at DESC);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chats     ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;

-- Users see only their own data
CREATE POLICY "own_data" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON budgets      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON goals        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON ai_chats     FOR ALL USING (auth.uid() = user_id);

-- Categories: read own + default; write only own
CREATE POLICY "own_or_default" ON categories FOR SELECT
  USING (auth.uid() = user_id OR is_default = true);
CREATE POLICY "own_insert" ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON categories FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON categories FOR DELETE
  USING (auth.uid() = user_id);
