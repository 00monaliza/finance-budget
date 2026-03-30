import { createClient } from '@supabase/supabase-js';
import { env } from '@/shared/config/env';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
