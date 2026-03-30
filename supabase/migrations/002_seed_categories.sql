-- Seed default categories (is_default = true, user_id = null)
-- Run after 001_initial_schema.sql

INSERT INTO categories (name_ru, name_kz, name_en, icon, color, type, is_default) VALUES
  -- Расходы
  ('Еда и продукты',    'Тамақ және өнімдер', 'Food & Groceries', '🛒', '#1D9E75', 'expense', true),
  ('Транспорт',         'Көлік',              'Transport',         '🚌', '#378ADD', 'expense', true),
  ('Кафе и рестораны',  'Кафе мен мейрамхана','Cafes & Restaurants','☕', '#EF9F27', 'expense', true),
  ('Развлечения',       'Ойын-сауық',         'Entertainment',     '🎬', '#D4537E', 'expense', true),
  ('Здоровье',          'Денсаулық',          'Health',            '💊', '#E24B4A', 'expense', true),
  ('Одежда',            'Киім',               'Clothing',          '👕', '#534AB7', 'expense', true),
  ('Связь',             'Байланыс',           'Communication',     '📱', '#376E6F', 'expense', true),
  ('Жильё и ЖКХ',      'Тұрғын үй',          'Housing',           '🏠', '#2F4454', 'expense', true),
  ('Образование',       'Білім',              'Education',         '📚', '#5DCAA5', 'expense', true),
  ('Прочее',            'Басқалары',          'Other',             '📦', '#888780', 'expense', true),
  -- Доходы
  ('Зарплата',          'Жалақы',             'Salary',            '💼', '#1D9E75', 'income',  true),
  ('Фриланс',           'Фриланс',            'Freelance',         '💻', '#378ADD', 'income',  true),
  ('Подарки',           'Сыйлықтар',          'Gifts',             '🎁', '#DA7B93', 'income',  true),
  ('Инвестиции',        'Инвестициялар',       'Investments',       '📈', '#534AB7', 'income',  true)
ON CONFLICT DO NOTHING;
