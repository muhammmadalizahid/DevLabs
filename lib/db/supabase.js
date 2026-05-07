import { createClient } from '@supabase/supabase-js';

// Lazy getters — only throw at runtime when env vars are actually needed,
// not at build time when Next.js statically analyses the module graph.

let _admin = null;
let _client = null;

export function getSupabaseAdmin() {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    _admin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _admin;
}

export function getSupabaseClient() {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
    _client = createClient(url, key);
  }
  return _client;
}

// Convenience aliases used throughout codebase
export const supabaseAdmin = new Proxy({}, {
  get(_, prop) { return getSupabaseAdmin()[prop]; },
});

export const supabaseClient = new Proxy({}, {
  get(_, prop) { return getSupabaseClient()[prop]; },
});
