/** Demo accounts — use with Supabase test phone numbers (no SMS cost) */
export const DEMO_ACCOUNTS = {
  homeowner: {
    phone: '9876543210',
    fullName: 'Suresh Nair',
    otp: '123456',
  },
  inspector: {
    phone: '9876543211',
    fullName: 'Arun Kumar',
    otp: '123456',
  },
  admin: {
    email: 'admin@siteverify.in',
    password: 'Demo@12345',
  },
};

export function isDemoMode() {
  return import.meta.env.VITE_DEMO_MODE === 'true';
}

export function getDemoAccount(portal) {
  if (!isDemoMode()) return null;
  return DEMO_ACCOUNTS[portal] || null;
}

export function isDemoPhone(phoneDigits) {
  const d = phoneDigits.replace(/\D/g, '').slice(-10);
  return (
    d === DEMO_ACCOUNTS.homeowner.phone ||
    d === DEMO_ACCOUNTS.inspector.phone
  );
}
