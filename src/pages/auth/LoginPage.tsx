import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { resendConfirmation, signIn } from '@/features/auth';
import { ParticleBackground } from '@/shared/ui';

const schema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      setInfo('');
      await signIn(data.email, data.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    }
  };

  const onResendConfirm = async () => {
    const email = watch('email')?.trim();
    if (!email) {
      setError('Введите email, чтобы отправить письмо подтверждения.');
      return;
    }

    try {
      setError('');
      setInfo('');
      await resendConfirmation(email);
      setInfo('Письмо отправлено повторно. Проверьте входящие и папку Спам.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить письмо подтверждения');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0d1b26] px-4">
      <ParticleBackground />
      <div className="pointer-events-none absolute -left-20 top-[-80px] h-64 w-64 rounded-full bg-[#5DCAA5]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-[#DA7B93]/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">FinanceAI</h1>
          <p className="mt-2 text-white/65">Войдите в свой аккаунт</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-white/80">Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-white placeholder:text-white/35 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-white/80">Пароль</label>
              <Link to="/auth/forgot-password" className="text-xs font-medium text-[#DA7B93] hover:underline">
                Забыли пароль?
              </Link>
            </div>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••"
                className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 pr-28 text-white placeholder:text-white/35 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-white/70 transition-colors hover:text-white"
              >
                {showPassword ? 'Скрыть' : 'Показать'}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          {info && (
            <div className="bg-emerald-50 text-emerald-700 text-sm px-4 py-2.5 rounded-xl">
              {info}
            </div>
          )}

          {error.toLowerCase().includes('подтвердите почту') && (
            <button
              type="button"
              onClick={onResendConfirm}
              className="w-full rounded-xl border border-[#5DCAA5]/50 bg-transparent py-2.5 text-sm font-medium text-[#5DCAA5] transition-colors hover:bg-[#5DCAA5]/10"
            >
              Отправить письмо подтверждения снова
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#5DCAA5] py-2.5 font-medium text-[#0d1b26] transition-colors hover:bg-[#71d9b6] disabled:opacity-60"
          >
            {isSubmitting ? 'Входим...' : 'Войти'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/65">
          Нет аккаунта?{' '}
          <Link to="/auth/register" className="font-medium text-[#DA7B93] hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
