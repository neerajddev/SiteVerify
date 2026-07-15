import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { DEMO_ACCOUNTS, isDemoMode } from '../data/demoAccounts';
import { DEMO_USER_IDS, isDemoBypassActive } from './demoAuthService';

export const ROLES = {
  HOMEOWNER: 'homeowner',
  INSPECTOR: 'inspector',
  ADMIN: 'admin',
};

/** Format 10-digit Indian mobile to E.164 (+91...) */
export function formatPhoneIndian(digits) {
  const d = digits.replace(/\D/g, '');
  const ten = d.length === 12 && d.startsWith('91') ? d.slice(2) : d.slice(-10);
  if (ten.length !== 10 || !/^[6-9]/.test(ten)) return null;
  return `+91${ten}`;
}

export async function sendPhoneOtp({ phone, fullName, role }) {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Restart the app (npm run dev) so .env loads, or use Enter demo while testing.'
    );
  }

  const { data, error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      shouldCreateUser: true,
      data: { full_name: fullName || '', role },
    },
  });

  if (error) throw error;
  return data;
}

export async function verifyPhoneOtp({ phone, token }) {
  if (!supabase) throw new Error('Supabase is not configured');

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token: token.replace(/\D/g, ''),
    type: 'sms',
  });

  if (error) throw error;
  return data;
}

/**
 * Ensure a profiles row exists for this user.
 * Used after phone OTP — trigger can miss role on first login.
 */
export async function ensureProfile({ userId, role, fullName, phone, email }) {
  if (!supabase || !userId) return null;

  const existing = await getProfile(userId);
  if (existing) return existing;

  const safeRole =
    role === ROLES.INSPECTOR || role === ROLES.HOMEOWNER ? role : ROLES.HOMEOWNER;

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      role: safeRole,
      full_name: fullName || '',
      phone: phone || null,
      email: email || null,
    })
    .select('id, email, phone, full_name, role, created_at')
    .maybeSingle();

  if (error) {
    // Concurrent insert / already exists
    console.warn('[SiteVerify Auth] ensureProfile insert:', error.message);
    return getProfile(userId);
  }
  return data;
}

export async function signIn({ email, password }) {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Restart the app (npm run dev) so .env loads, or use Enter demo while testing.'
    );
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const msg = error.message || '';
    if (/email not confirmed/i.test(msg)) {
      throw new Error(
        'Email confirmation is still required in Supabase. Turn off Confirm email (Auth → Providers → Email), or mark this user as confirmed.'
      );
    }
    if (/invalid login credentials/i.test(msg)) {
      throw new Error('Wrong email or password');
    }
    throw error;
  }
  return data;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getProfile(userId) {
  if (!supabase || !userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, phone, full_name, role, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Collapse duplicate inspector rows (same phone / same name from repeated OTP signups). */
function dedupeInspectors(list) {
  const byPhone = new Map();
  const byName = new Map();

  (list || []).forEach((ins) => {
    const phone = String(ins.phone || '')
      .replace(/\D/g, '')
      .slice(-10);
    if (phone.length === 10) {
      const prev = byPhone.get(phone);
      if (!prev || new Date(ins.created_at || 0) >= new Date(prev.created_at || 0)) {
        byPhone.set(phone, ins);
      }
      return;
    }
    const key = String(ins.full_name || '')
      .trim()
      .toLowerCase();
    if (!key) return;
    const prev = byName.get(key);
    if (!prev || new Date(ins.created_at || 0) >= new Date(prev.created_at || 0)) {
      byName.set(key, ins);
    }
  });

  return [...byPhone.values(), ...byName.values()].sort((a, b) =>
    String(a.full_name || '').localeCompare(String(b.full_name || ''))
  );
}

export async function getInspectors() {
  // Prefer live Supabase profiles whenever configured (real OTP inspectors).
  // Demo list only when bypassing auth or Supabase is unavailable.
  if (isSupabaseConfigured && supabase && !isDemoBypassActive()) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, created_at')
        .eq('role', ROLES.INSPECTOR)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const live = dedupeInspectors(data || []);
      if (live.length > 0) return live;
    } catch (e) {
      console.warn('[SiteVerify] getInspectors via Supabase failed:', e.message);
    }
  }

  if (isDemoBypassActive() || isDemoMode()) {
    return [
      {
        id: DEMO_USER_IDS.inspector,
        full_name: DEMO_ACCOUNTS.inspector.fullName,
        email: null,
        phone: `+91${DEMO_ACCOUNTS.inspector.phone}`,
      },
    ];
  }

  return [];
}

export function isAuthConfigured() {
  return isSupabaseConfigured;
}
