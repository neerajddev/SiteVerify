import React, { useState, useEffect, useCallback } from 'react';
import HomeownerDashboard from '../components/HomeownerDashboard';
import PortalAuth from '../components/PortalAuth';
import PhoneAppShell from '../components/PhoneAppShell';
import { useAuth } from '../contexts/AuthContext';
import { getProjects, saveProject, seedDemoProjectIfNeeded, normalizeProjectStages } from '../services/projectService';
import { isDemoMode } from '../data/demoAccounts';

/** Only show sites owned by this homeowner — never fall back to other users' projects. */
function filterHomeownerProjects(data, userId) {
  if (!userId) return [];
  return (data || []).filter((p) => p.ownerId === userId);
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
      } else {
        setActiveProjectId('');
        localStorage.removeItem('siteverify_homeowner_active_id');
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
      <PhoneAppShell portal="homeowner" accent="teal" showInstallBanner={false}>
        <div className="flex flex-1 flex-col items-center justify-center text-slate-800 py-20">
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-teal-500 animate-spin" />
        </div>
      </PhoneAppShell>
    );
  }

  if (!user || !profile) {
    return (
      <PhoneAppShell portal="homeowner" accent="teal" showInstallBanner={false}>
        <PortalAuth
          portal="homeowner"
          onAuthenticated={completeLogin}
          onDemoLogin={demoLogin}
        />
      </PhoneAppShell>
    );
  }

  if (profile?.role !== 'homeowner') {
    return (
      <PhoneAppShell portal="homeowner" accent="teal" showInstallBanner={false}>
        <PortalAuth
          portal="homeowner"
          userRole={profile?.role}
          onSignOut={signOut}
        />
      </PhoneAppShell>
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
      <PhoneAppShell portal="homeowner" accent="teal">
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-teal-500 animate-spin" />
        </div>
      </PhoneAppShell>
    );
  }

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0] || null;

  return (
    <PhoneAppShell portal="homeowner" accent="teal">
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
    </PhoneAppShell>
  );
}

export default function HomeownerApp() {
  return <HomeownerAppInner />;
}
