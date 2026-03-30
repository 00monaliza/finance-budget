import { useEffect, type ReactNode } from 'react';
import { supabase } from '@/shared/api/supabase';
import { useAuthStore } from '@/entities/user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setSession, setLoading } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setLoading]);

  return <>{children}</>;
}
