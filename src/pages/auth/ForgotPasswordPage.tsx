import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { requestPasswordReset } from '@/features/auth';
import { ParticleBackground } from '@/shared/ui';

const schema = z.object({
  email: z.string().email('Введите корректный email'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ email }: FormData) => {
    try {
      setError('');
      await requestPasswordReset(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить письмо для сброса');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0d1b26] px-4">
      <ParticleBackground />
      <div className="pointer-events-none absolute -left-20 top-[-80px] h-64 w-64 rounded-full bg-[#5DCAA5]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-[#DA7B93]/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
        <div className="mb-6 text-center sm:mb-8">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Восстановление пароля</h1>
          <p className="mt-2 text-white/65">Введите email и мы отправим ссылку для сброса.</p>
        </div>

        {success ? (
          <div className="space-y-5 text-center">
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Письмо отправлено. Проверьте входящие и папку Спам.
            </div>
            <Link to="/auth/login" className="font-medium text-[#DA7B93] hover:underline">
              Вернуться ко входу
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-white placeholder:text-white/35 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#5DCAA5]"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
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
              {isSubmitting ? 'Отправляем...' : 'Отправить ссылку'}
            </button>
          </form>
        )}

        {!success && (
          <p className="mt-6 text-center text-sm text-white/65">
            Вспомнили пароль?{' '}
            <Link to="/auth/login" className="font-medium text-[#DA7B93] hover:underline">
              Войти
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
