import { NavLink } from 'react-router-dom';
import { Home, ArrowLeftRight, BarChart3, Target, User } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

const TABS = [
  { to: '/dashboard',    icon: Home,            label: 'Главная'   },
  { to: '/transactions', icon: ArrowLeftRight,  label: 'Операции'  },
  { to: '/analytics',   icon: BarChart3,        label: 'Аналитика' },
  { to: '/goals',       icon: Target,           label: 'Цели'      },
  { to: '/profile',     icon: User,             label: 'Профиль'   },
] as const;

export function BottomTabBar() {
  return (
    <nav
      aria-label="Основная навигация"
      className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-white/10 bg-[rgba(13,27,38,0.95)] backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
              isActive ? 'text-[#5DCAA5]' : 'text-white/45 hover:text-white/70'
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
