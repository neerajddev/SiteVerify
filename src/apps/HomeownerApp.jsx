import React, { useState, useEffect, useCallback } from 'react';
import HomeownerDashboard from '../components/HomeownerDashboard';
import PortalAuth from '../components/PortalAuth';
import { useAuth } from '../contexts/AuthContext';
import { getProjects, saveProject, seedDemoProjectIfNeeded, normalizeProjectStages } from '../services/projectService';
import { isDemoMode } from '../data/demoAccounts';

function filterHomeownerProjects(data, userId) {
  if (!userId) return data;
  const mine = data.filter((p) => !p.ownerId || p.ownerId === userId);
  return mine.length > 0 ? mine : data;
}

function HomeownerAppInner() {
  const { user, profile, signOut, completeLogin, demoLogin, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (preferId) => {
    try {
      if (isDemoMode() && user?.id && profile?.role === 'homeowner') {
        await seedDemoProjectIfNeeded(user.id, profile.full_name);
      }
      const data = await getProjects();
      const normalized = data.map(normalizeProjectStages);
      const mine = filterHomeownerProjects(normalized, user?.id);
      setProjects(mine);

      const savedActiveId = preferId || localStorage.getItem('siteverify_homeowner_active_id');
      if (savedActiveId && mine.some((p) => p.id === savedActiveId)) {
        setActiveProjectId(savedActiveId);
      } else if (mine.length > 0) {
        setActiveProjectId(mine[0].id);
        localStorage.setItem('siteverify_homeowner_active_id', mine[0].id);
      }
    } catch (err) {
      console.error('[SiteVerify Homeowner] Load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile?.role, profile?.full_name]);

  useEffect(() => {
    if (user && profile?.role === 'homeowner') {
      loadData();
    }
  }, [user, profile, loadData]);

  useEffect(() => {
    const reload = () => {
      if (user && profile?.role === 'homeowner') loadData();
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
  }, [user, profile, loadData]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-teal-500 animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <PortalAuth
        portal="homeowner"
        onAuthenticated={completeLogin}
        onDemoLogin={demoLogin}
      />
    );
  }

  if (profile?.role !== 'homeowner') {
    return (
      <PortalAuth
        portal="homeowner"
        userRole={profile?.role}
        onSignOut={signOut}
      />
    );
  }

  const handleSelectActiveProject = (id) => {
    setActiveProjectId(id);
    localStorage.setItem('siteverify_homeowner_active_id', id);
  };

  const handleUpdateProjects = async (updatedProjects) => {
    for (const p of updatedProjects) {
      await saveProject(p);
    }
    await loadData(activeProjectId);
  };

  const handleAddProject = async (newProject) => {
    const withOwner = {
      ...newProject,
      ownerId: user?.id,
      homeownerName: newProject.homeownerName || profile?.full_name || 'Homeowner',
      homeowner: newProject.homeownerName || profile?.full_name || 'Homeowner',
    };
    await saveProject(withOwner);
    await loadData(withOwner.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-teal-500 animate-spin" />
      </div>
    );
  }

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <main className="flex-1">
        {activeProject ? (
          <HomeownerDashboard
            projectReport={activeProject}
            onAddProject={handleAddProject}
            onUpdateProjects={handleUpdateProjects}
            projects={projects}
            userProfile={profile}
            activeProjectId={activeProjectId}
            onSelectProject={handleSelectActiveProject}
            onLogout={signOut}
          />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
            <span className="text-4xl mb-3">🏠</span>
            <h3 className="font-bold text-slate-800 text-base">No site linked yet</h3>
            <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
              Sign in with the demo homeowner account, or add a site after your first login. If you just updated the app, refresh the page once.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function HomeownerApp() {
  return <HomeownerAppInner />;
}
