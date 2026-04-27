import { useState, useRef } from 'react';
import { Bell, Plus, X, AlertTriangle, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/entities/user';
import { useBudgetAlerts } from '@/features/ai-analysis';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { cn } from '@/shared/lib/cn';
import { QuickAIPanel } from '@/widgets/QuickAIPanel';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':        'Главная',
  '/transactions':     'Операции',
  '/analytics':        'Аналитика',
  '/goals':            'Цели',
  '/profile':          'Профиль',
  '/accounts':         'Счета',
  '/credits':          'Кредиты',
  '/investments':      'Инвестиции',
  '/ai':               'AI Советник',
  '/settings/import':  'Импорт CSV',
};

export function Header() {
  const { pathname } = useLocation();
  const { user } = useAuthStore();
  const alerts = useBudgetAlerts();
  const [showAlerts, setShowAlerts] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const aiButtonRef = useRef<HTMLButtonElement>(null);

  const title = PAGE_TITLES[pathname] ?? 'Bonssai';
  const name = user?.user_metadata?.full_name ?? user?.email ?? '';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[rgba(13,27,38,0.85)] px-3 text-white backdrop-blur-xl sm:px-5">
      <h1 className="truncate text-base font-semibold text-white">{title}</h1>

      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <div className="relative">
          <button
            ref={aiButtonRef}
            type="button"
            onClick={() => setShowAIPanel(v => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DA7B93]/50 bg-[#DA7B93]/10 px-2.5 py-2 text-sm font-medium text-[#DA7B93] transition-colors hover:bg-[#DA7B93]/20 sm:px-3"
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline text-xs">AI</span>
          </button>
          <QuickAIPanel isOpen={showAIPanel} onClose={() => setShowAIPanel(false)} anchorRef={aiButtonRef} />
        </div>

        <Link
          to="/transactions/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#5DCAA5] px-2.5 py-2 text-sm font-medium text-[#0d1b26] transition-colors hover:bg-[#71d9b6] sm:px-4"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Добавить</span>
        </Link>

        <div className="relative">
          <button
            onClick={() => setShowAlerts(v => !v)}
            className="relative rounded-xl p-2 transition-colors hover:bg-white/10"
          >
            <Bell size={20} className="text-white/70" />
            {alerts.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#E24B4A] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {alerts.length}
              </span>
            )}
          </button>

          {showAlerts && (
            <>
              <div className="fixed inset-0" onClick={() => setShowAlerts(false)} />
              <div className="absolute right-0 top-12 z-50 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/12 bg-[rgba(13,27,38,0.94)] shadow-[0_24px_64px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:w-80">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <span className="text-sm font-semibold text-white">Уведомления</span>
                  <button onClick={() => setShowAlerts(false)} className="rounded-lg p-1 hover:bg-white/10">
                    <X size={14} className="text-white/50" />
                  </button>
                </div>
                {alerts.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-white/55">Нет уведомлений</div>
                ) : (
                  <div className="max-h-72 divide-y divide-white/8 overflow-y-auto">
                    {alerts.map(alert => (
                      <Link
                        key={alert.budgetId}
                        to="/transactions"
                        onClick={() => setShowAlerts(false)}
                        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/8"
                      >
                        <AlertTriangle
                          size={16}
                          className={cn('mt-0.5 shrink-0', alert.isOver ? 'text-[#E24B4A]' : 'text-[#EF9F27]')}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white/90">{alert.icon} {alert.categoryName}</p>
                          <p className="mt-0.5 text-xs text-white/65">
                            {alert.isOver
                              ? `Перерасход на ${formatCurrency(alert.spent - alert.limit)}`
                              : `${Math.round(alert.pct)}% бюджета использовано`}
                          </p>
                          <p className="text-xs text-white/45">{formatCurrency(alert.spent)} / {formatCurrency(alert.limit)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DA7B93] text-sm font-bold text-white">
          {initials || '?'}
        </div>
      </div>
    </header>
  );
}
