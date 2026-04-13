import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, PieChart, BarChart3,
  Target, Bot, Settings, LogOut,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { signOut } from '@/features/auth';

const NAV_ITEMS = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Главная'     },
  { to: '/transactions', icon: ArrowLeftRight,  label: 'Транзакции'  },
  { to: '/budgets',      icon: PieChart,        label: 'Бюджеты'     },
  { to: '/analytics',    icon: BarChart3,       label: 'Аналитика'   },
  { to: '/goals',        icon: Target,          label: 'Цели'        },
  { to: '/ai',           icon: Bot,             label: 'AI Советник' },
];

export function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth/login');
  };

  return (
    <aside className="w-64 min-h-screen bg-[#2F4454] text-white flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 overflow-hidden rounded-lg ring-1 ring-white/15 bg-white/10">
            <img src="/avatar.svg" alt="Bonssai" className="h-full w-full object-cover" />
          </div>
          <span className="text-xl font-bold tracking-tight">Bonssai</span>
        </div>
        <p className="text-xs text-white/40 mt-0.5">Умный учёт финансов</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              isActive
                ? 'bg-white/15 text-white'
                : 'text-white/60 hover:bg-white/8 hover:text-white'
            )}
          >
            <Icon className="w-4.5 h-4.5 shrink-0" size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
            isActive
              ? 'bg-white/15 text-white'
              : 'text-white/60 hover:bg-white/8 hover:text-white'
          )}
        >
          <Settings size={18} />
          Настройки
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Выйти
        </button>
      </div>
    </aside>
  );
}
