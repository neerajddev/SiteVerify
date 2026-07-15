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
  const { user, profile, signOut, completeLogin, demoLogin, loading: authLoading } = useAuth();
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
