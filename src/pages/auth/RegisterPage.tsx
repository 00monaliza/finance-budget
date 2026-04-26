import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { signUp } from '@/features/auth';
import { ParticleBackground } from '@/shared/ui';

const schema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      await signUp(data.email, data.password, data.name);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации');
    }
  };

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0d1b26] px-4">
        <ParticleBackground />
        <div className="pointer-events-none absolute -left-20 top-[-80px] h-64 w-64 rounded-full bg-[#5DCAA5]/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-[#DA7B93]/20 blur-3xl" />

        <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] p-5 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="mb-2 text-xl font-bold text-white">Проверьте почту</h2>
          <p className="text-white/65">Мы отправили письмо с подтверждением на ваш email.</p>
          <Link to="/auth/login" className="mt-6 block font-medium text-[#DA7B93] hover:underline">
            Войти
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0d1b26] px-4">
      <ParticleBackground />
      <div className="pointer-events-none absolute -left-20 top-[-80px] h-64 w-64 rounded-full bg-[#5DCAA5]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-[#DA7B93]/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
        <div className="mb-6 text-center sm:mb-8">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">FinanceAI</h1>
          <p className="mt-2 text-white/65">Создайте аккаунт</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-white/80">Имя</label>
            <input
              {...register('name')}
              type="text"
              placeholder="Ваше имя"
              className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-white placeholder:text-white/35 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

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
            <label className="mb-1 block text-sm font-medium text-white/80">Пароль</label>
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

          <div>
            <label className="mb-1 block text-sm font-medium text-white/80">Подтвердите пароль</label>
            <div className="relative">
              <input
                {...register('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••"
                className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 pr-28 text-white placeholder:text-white/35 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-white/70 transition-colors hover:text-white"
              >
                {showConfirmPassword ? 'Скрыть' : 'Показать'}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#5DCAA5] py-2.5 font-medium text-[#0d1b26] transition-colors hover:bg-[#71d9b6] disabled:opacity-60"
          >
            {isSubmitting ? 'Регистрируем...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/65">
          Уже есть аккаунт?{' '}
          <Link to="/auth/login" className="font-medium text-[#DA7B93] hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
