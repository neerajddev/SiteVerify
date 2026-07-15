import { DEMO_ACCOUNTS, isDemoMode } from '../data/demoAccounts';

const SESSION_PREFIX = 'siteverify_demo_session_';

/** Fixed demo user IDs — shared across portals via localStorage projects */
export const DEMO_USER_IDS = {
  homeowner: 'demo-user-homeowner-001',
  inspector: 'demo-user-inspector-001',
  admin: 'demo-user-admin-001',
};

function buildDemoProfile(portal) {
  if (portal === 'homeowner') {
    return {
      id: DEMO_USER_IDS.homeowner,
      email: null,
      phone: `+91${DEMO_ACCOUNTS.homeowner.phone}`,
      full_name: DEMO_ACCOUNTS.homeowner.fullName,
      role: 'homeowner',
    };
  }
  if (portal === 'inspector') {
    return {
      id: DEMO_USER_IDS.inspector,
      email: null,
      phone: `+91${DEMO_ACCOUNTS.inspector.phone}`,
      full_name: DEMO_ACCOUNTS.inspector.fullName,
      role: 'inspector',
    };
  }
  if (portal === 'admin') {
    return {
      id: DEMO_USER_IDS.admin,
      email: DEMO_ACCOUNTS.admin.email,
      phone: null,
      full_name: 'Site Admin',
      role: 'admin',
    };
  }
  return null;
}

export function isLocalhost() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

/** Instant demo login (no OTP) when VITE_DEMO_MODE=true — set false in production. */
export function canUseDemoBypass() {
  return isDemoMode();
}

export function getCurrentPortal() {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname;
  if (path.includes('freelancer')) return 'inspector';
  if (path.includes('admin')) return 'admin';
  if (path.includes('homeowner')) return 'homeowner';
  return null;
}

export function saveDemoSession(portal) {
  if (!canUseDemoBypass() || !portal) return null;
  const profile = buildDemoProfile(portal);
  if (!profile) return null;
  localStorage.setItem(`${SESSION_PREFIX}${portal}`, JSON.stringify(profile));
  return profile;
}

export function loadDemoSession(portal) {
  if (!canUseDemoBypass() || !portal) return null;
  try {
    const raw = localStorage.getItem(`${SESSION_PREFIX}${portal}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearDemoSession(portal) {
  if (!portal) return;
  localStorage.removeItem(`${SESSION_PREFIX}${portal}`);
}

export function clearAllDemoSessions() {
  ['homeowner', 'inspector', 'admin'].forEach(clearDemoSession);
}

export function isDemoBypassActive() {
  const portal = getCurrentPortal();
  return canUseDemoBypass() && !!loadDemoSession(portal);
}

export function demoLogin(portal) {
  return saveDemoSession(portal);
}
