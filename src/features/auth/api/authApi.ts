import { supabase } from '@/shared/api/supabase';
import { env } from '@/shared/config/env';

function normalizeAuthError(error: unknown): Error {
  const message = error instanceof Error ? error.message : 'Ошибка авторизации';
  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials')) {
    return new Error('Неверный email или пароль. Если вы только зарегистрировались, сначала подтвердите почту.');
  }

  if (lower.includes('email not confirmed')) {
    return new Error('Почта не подтверждена. Проверьте входящие и спам, затем попробуйте снова.');
  }

  if (lower.includes('auth session missing')) {
    return new Error('Ссылка для сброса пароля недействительна или истекла. Запросите новую ссылку.');
  }

  return new Error(message);
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw normalizeAuthError(error);
  return data;
}

export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${env.APP_URL}/auth/login`,
    },
  });
  if (error) throw normalizeAuthError(error);
  return data;
}

export async function resendConfirmation(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${env.APP_URL}/auth/login` },
  });

  if (error) throw normalizeAuthError(error);
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.APP_URL}/auth/reset-password`,
  });

  if (error) throw normalizeAuthError(error);
}

export async function updatePassword(password: string) {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw normalizeAuthError(error);
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
