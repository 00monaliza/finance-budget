import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Wallet, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/entities/user';
import { fetchTransactions, fetchMonthTotals } from '@/entities/transaction';
import { fetchBudgets, fetchSpentByCategory } from '@/entities/budget';
import { Card, Badge, Skeleton } from '@/shared/ui';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { formatDateShort } from '@/shared/lib/formatDate';
import { cn } from '@/shared/lib/cn';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

function StatCard({
  label, value, sub, icon: Icon, color
}: { label: string; value: string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <Card className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + '20' }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-xl font-bold text-[#2F4454] mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: totals, isLoading: totalsLoading } = useQuery({
    queryKey: ['totals', user?.id, year, month],
    queryFn: () => fetchMonthTotals(user!.id, year, month),
    enabled: !!user,
  });

  const { data: recentTxns = [], isLoading: txnsLoading } = useQuery({
    queryKey: ['transactions', user?.id, {}, 0],
    queryFn: () => fetchTransactions(user!.id, {}, 0, 5),
    enabled: !!user,
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', user?.id, year, month],
    queryFn: () => fetchBudgets(user!.id, year, month),
    enabled: !!user,
  });

  const { data: spent = {} } = useQuery({
    queryKey: ['spent', user?.id, year, month],
    queryFn: () => fetchSpentByCategory(user!.id, year, month),
    enabled: !!user,
  });

  const balance = (totals?.income ?? 0) - (totals?.expense ?? 0);
  const monthLabel = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(now);

  // Build 7-day chart data from recent transactions
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayTxns = recentTxns.filter(t => t.date === dateStr);
    return {
      date: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(d),
      income:  dayTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: dayTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    };
  });

  // Budgets at risk
  const budgetsAtRisk = budgets.filter(b => {
    const s = spent[b.category_id] ?? 0;
    return s / b.limit_amount >= 0.8;
  });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {totalsLoading ? (
          [1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : (
          <>
            <StatCard label={`Доходы за ${monthLabel}`} value={formatCurrency(totals?.income ?? 0)} icon={TrendingUp} color="#1D9E75" />
            <StatCard label={`Расходы за ${monthLabel}`} value={formatCurrency(totals?.expense ?? 0)} icon={TrendingDown} color="#E24B4A" />
            <StatCard
              label="Баланс"
              value={formatCurrency(Math.abs(balance))}
              sub={balance >= 0 ? 'Профицит' : 'Дефицит'}
              icon={Wallet}
              color={balance >= 0 ? '#1D9E75' : '#E24B4A'}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-[#2F4454] mb-4">Активность за 7 дней</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#E24B4A" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#E24B4A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={60}
                tickFormatter={v => v > 0 ? `${(v / 1000).toFixed(0)}k` : '0'} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Area type="monotone" dataKey="income"  stroke="#1D9E75" fill="url(#income)"  strokeWidth={2} dot={false} name="Доход" />
              <Area type="monotone" dataKey="expense" stroke="#E24B4A" fill="url(#expense)" strokeWidth={2} dot={false} name="Расход" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Budgets at risk */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#2F4454]">Бюджеты</h3>
            <Link to="/budgets" className="text-xs text-[#376E6F] hover:underline flex items-center gap-1">
              Все <ArrowRight size={12} />
            </Link>
          </div>
          {budgetsAtRisk.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Все бюджеты в норме ✅</p>
          ) : (
            <div className="space-y-3">
              {budgetsAtRisk.slice(0, 4).map(b => {
                const s = spent[b.category_id] ?? 0;
                const pct = Math.min((s / b.limit_amount) * 100, 100);
                return (
                  <div key={b.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">
                        {b.categories?.icon} {b.categories?.name_ru}
                      </span>
                      <span className={pct >= 100 ? 'text-[#E24B4A]' : 'text-[#EF9F27]'}>
                        {Math.round(pct)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: pct >= 100 ? '#E24B4A' : '#EF9F27',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Recent transactions */}
      <Card padding="none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-[#2F4454]">Последние транзакции</h3>
          <Link to="/transactions" className="text-xs text-[#376E6F] hover:underline flex items-center gap-1">
            Все <ArrowRight size={12} />
          </Link>
        </div>
        {txnsLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : recentTxns.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Транзакций нет</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentTxns.map(t => (
              <div key={t.id} className="flex items-center gap-4 px-5 py-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                  style={{ backgroundColor: (t.categories?.color ?? '#888') + '20' }}
                >
                  {t.categories?.icon ?? '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {t.description ?? t.categories?.name_ru ?? 'Без описания'}
                  </p>
                  <p className="text-xs text-gray-400">{formatDateShort(t.date)}</p>
                </div>
                <Badge variant={t.type as 'income' | 'expense' | 'transfer'} dot className="shrink-0">
                  {t.type === 'income' ? 'Доход' : 'Расход'}
                </Badge>
                <span className={cn(
                  'text-sm font-semibold shrink-0',
                  t.type === 'income' ? 'text-[#1D9E75]' : 'text-[#E24B4A]'
                )}>
                  {t.type === 'income' ? '+' : '−'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
