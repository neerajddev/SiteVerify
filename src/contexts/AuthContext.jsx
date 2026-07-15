import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { getProfile, signOut as authSignOut } from '../services/authService';
import {
  canUseDemoBypass,
  clearDemoSession,
  demoLogin as saveDemoLogin,
  getCurrentPortal,
  isDemoBypassActive,
  loadDemoSession,
} from '../services/demoAuthService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [demoProfile, setDemoProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const portal = getCurrentPortal();

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }
    try {
      const data = await getProfile(userId);
      setProfile(data);
      return data;
    } catch (err) {
      console.error('[SiteVerify Auth] Failed to load profile:', err);
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    if (canUseDemoBypass() && portal) {
      const saved = loadDemoSession(portal);
      if (saved) {
        setDemoProfile(saved);
        setLoading(false);
        return;
      }
    }

    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (canUseDemoBypass() && portal && loadDemoSession(portal)) return;
      setSession(nextSession);
      if (nextSession?.user) {
        loadProfile(nextSession.user.id);
        if (mounted) setLoading(false);
      } else {
        setProfile(null);
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile, portal]);

  const refreshProfile = useCallback(async () => {
    if (demoProfile) return demoProfile;
    if (session?.user) return loadProfile(session.user.id);
    return null;
  }, [session, demoProfile, loadProfile]);

  const completeLogin = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session?.user) {
      return loadProfile(data.session.user.id);
    }
    return null;
  }, [loadProfile]);

  const loginWithDemoBypass = useCallback((portalKey) => {
    const saved = saveDemoLogin(portalKey);
    if (saved) {
      setDemoProfile(saved);
      setSession(null);
      setProfile(null);
    }
    return saved;
  }, []);

  const signOut = useCallback(async () => {
    const p = getCurrentPortal();
    if (demoProfile || isDemoBypassActive()) {
      clearDemoSession(p);
      setDemoProfile(null);
      return;
    }
    await authSignOut();
    setSession(null);
    setProfile(null);
  }, [demoProfile]);

  const activeProfile = demoProfile || profile;
  const activeUser = demoProfile
    ? { id: demoProfile.id, email: demoProfile.email, phone: demoProfile.phone }
    : session?.user ?? null;

  const value = {
    session: demoProfile ? { demo: true } : session,
    user: activeUser,
    profile: activeProfile,
    loading,
    isAuthenticated: !!activeProfile,
    isDemoBypass: !!demoProfile,
    refreshProfile,
    completeLogin,
    demoLogin: loginWithDemoBypass,
    signOut,
    isSupabaseAuth: isSupabaseConfigured && !demoProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
