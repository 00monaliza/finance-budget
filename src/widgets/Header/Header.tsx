import { useState } from 'react';
import { Bell, Plus, X, AlertTriangle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/entities/user';
import { useBudgetAlerts } from '@/features/ai-analysis';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { cn } from '@/shared/lib/cn';

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
  const alerts = useBudgetAlerts();
  const [showAlerts, setShowAlerts] = useState(false);

  const title = PAGE_TITLES[pathname] ?? 'FinanceAI';
  const name = user?.user_metadata?.full_name ?? user?.email ?? '';
  const initials = name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 bg-white border-b border-gray-100 px-6 flex items-center justify-between shrink-0 relative z-30">
      <h1 className="text-lg font-semibold text-[#2F4454]">{title}</h1>

      <div className="flex items-center gap-3">
        <Link
          to="/transactions/new"
          className="flex items-center gap-1.5 bg-[#2F4454] text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-[#376E6F] transition-colors"
        >
          <Plus size={16} />
          Добавить
        </Link>

        {/* Notifications bell */}
        <div className="relative">
          <button
            onClick={() => setShowAlerts(v => !v)}
            className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Bell size={20} className="text-gray-500" />
            {alerts.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#E24B4A] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {alerts.length}
              </span>
            )}
          </button>

          {showAlerts && (
            <>
              <div className="fixed inset-0" onClick={() => setShowAlerts(false)} />
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-semibold text-[#2F4454]">Уведомления</span>
                  <button onClick={() => setShowAlerts(false)} className="p-1 rounded-lg hover:bg-gray-100">
                    <X size={14} className="text-gray-400" />
                  </button>
                </div>
                {alerts.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-400">
                    Всё в порядке ✅
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                    {alerts.map(alert => (
                      <Link
                        key={alert.budgetId}
                        to="/budgets"
                        onClick={() => setShowAlerts(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <AlertTriangle
                          size={16}
                          className={cn('mt-0.5 shrink-0', alert.isOver ? 'text-[#E24B4A]' : 'text-[#EF9F27]')}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">
                            {alert.icon} {alert.categoryName}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {alert.isOver
                              ? `Перерасход на ${formatCurrency(alert.spent - alert.limit)}`
                              : `${Math.round(alert.pct)}% бюджета использовано`
                            }
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatCurrency(alert.spent)} / {formatCurrency(alert.limit)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="w-9 h-9 rounded-xl bg-[#DA7B93] flex items-center justify-center text-white text-sm font-bold">
          {initials || '?'}
        </div>
      </div>
    </header>
  );
}
