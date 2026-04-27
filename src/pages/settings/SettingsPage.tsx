import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Mail, Target, Home, Car, TrendingUp,
  FileUp, Wallet, CreditCard, BarChart3, ChevronRight,
  LogOut, Trash2, Check, X,
} from 'lucide-react';
import { useAuthStore } from '@/entities/user';
import { useProfile, useUpsertProfile } from '@/entities/profile';
import { signOut } from '@/features/auth';
import { Button, Card, Input, Modal, Skeleton } from '@/shared/ui';
import { formatCurrency } from '@/shared/lib/formatCurrency';
import { cn } from '@/shared/lib/cn';

const GOAL_LABELS: Record<string, string> = {
  control:   'Контроль расходов',
  save:      'Накопления',
  pay_debts: 'Погашение долгов',
  invest:    'Инвестиции',
};

const HOUSING_LABELS: Record<string, string> = {
  own:      'Собственное жильё',
  rent:     'Аренда',
  mortgage: 'Ипотека',
};

function Avatar({ email }: { email: string }) {
  const initials = email.slice(0, 2).toUpperCase();
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1D9E75]/20 text-xl font-bold text-[#5DCAA5] ring-2 ring-[#1D9E75]/30">
      {initials}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">{children}</h3>;
}

function RowLink({ icon: Icon, label, value, to }: { icon: React.ElementType; label: string; value?: string; to: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-white/6"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/8 text-white/60">
        <Icon size={16} />
      </div>
      <span className="flex-1 text-sm text-white/85">{label}</span>
      {value && <span className="mr-1 text-sm text-white/45">{value}</span>}
      <ChevronRight size={14} className="text-white/30" />
    </Link>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useProfile(user?.id);
  const upsertMutation = useUpsertProfile();

  const [editOpen, setEditOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [incomeInput, setIncomeInput] = useState('');
  const [goalInput, setGoalInput] = useState<string>('');

  const openEdit = () => {
    setIncomeInput(profile?.monthly_income?.toString() ?? '');
    setGoalInput(profile?.financial_goal ?? '');
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!user) return;
    upsertMutation.mutate({
      id: user.id,
      monthly_income: incomeInput ? parseFloat(incomeInput) : null,
      financial_goal: (goalInput as 'control' | 'save' | 'pay_debts' | 'invest') || null,
    }, {
      onSuccess: () => setEditOpen(false),
    });
  };

  const logoutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      queryClient.clear();
      navigate('/auth/login');
    },
  });

  const email = user?.email ?? '';

  return (
    <div className="mx-auto max-w-lg space-y-6 text-white">
      {/* Profile card */}
      <Card>
        {isLoading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <Avatar email={email} />
            <div className="flex-1 min-w-0">
              <p className="truncate font-semibold text-white">{email}</p>
              {profile?.financial_goal && (
                <span className="mt-1 inline-block rounded-full bg-[#1D9E75]/15 px-2.5 py-0.5 text-xs font-medium text-[#5DCAA5]">
                  {GOAL_LABELS[profile.financial_goal]}
                </span>
              )}
              {profile?.monthly_income && (
                <p className="mt-1.5 text-sm text-white/55">
                  Доход: {formatCurrency(profile.monthly_income)} / мес
                </p>
              )}
            </div>
            <button
              onClick={openEdit}
              className="shrink-0 rounded-xl border border-white/15 px-3 py-1.5 text-xs font-medium text-white/65 transition-colors hover:border-white/30 hover:text-white"
            >
              Изменить
            </button>
          </div>
        )}
      </Card>

      {/* Financial profile */}
      {profile && (profile.housing_type || profile.has_car) && (
        <div>
          <SectionTitle>Финансовый профиль</SectionTitle>
          <Card padding="sm" className="divide-y divide-white/8">
            {profile.housing_type && (
              <div className="flex items-center gap-3 px-2 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8 text-white/60">
                  <Home size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white/85">{HOUSING_LABELS[profile.housing_type]}</p>
                  {profile.housing_monthly_cost && (
                    <p className="text-xs text-white/45">{formatCurrency(profile.housing_monthly_cost)} / мес</p>
                  )}
                </div>
              </div>
            )}
            {profile.has_car && (
              <div className="flex items-center gap-3 px-2 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8 text-white/60">
                  <Car size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white/85">Автомобиль</p>
                  {profile.car_monthly_cost && (
                    <p className="text-xs text-white/45">{formatCurrency(profile.car_monthly_cost)} / мес</p>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Data */}
      <div>
        <SectionTitle>Данные и импорт</SectionTitle>
        <Card padding="sm" className="divide-y divide-white/8">
          <RowLink icon={FileUp} label="Импорт выписки Kaspi" to="/settings/import" />
          <RowLink icon={Wallet} label="Счета" to="/accounts" />
          <RowLink icon={CreditCard} label="Кредиты и долги" to="/credits" />
          <RowLink icon={TrendingUp} label="Инвестиции" to="/investments" />
          <RowLink icon={BarChart3} label="Аналитика" to="/analytics" />
        </Card>
      </div>

      {/* Account */}
      <div>
        <SectionTitle>Аккаунт</SectionTitle>
        <Card padding="sm" className="divide-y divide-white/8">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/8 text-white/60">
              <Mail size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/45">Email</p>
              <p className="truncate text-sm text-white/85">{email}</p>
            </div>
          </div>

          <button
            onClick={() => setLogoutOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-[#E24B4A]/8"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E24B4A]/12 text-[#E24B4A]">
              <LogOut size={16} />
            </div>
            <span className="text-sm font-medium text-[#E24B4A]">Выйти</span>
          </button>
        </Card>
      </div>

      {/* App info */}
      <p className="pb-4 text-center text-xs text-white/25">
        Bonssai · Умный учёт финансов
      </p>

      {/* Edit profile modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Редактировать профиль">
        <div className="space-y-4">
          <Input
            label="Ежемесячный доход (₸)"
            type="number"
            placeholder="300 000"
            value={incomeInput}
            onChange={e => setIncomeInput(e.target.value)}
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">Финансовая цель</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(GOAL_LABELS) as [string, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setGoalInput(key)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                    goalInput === key
                      ? 'border-[#5DCAA5] bg-[#5DCAA5]/12 text-white'
                      : 'border-white/15 text-white/65 hover:border-white/30'
                  )}
                >
                  {goalInput === key && <Check size={14} className="shrink-0 text-[#5DCAA5]" />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <Button variant="secondary" className="flex-1" onClick={() => setEditOpen(false)}>
              Отмена
            </Button>
            <Button
              className="flex-1"
              loading={upsertMutation.isPending}
              onClick={handleSave}
            >
              Сохранить
            </Button>
          </div>
        </div>
      </Modal>

      {/* Logout confirmation */}
      <Modal open={logoutOpen} onClose={() => setLogoutOpen(false)} title="Выйти из аккаунта?">
        <div className="space-y-4">
          <p className="text-sm text-white/65">Вы будете перенаправлены на страницу входа.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" className="flex-1" onClick={() => setLogoutOpen(false)}>
              <X size={16} />
              Отмена
            </Button>
            <Button
              className="flex-1 bg-[#E24B4A] hover:bg-[#c43c3b]"
              loading={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut size={16} />
              Выйти
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
