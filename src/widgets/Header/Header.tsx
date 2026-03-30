import { Bell, Plus } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/entities/user';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':    'Главная',
  '/transactions': 'Транзакции',
  '/budgets':      'Бюджеты',
  '/analytics':    'Аналитика',
  '/goals':        'Цели накоплений',
  '/ai':           'AI Советник',
  '/settings':     'Настройки',
};

export function Header() {
  const { pathname } = useLocation();
  const { user } = useAuthStore();
  const title = PAGE_TITLES[pathname] ?? 'FinanceAI';
  const name = user?.user_metadata?.full_name ?? user?.email ?? '';
  const initials = name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 bg-white border-b border-gray-100 px-6 flex items-center justify-between shrink-0">
      <h1 className="text-lg font-semibold text-[#2F4454]">{title}</h1>

      <div className="flex items-center gap-3">
        <Link
          to="/transactions/new"
          className="flex items-center gap-1.5 bg-[#2F4454] text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-[#376E6F] transition-colors"
        >
          <Plus size={16} />
          Добавить
        </Link>

        <button className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <Bell size={20} className="text-gray-500" />
        </button>

        <div className="w-9 h-9 rounded-xl bg-[#DA7B93] flex items-center justify-center text-white text-sm font-bold">
          {initials || '?'}
        </div>
      </div>
    </header>
  );
}
