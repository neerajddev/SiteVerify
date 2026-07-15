import React, { useState, useEffect } from 'react';
import AdminDashboard from '../components/AdminDashboard';
import PortalAuth from '../components/PortalAuth';
import { useAuth } from '../contexts/AuthContext';
import { getProjects, saveProject, normalizeProjectStages } from '../services/projectService';
import { getInspectors } from '../services/authService';
import { isDemoMode } from '../data/demoAccounts';
import { DEMO_USER_IDS } from '../services/demoAuthService';
import { DEMO_ACCOUNTS } from '../data/demoAccounts';

function AdminAppInner() {
  const { user, profile, session, signOut, completeLogin, demoLogin, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [data, inspectorList] = await Promise.all([
        getProjects(),
        getInspectors().catch(() => []),
      ]);
      setProjects(data.map(normalizeProjectStages));

      // Demo fallback if Supabase returned no inspector profiles
      const list =
        inspectorList?.length > 0
          ? inspectorList
          : isDemoMode()
            ? [
                {
                  id: DEMO_USER_IDS.inspector,
                  full_name: DEMO_ACCOUNTS.inspector.fullName,
                  phone: `+91${DEMO_ACCOUNTS.inspector.phone}`,
                },
              ]
            : [];
      setInspectors(list);

      const savedActiveId = localStorage.getItem('siteverify_admin_active_id');
      if (savedActiveId && data.some((p) => p.id === savedActiveId)) {
        setActiveProjectId(savedActiveId);
      } else if (data.length > 0) {
        setActiveProjectId(data[0].id);
      }
    } catch (err) {
      console.error('[SiteVerify Admin] Load failed:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      loadData();
    }
  }, [user, profile]);

  useEffect(() => {
    const reload = () => {
      if (user && profile?.role === 'admin') loadData();
    };
    const onStorage = (e) => {
      if (e.key === 'siteverify_projects') reload();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('siteverify-projects-updated', reload);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('siteverify-projects-updated', reload);
    };
  }, [user, profile]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    // Auth succeeded but no profiles row (schema/trigger missing) — explain instead of silent loop
    if (session?.user && !profile) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4 text-center">
            <h1 className="text-lg font-black text-white">Profile missing</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Login worked, but the app cannot read your row in <code className="text-teal-300">profiles</code>.
              In Supabase SQL Editor, run the checks below, then click <strong className="text-white">Reload profile</strong>.
            </p>
            <code className="block text-left text-[11px] bg-slate-950 border border-slate-700 rounded-lg p-3 text-teal-300 overflow-x-auto whitespace-pre-wrap">
              {`-- 1) Confirm auth user exists
SELECT id, email FROM auth.users WHERE email = 'admin1@siteverify.com';

-- 2) Create / promote admin profile
INSERT INTO public.profiles (id, email, full_name, role)
SELECT id, email, 'Site Admin', 'admin'
FROM auth.users
WHERE email = 'admin1@siteverify.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin', email = EXCLUDED.email;

-- 3) Must return role = admin
SELECT id, email, role FROM public.profiles WHERE email = 'admin1@siteverify.com';`}
            </code>
            <button
              type="button"
              onClick={() => completeLogin()}
              className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-900 text-sm font-black"
            >
              Reload profile
            </button>
            <button
              type="button"
              onClick={signOut}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold"
            >
              Sign out
            </button>
          </div>
        </div>
      );
    }
    return (
      <PortalAuth
        portal="admin"
        onAuthenticated={completeLogin}
        onDemoLogin={demoLogin}
      />
    );
  }

  if (profile?.role !== 'admin') {
    return (
      <PortalAuth
        portal="admin"
        userRole={profile?.role}
        onSignOut={signOut}
      />
    );
  }

  const handleSelectActiveProject = (id) => {
    setActiveProjectId(id);
    localStorage.setItem('siteverify_admin_active_id', id);
  };

  const handleUpdateProjects = async (updatedProjects) => {
    setProjects(updatedProjects);
    for (const p of updatedProjects) {
      await saveProject(p);
    }
    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="bg-slate-900 text-white border-b border-slate-850 px-4 py-3 z-50 sticky top-0 flex items-center justify-between gap-3 text-xs shadow-md">
        <span className="font-bold text-slate-100">Admin</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold"
          >
            Refresh
          </button>
          <button
            onClick={signOut}
          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold"
        >
          Log out
        </button>
        </div>
      </div>

      <main className="flex-1">
        <AdminDashboard
          projects={projects}
          onUpdateProjects={handleUpdateProjects}
          onSelectActiveProject={handleSelectActiveProject}
          activeProjectId={activeProjectId}
          inspectors={inspectors}
          currentUser={{
            id: user?.id || null,
            role: 'admin',
            full_name: profile?.full_name || 'Admin',
          }}
        />
      </main>
    </div>
  );
}

export default function AdminApp() {
  return <AdminAppInner />;
}
