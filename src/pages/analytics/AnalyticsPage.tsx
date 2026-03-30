import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/entities/user';
import { fetchTransactions } from '@/entities/transaction';
import { fetchCategories } from '@/entities/category';
import { Card } from '@/shared/ui';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const now  = new Date();
  const [year, setYear] = useState(now.getFullYear());

  // Fetch all transactions for the year
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions-year', user?.id, year],
    queryFn: () => fetchTransactions(user!.id, {
      date_from: `${year}-01-01`,
      date_to:   `${year}-12-31`,
    }, 0, 500),
    enabled: !!user,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  // Monthly bar chart data
  const monthlyData = MONTHS.map((label, i) => {
    const m = String(i + 1).padStart(2, '0');
    const monthTxns = transactions.filter(t => t.date.startsWith(`${year}-${m}`));
    return {
      month: label,
      income:  monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    };
  });

  // Expenses by category (pie)
  const byCategoryMap: Record<string, number> = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const key = t.category_id ?? 'other';
    byCategoryMap[key] = (byCategoryMap[key] ?? 0) + t.amount;
  });

  const pieData = Object.entries(byCategoryMap)
    .map(([catId, amount]) => {
      const cat = categories.find(c => c.id === catId);
      return { name: cat?.name_ru ?? 'Прочее', amount, color: cat?.color ?? '#888780', icon: cat?.icon ?? '📦' };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6 text-white">
      {/* Year selector */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-white">Аналитика</h2>
        <div className="flex items-center gap-1 rounded-xl border border-white/15 bg-white/6 px-1 py-1">
          <button
            onClick={() => setYear(y => y - 1)}
            className="rounded-lg px-2 py-1 text-sm text-white/65 hover:bg-white/10"
          >←</button>
          <span className="px-3 text-sm font-medium text-white">{year}</span>
          <button
            onClick={() => setYear(y => Math.min(y + 1, now.getFullYear()))}
            className="rounded-lg px-2 py-1 text-sm text-white/65 hover:bg-white/10"
            disabled={year >= now.getFullYear()}
          >→</button>
        </div>
      </div>

      {/* Year totals */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Доходы за год',  value: formatCurrency(totalIncome),  color: '#1D9E75' },
          { label: 'Расходы за год', value: formatCurrency(totalExpense),  color: '#E24B4A' },
          { label: 'Сальдо',         value: formatCurrency(Math.abs(totalIncome - totalExpense)),
            color: totalIncome >= totalExpense ? '#1D9E75' : '#E24B4A' },
        ].map(s => (
          <Card key={s.label}>
            <p className="text-xs text-white/55">{s.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Monthly bar chart */}
      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">Доходы и расходы по месяцам</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.7)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.7)' }} axisLine={false} tickLine={false} width={64}
              tickFormatter={v => v > 0 ? `${(v / 1000).toFixed(0)}k` : '0'} />
            <Tooltip
              contentStyle={{
                background: 'rgba(13, 27, 38, 0.95)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                color: '#fff',
              }}
              formatter={(v) => formatCurrency(Number(v))}
            />
            <Bar dataKey="income"  fill="#1D9E75" radius={[4, 4, 0, 0]} name="Доходы"  maxBarSize={32} />
            <Bar dataKey="expense" fill="#E24B4A" radius={[4, 4, 0, 0]} name="Расходы" maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Pie + category list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4">Расходы по категориям</h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-white/55 text-center py-8">Нет данных</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-white/70">{v}</span>} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-white mb-4">Топ категорий расходов</h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-white/55 text-center py-8">Нет данных</p>
          ) : (
            <div className="space-y-3">
              {pieData.map((cat, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2 text-white/85 font-medium">
                      {cat.icon} {cat.name}
                    </span>
                    <span className="text-white/70">{formatCurrency(cat.amount)}</span>
                  </div>
                  <div className="h-1.5 bg-white/12 rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                  <p className="text-xs text-white/50 mt-0.5 text-right">
                    {totalExpense > 0 ? Math.round((cat.amount / totalExpense) * 100) : 0}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
