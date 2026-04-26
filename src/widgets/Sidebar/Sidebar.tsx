import { NavLink, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
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

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    onClose();
    navigate('/auth/login');
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex min-h-dvh w-[17rem] max-w-[85vw] shrink-0 flex-col bg-[#2F4454] text-white transition-transform duration-200 lg:static lg:min-h-full lg:w-64 lg:max-w-none',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      {/* Logo */}
      <div className="border-b border-white/10 px-5 py-4 lg:px-6 lg:py-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 overflow-hidden rounded-lg ring-1 ring-white/15 bg-white/10">
              <img src="/avatar.svg" alt="Bonssai" className="h-full w-full object-cover" />
            </div>
            <span className="text-xl font-bold tracking-tight">Bonssai</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 lg:hidden"
            aria-label="Закрыть меню"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mt-0.5 text-xs text-white/40">Умный учёт финансов</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-white/15 text-white'
                : 'text-white/60 hover:bg-white/8 hover:text-white'
            )}
          >
            <Icon className="h-4.5 w-4.5 shrink-0" size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="space-y-1 border-t border-white/10 px-3 py-4">
        <NavLink
          to="/settings"
          onClick={onClose}
          className={({ isActive }) => cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
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
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/8 hover:text-white"
        >
          <LogOut size={18} />
          Выйти
        </button>
      </div>
    </aside>
  );
}
