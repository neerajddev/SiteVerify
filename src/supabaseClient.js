import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const cleanUrl = supabaseUrl.trim().replace(/^"(.*)"$/, '$1');
const cleanKey = supabaseAnonKey.trim().replace(/^"(.*)"$/, '$1');

export const isSupabaseConfigured = !!(
  cleanUrl &&
  cleanKey &&
  cleanUrl !== 'your_supabase_project_url' &&
  cleanKey !== 'your_supabase_anon_public_key'
);

/** Each portal keeps its own session — reopen app without OTP */
function getAuthStorageKey() {
  if (typeof window === 'undefined') return 'siteverify-auth';
  const path = window.location.pathname;
  if (path.includes('freelancer')) return 'siteverify-auth-inspector';
  if (path.includes('admin')) return 'siteverify-auth-admin';
  if (path.includes('homeowner')) return 'siteverify-auth-homeowner';
  return 'siteverify-auth';
}

export const supabase = isSupabaseConfigured
  ? createClient(cleanUrl, cleanKey, {
      auth: {
        storageKey: getAuthStorageKey(),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
