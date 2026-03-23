import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// True singleton — created once, reused everywhere
let client: SupabaseClient | null = null;

export function createSupabaseBrowserClient(): SupabaseClient {
  if (client) return client;
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'bunnix-auth',
      autoRefreshToken: true,
      flowType: 'pkce',
    },
    global: {
      fetch: fetch.bind(globalThis),
    },
  });
  return client;
}

export function createSupabaseAdminClient(): SupabaseClient {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
