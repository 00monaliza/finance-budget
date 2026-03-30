export const DEFAULT_CATEGORIES = [
  // Расходы
  { name_ru: 'Еда и продукты',   icon: '🛒', color: '#1D9E75', type: 'expense' as const },
  { name_ru: 'Транспорт',        icon: '🚌', color: '#378ADD', type: 'expense' as const },
  { name_ru: 'Кафе и рестораны', icon: '☕', color: '#EF9F27', type: 'expense' as const },
  { name_ru: 'Развлечения',      icon: '🎬', color: '#D4537E', type: 'expense' as const },
  { name_ru: 'Здоровье',         icon: '💊', color: '#E24B4A', type: 'expense' as const },
  { name_ru: 'Одежда',           icon: '👕', color: '#534AB7', type: 'expense' as const },
  { name_ru: 'Связь',            icon: '📱', color: '#376E6F', type: 'expense' as const },
  { name_ru: 'Жильё и ЖКХ',     icon: '🏠', color: '#2F4454', type: 'expense' as const },
  { name_ru: 'Образование',      icon: '📚', color: '#5DCAA5', type: 'expense' as const },
  { name_ru: 'Прочее',           icon: '📦', color: '#888780', type: 'expense' as const },
  // Доходы
  { name_ru: 'Зарплата',         icon: '💼', color: '#1D9E75', type: 'income' as const },
  { name_ru: 'Фриланс',          icon: '💻', color: '#378ADD', type: 'income' as const },
  { name_ru: 'Подарки',          icon: '🎁', color: '#DA7B93', type: 'income' as const },
  { name_ru: 'Инвестиции',       icon: '📈', color: '#534AB7', type: 'income' as const },
];

export const CURRENCY = '₸';

export const ACCOUNTS = ['main', 'kaspi', 'cash'] as const;
export type Account = typeof ACCOUNTS[number];

export const TRANSACTION_TYPES = ['income', 'expense', 'transfer'] as const;
export type TransactionType = typeof TRANSACTION_TYPES[number];
