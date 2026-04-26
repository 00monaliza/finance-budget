import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { updatePassword } from '@/features/auth';
import { ParticleBackground } from '@/shared/ui';

const schema = z.object({
  password: z.string().min(6, 'Минимум 6 символов'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Пароли не совпадают',
});

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ password }: FormData) => {
    try {
      setError('');
      await updatePassword(password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить пароль');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0d1b26] px-4">
      <ParticleBackground />
      <div className="pointer-events-none absolute -left-20 top-[-80px] h-64 w-64 rounded-full bg-[#5DCAA5]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-[#DA7B93]/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
        <div className="mb-6 text-center sm:mb-8">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Новый пароль</h1>
          <p className="mt-2 text-white/65">Введите новый пароль для вашего аккаунта.</p>
        </div>

        {success ? (
          <div className="space-y-5 text-center">
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Пароль успешно обновлён.
            </div>
            <Link to="/auth/login" className="font-medium text-[#DA7B93] hover:underline">
              Войти с новым паролем
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">Новый пароль</label>
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
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
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
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#5DCAA5] py-2.5 font-medium text-[#0d1b26] transition-colors hover:bg-[#71d9b6] disabled:opacity-60"
            >
              {isSubmitting ? 'Сохраняем...' : 'Сохранить пароль'}
            </button>
          </form>
        )}

        {!success && (
          <p className="mt-6 text-center text-sm text-white/65">
            Нет письма?{' '}
            <Link to="/auth/forgot-password" className="font-medium text-[#DA7B93] hover:underline">
              Запросить новую ссылку
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
