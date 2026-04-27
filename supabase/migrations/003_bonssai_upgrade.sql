-- =====================
-- USER PROFILE & ONBOARDING
-- =====================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  monthly_income NUMERIC(12,2),
  income_currency VARCHAR(3) DEFAULT 'KZT',
  housing_type VARCHAR(20) CHECK (housing_type IN ('own', 'rent', 'mortgage')),
  housing_monthly_cost NUMERIC(12,2),
  mortgage_remaining NUMERIC(12,2),
  has_car BOOLEAN DEFAULT FALSE,
  car_monthly_cost NUMERIC(12,2),
  financial_goal VARCHAR(30) CHECK (
    financial_goal IN ('control', 'save', 'pay_debts', 'invest')
  ),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- ACCOUNTS (СЧЕТА)
-- =====================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('card', 'cash', 'deposit', 'crypto', 'other')),
  balance NUMERIC(12,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'KZT',
  color VARCHAR(7) DEFAULT '#376E6F',
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- CREDITS & INSTALLMENTS (КРЕДИТЫ / РАССРОЧКИ)
-- =====================
CREATE TABLE IF NOT EXISTS credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('credit', 'installment', 'mortgage', 'other')),
  total_amount NUMERIC(12,2) NOT NULL,
  remaining_amount NUMERIC(12,2) NOT NULL,
  monthly_payment NUMERIC(12,2) NOT NULL,
  interest_rate NUMERIC(5,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  payment_day INTEGER CHECK (payment_day BETWEEN 1 AND 31),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- DEBTS (ДОЛГИ: Я ДОЛЖЕН / МНЕ ДОЛЖНЫ)
-- =====================
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  direction VARCHAR(10) CHECK (direction IN ('owe', 'owed')),
  person_name VARCHAR(100) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  due_date DATE,
  is_settled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- INVESTMENTS (ИНВЕСТИЦИИ)
-- =====================
CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('deposit', 'stocks', 'crypto', 'real_estate', 'bonds', 'other')),
  invested_amount NUMERIC(12,2) NOT NULL,
  current_value NUMERIC(12,2),
  annual_return_rate NUMERIC(5,2),
  start_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- AI CONVERSATIONS
-- =====================
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]',
  context_type VARCHAR(30),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_data" ON user_profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "user_own_accounts" ON accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own_credits" ON credits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own_debts" ON debts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own_investments" ON investments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own_ai" ON ai_conversations FOR ALL USING (auth.uid() = user_id);

-- Triggers для updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_ai_conversations BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add account_id to existing transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
