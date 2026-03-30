import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { env } from '@/shared/config/env';

export const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
