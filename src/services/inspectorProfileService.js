import { isDemoMode } from '../data/demoAccounts';
import { DEMO_USER_IDS } from './demoAuthService';
import {
  getDefaultInspectorProfile,
  buildDemoInspectorProfile,
  VERIFICATION_STATUS,
} from '../data/inspectorProfile';

const STORAGE_KEY = 'siteverify_inspector_profiles';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function loadInspectorProfile(inspectorId, fullName = 'Inspector') {
  if (!inspectorId) return getDefaultInspectorProfile('', fullName);

  const all = readAll();
  if (all[inspectorId]) return all[inspectorId];

  if (isDemoMode() && inspectorId === DEMO_USER_IDS.inspector) {
    const demo = buildDemoInspectorProfile(inspectorId, fullName);
    all[inspectorId] = demo;
    writeAll(all);
    return demo;
  }

  return getDefaultInspectorProfile(inspectorId, fullName);
}

export function saveInspectorProfile(profile) {
  if (!profile?.inspectorId) return profile;
  const all = readAll();
  const updated = { ...profile, updatedAt: new Date().toISOString() };
  all[profile.inspectorId] = updated;
  writeAll(all);
  return updated;
}

export function submitInspectorProfileForReview(profile) {
  const updated = saveInspectorProfile({
    ...profile,
    verificationStatus: VERIFICATION_STATUS.PENDING,
    submittedAt: new Date().toISOString(),
    adminNote: '',
  });
  return updated;
}

export function listInspectorProfilesForAdmin() {
  return Object.values(readAll());
}
