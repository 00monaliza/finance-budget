import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Wallet, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/entities/user';
import { fetchTransactions, fetchMonthTotals } from '@/entities/transaction';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { formatDateShort } from '@/shared/lib/formatDate';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = {
  income: '#5DCAA5',
  expense: '#E24B4A',
  ai: '#DA7B93',
};

const glassClass =
  'rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.35)]';

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className={`${glassClass} flex items-center gap-4 p-5`}>
      <div
        className="h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: `${color}22` }}
      >
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p className="text-xs font-medium text-white/65">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
        {sub && <p className="mt-1 text-xs text-white/55">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthFrom = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthTo = new Date(year, month, 0).toISOString().split('T')[0];

  const { data: totals, isLoading: totalsLoading } = useQuery({
    queryKey: ['totals', user?.id, year, month],
    queryFn: () => fetchMonthTotals(user!.id, year, month),
    enabled: !!user,
  });

  const { data: recentTxns = [], isLoading: txnsLoading } = useQuery({
    queryKey: ['transactions', user?.id, {}, 0],
    queryFn: () => fetchTransactions(user!.id, {}, 0, 80),
    enabled: !!user,
  });

  const { data: monthTxns = [], isLoading: monthTxnsLoading } = useQuery({
    queryKey: ['transactions-month-structure', user?.id, year, month],
    queryFn: () => fetchTransactions(user!.id, {
      date_from: monthFrom,
      date_to: monthTo,
    }, 0, 500),
    enabled: !!user,
  });

  const balance = (totals?.income ?? 0) - (totals?.expense ?? 0);
  const monthLabel = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(now);

  const chartData = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split('T')[0];
        const dayTxns = recentTxns.filter(t => t.date === dateStr);

        return {
          date: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(d),
          income: dayTxns
            .filter(t => t.type === 'income')
            .reduce((sum, transaction) => sum + transaction.amount, 0),
          expense: dayTxns
            .filter(t => t.type === 'expense')
            .reduce((sum, transaction) => sum + transaction.amount, 0),
        };
      }),
    [recentTxns]
  );

  const donutData = useMemo(() => {
    const byCategory = new Map<string, { name: string; value: number; color: string }>();

    for (const transaction of monthTxns) {
      if (transaction.type !== 'expense') continue;

      const name = transaction.categories?.name_ru ?? 'Без категории';
      const color = transaction.categories?.color ?? '#888780';
      const key = transaction.category_id ?? 'uncategorized';
      const current = byCategory.get(key);

      if (current) {
        current.value += transaction.amount;
      } else {
        byCategory.set(key, { name, value: transaction.amount, color });
      }
    }

    const items = Array.from(byCategory.values()).sort((a, b) => b.value - a.value).slice(0, 6);

    if (items.length === 0) {
      return [{ name: 'Нет данных', value: 1, color: '#ffffff22' }];
    }

    return items;
  }, [monthTxns]);

  return (
    <div className="space-y-6 text-white">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Финансовый дашборд</h1>
            <p className="mt-1 text-sm text-white/65">Актуальные метрики, тренды и последние операции</p>
          </div>
          <Link
            to="/ai"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white/85 transition hover:bg-[rgba(255,255,255,0.1)]"
          >
            AI обзор <ArrowRight size={14} color={COLORS.ai} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {totalsLoading ? (
            Array.from({ length: 3 }, (_, i) => (
              <div key={i} className={`${glassClass} h-[108px] animate-pulse`} />
            ))
          ) : (
            <>
              <StatCard
                label={`Доходы за ${monthLabel}`}
                value={formatCurrency(totals?.income ?? 0)}
                icon={TrendingUp}
                color={COLORS.income}
              />
              <StatCard
                label={`Расходы за ${monthLabel}`}
                value={formatCurrency(totals?.expense ?? 0)}
                icon={TrendingDown}
                color={COLORS.expense}
              />
              <StatCard
                label="Баланс"
                value={formatCurrency(Math.abs(balance))}
                sub={balance >= 0 ? 'Профицит' : 'Дефицит'}
                icon={Wallet}
                color={balance >= 0 ? COLORS.income : COLORS.expense}
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className={`${glassClass} p-5 lg:col-span-2`}>
            <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.12em] text-white/70">Динамика 7 дней</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={62}
                  tickFormatter={value => (value > 0 ? `${Math.round(value / 1000)}k` : '0')}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(13, 27, 38, 0.95)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.8)' }}
                  formatter={value => formatCurrency(Number(value ?? 0))}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke={COLORS.income}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 4, fill: COLORS.income }}
                  name="Доходы"
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  stroke={COLORS.expense}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 4, fill: COLORS.expense }}
                  name="Расходы"
                />
              </LineChart>
            </ResponsiveContainer>
          </section>

          <section className={`${glassClass} p-5`}>
            <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.12em] text-white/70">Расходы по категориям</h2>
            <div className="flex items-center justify-center">
              {monthTxnsLoading ? (
                <div className="h-[220px] w-full animate-pulse rounded-xl bg-white/5" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={85}
                      dataKey="value"
                      stroke="none"
                      paddingAngle={3}
                    >
                      {donutData.map(item => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="space-y-2">
              {donutData.map(item => (
                <div key={item.name} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 text-white/80">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <span className="font-medium text-white">
                    {item.name === 'Нет данных' ? '0' : formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className={`${glassClass} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-white/70">Последние транзакции</h2>
            <Link to="/transactions" className="text-sm text-white/75 transition hover:text-white">
              Открыть все
            </Link>
          </div>

          {txnsLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />
              ))}
            </div>
          ) : recentTxns.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-white/60">Транзакций пока нет</p>
          ) : (
            <div className="divide-y divide-white/8">
              {recentTxns.slice(0, 6).map(transaction => {
                const isIncome = transaction.type === 'income';
                const amountColor = isIncome ? COLORS.income : COLORS.expense;

                return (
                  <div key={transaction.id} className="flex items-center gap-4 px-5 py-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-base"
                      style={{ backgroundColor: `${transaction.categories?.color ?? '#888888'}33` }}
                    >
                      {transaction.categories?.icon ?? '📦'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white/95">
                        {transaction.description ?? transaction.categories?.name_ru ?? 'Без описания'}
                      </p>
                      <p className="text-xs text-white/50">{formatDateShort(transaction.date)}</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70">
                      {isIncome ? 'Доход' : 'Расход'}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: amountColor }}>
                      {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
    </div>
  );
}
