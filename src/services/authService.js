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
  if (!supabase) throw new Error('Supabase is not configured');

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

export async function signIn({ email, password }) {
  if (!supabase) throw new Error('Supabase is not configured');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
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

export async function getInspectors() {
  if (isDemoBypassActive() || isDemoMode()) {
    return [
      {
        id: DEMO_USER_IDS.inspector,
        full_name: DEMO_ACCOUNTS.inspector.fullName,
        email: null,
        phone: `+91${DEMO_ACCOUNTS.inspector.phone}`,
      },
      {
        id: 'demo-user-inspector-002',
        full_name: 'Biju Varghese',
        email: null,
        phone: '+919876543212',
      },
    ];
  }

  if (!supabase) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone')
    .eq('role', ROLES.INSPECTOR)
    .order('full_name');

  if (error) throw error;
  return data || [];
}

export function isAuthConfigured() {
  return isSupabaseConfigured;
}
