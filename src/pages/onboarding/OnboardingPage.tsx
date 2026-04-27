'use client';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/entities/user';
import { useUpsertProfile } from '@/entities/profile';
import { supabase } from '@/shared/api/supabase';
import { cn } from '@/shared/lib/cn';

interface StepData {
  monthly_income?: number;
  housing_type?: 'own' | 'rent' | 'mortgage';
  housing_monthly_cost?: number;
  mortgage_remaining?: number;
  has_credits?: boolean;
  credits_monthly_total?: number;
  has_car?: boolean;
  car_monthly_cost?: number;
  financial_goal?: 'control' | 'save' | 'pay_debts' | 'invest';
}

const STEPS = [
  {
    id: 'income',
    title: 'Ваш ежемесячный доход',
    subtitle: 'Чистый доход после налогов',
    type: 'number' as const,
    field: 'monthly_income',
    placeholder: '500 000',
    suffix: '₸',
  },
  {
    id: 'housing',
    title: 'Тип жилья',
    subtitle: 'Выберите вашу ситуацию',
    type: 'select' as const,
    field: 'housing_type',
    options: [
      { value: 'own', label: '🏠 Собственное жильё', hasAmount: false },
      { value: 'rent', label: '🔑 Аренда', hasAmount: true, amountLabel: 'Сумма аренды/мес', amountField: 'housing_monthly_cost' },
      { value: 'mortgage', label: '🏦 Ипотека', hasAmount: true, amountLabel: 'Платёж/мес', amountField: 'housing_monthly_cost', hasExtra: true, extraLabel: 'Остаток долга', extraField: 'mortgage_remaining' },
    ],
  },
  {
    id: 'car',
    title: 'Есть ли у вас автомобиль?',
    subtitle: 'Топливо, страховка, обслуживание в месяц',
    type: 'toggle_number' as const,
    field: 'has_car',
    amountField: 'car_monthly_cost',
    placeholder: '60 000',
    suffix: '₸/мес',
  },
  {
    id: 'goal',
    title: 'Ваша главная финансовая цель',
    subtitle: 'Это поможет ИИ персонализировать советы',
    type: 'goal_select' as const,
    field: 'financial_goal',
    options: [
      { value: 'control', label: '📊 Контролировать расходы', desc: 'Знать куда уходят деньги' },
      { value: 'save', label: '💰 Накопить', desc: 'Создать подушку безопасности' },
      { value: 'pay_debts', label: '🎯 Закрыть долги', desc: 'Избавиться от кредитов быстрее' },
      { value: 'invest', label: '📈 Инвестировать', desc: 'Заставить деньги работать' },
    ],
  },
] as const;

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<StepData>({});
  const { user } = useAuthStore();
  const { mutateAsync: upsert, isPending } = useUpsertProfile();
  const navigate = useNavigate();

  const currentStep = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    await upsert({
      id: user.id,
      monthly_income: data.monthly_income ?? null,
      housing_type: data.housing_type ?? null,
      housing_monthly_cost: data.housing_monthly_cost ?? null,
      mortgage_remaining: data.mortgage_remaining ?? null,
      has_car: data.has_car ?? false,
      car_monthly_cost: data.car_monthly_cost ?? null,
      financial_goal: data.financial_goal ?? null,
      onboarding_completed: true,
    });

    await supabase.from('accounts').insert({
      user_id: user.id,
      name: 'Основной счёт',
      type: 'card',
      balance: 0,
      currency: 'KZT',
      color: '#376E6F',
      icon: '💳',
    });

    navigate('/dashboard');
  };

  const update = (updates: Partial<StepData>) =>
    setData(prev => ({ ...prev, ...updates }));

  return (
    <div className="min-h-screen bg-[#1C3334] flex flex-col items-center justify-center p-6">
      {/* Progress */}
      <div className="w-full max-w-md mb-8">
        <div className="flex justify-between text-xs text-[#DA7B93] mb-2">
          <span>Настройка профиля</span>
          <span>{step + 1} / {STEPS.length}</span>
        </div>
        <div className="h-1 bg-[#2F4454] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#DA7B93] rounded-full transition-all duration-400"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-[#2F4454] rounded-2xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-2">{currentStep.title}</h2>
        <p className="text-[#DA7B93] text-sm mb-6">{currentStep.subtitle}</p>

        <StepInput step={currentStep as never} data={data} onChange={update} />

        <button
          onClick={handleNext}
          disabled={isPending}
          className="mt-8 w-full py-3 bg-[#DA7B93] text-white font-semibold rounded-xl hover:bg-[#c96a82] transition-colors disabled:opacity-50"
        >
          {step === STEPS.length - 1
            ? isPending ? 'Сохранение...' : 'Начать работу →'
            : 'Далее →'}
        </button>

        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="mt-3 w-full py-2 text-[#DA7B93] text-sm hover:text-white transition-colors"
          >
            ← Назад
          </button>
        )}
      </div>
    </div>
  );
}

interface StepInputProps {
  step: typeof STEPS[number];
  data: StepData;
  onChange: (updates: Partial<StepData>) => void;
}

function StepInput({ step, data, onChange }: StepInputProps) {
  if (step.type === 'number') {
    return (
      <div className="relative">
        <input
          type="number"
          value={(data as Record<string, number>)[step.field] || ''}
          onChange={e => onChange({ [step.field]: Number(e.target.value) } as Partial<StepData>)}
          placeholder={step.placeholder}
          className="w-full bg-[#1C3334] text-white rounded-xl px-4 py-3 pr-10 outline-none focus:ring-2 focus:ring-[#DA7B93] text-lg"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#DA7B93] font-medium">
          {step.suffix}
        </span>
      </div>
    );
  }

  if (step.type === 'select' && 'options' in step) {
    const selected = (data as Record<string, string>)[step.field];
    return (
      <div className="space-y-3">
        {step.options.map(opt => (
          <div key={opt.value}>
            <button
              type="button"
              onClick={() => onChange({ [step.field]: opt.value } as Partial<StepData>)}
              className={cn(
                'w-full text-left px-4 py-3 rounded-xl border transition-colors',
                selected === opt.value
                  ? 'border-[#DA7B93] bg-[#DA7B93]/20 text-white'
                  : 'border-white/10 bg-[#1C3334] text-white/70 hover:border-white/30'
              )}
            >
              {opt.label}
            </button>
            {selected === opt.value && 'hasAmount' in opt && opt.hasAmount && (
              <div className="mt-2 space-y-2 pl-2">
                <input
                  type="number"
                  placeholder={opt.amountLabel}
                  value={(data as Record<string, number>)[opt.amountField] || ''}
                  onChange={e => onChange({ [opt.amountField]: Number(e.target.value) } as Partial<StepData>)}
                  className="w-full bg-[#1C3334] text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#DA7B93]"
                />
                {'hasExtra' in opt && opt.hasExtra && (
                  <input
                    type="number"
                    placeholder={opt.extraLabel}
                    value={(data as Record<string, number>)[opt.extraField] || ''}
                    onChange={e => onChange({ [opt.extraField]: Number(e.target.value) } as Partial<StepData>)}
                    className="w-full bg-[#1C3334] text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#DA7B93]"
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (step.type === 'toggle_number') {
    const isYes = (data as Record<string, boolean>)[step.field];
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          {[{ v: true, l: '✅ Да' }, { v: false, l: '❌ Нет' }].map(({ v, l }) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => onChange({ [step.field]: v } as Partial<StepData>)}
              className={cn(
                'flex-1 py-3 rounded-xl border font-medium transition-colors',
                isYes === v
                  ? 'border-[#DA7B93] bg-[#DA7B93]/20 text-white'
                  : 'border-white/10 bg-[#1C3334] text-white/70 hover:border-white/30'
              )}
            >
              {l}
            </button>
          ))}
        </div>
        {isYes && 'amountField' in step && (
          <div className="relative">
            <input
              type="number"
              value={(data as Record<string, number>)[step.amountField] || ''}
              onChange={e => onChange({ [step.amountField]: Number(e.target.value) } as Partial<StepData>)}
              placeholder={step.placeholder}
              className="w-full bg-[#1C3334] text-white rounded-xl px-4 py-3 pr-16 outline-none focus:ring-2 focus:ring-[#DA7B93]"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#DA7B93] text-sm">
              {step.suffix}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (step.type === 'goal_select' && 'options' in step) {
    const selected = (data as Record<string, string>)[step.field];
    return (
      <div className="space-y-3">
        {step.options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange({ [step.field]: opt.value } as Partial<StepData>)}
            className={cn(
              'w-full text-left px-4 py-3.5 rounded-xl border transition-colors',
              selected === opt.value
                ? 'border-[#DA7B93] bg-[#DA7B93]/20 text-white'
                : 'border-white/10 bg-[#1C3334] text-white/70 hover:border-white/30'
            )}
          >
            <div className="font-medium">{opt.label}</div>
            {'desc' in opt && (
              <div className="text-xs mt-0.5 opacity-70">{opt.desc}</div>
            )}
          </button>
        ))}
      </div>
    );
  }

  return null;
}
