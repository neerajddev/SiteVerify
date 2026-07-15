import React, { useState, useEffect } from 'react';
import FreelancerDashboard from '../components/FreelancerDashboard';
import PortalAuth from '../components/PortalAuth';
import { useAuth } from '../contexts/AuthContext';
import { getProjects, saveProject } from '../services/projectService';
import {
  loadInspectorProfile,
  saveInspectorProfile,
} from '../services/inspectorProfileService';

function FreelancerAppInner() {
  const { user, profile, signOut, completeLogin, demoLogin, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState('');
  const [inspectorExtendedProfile, setInspectorExtendedProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const data = await getProjects();
      setProjects(data);

      const savedActiveId = localStorage.getItem('siteverify_freelancer_active_id');
      if (savedActiveId && data.some((p) => p.id === savedActiveId)) {
        setActiveProjectId(savedActiveId);
      } else if (data.length > 0) {
        setActiveProjectId(data[0].id);
      }

      if (profile?.id) {
        setInspectorExtendedProfile(
          loadInspectorProfile(profile.id, profile.full_name)
        );
      }
    } catch (err) {
      console.error('[SiteVerify Freelancer] Load failed:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && profile?.role === 'inspector') {
      loadData();
    } else {
      // Avoid infinite spinner when OTP succeeds but role/profile is not inspector yet
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    const reload = () => {
      if (user && profile?.role === 'inspector') loadData();
    };
    const onStorage = (e) => {
      if (e.key === 'siteverify_projects' || e.key === 'siteverify_inspector_profiles') reload();
    };
    const onFocus = () => reload();
    window.addEventListener('storage', onStorage);
    window.addEventListener('siteverify-projects-updated', reload);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('siteverify-projects-updated', reload);
      window.removeEventListener('focus', onFocus);
    };
  }, [user, profile]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <PortalAuth
        portal="inspector"
        onAuthenticated={completeLogin}
        onDemoLogin={demoLogin}
      />
    );
  }

  if (profile?.role !== 'inspector') {
    return (
      <PortalAuth
        portal="inspector"
        userRole={profile?.role}
        onSignOut={signOut}
      />
    );
  }

  const handleSelectActiveProject = (id) => {
    setActiveProjectId(id);
    localStorage.setItem('siteverify_freelancer_active_id', id);
  };

  const handleUpdateProjects = async (updatedProjects) => {
    setProjects(updatedProjects);
    for (const p of updatedProjects) {
      await saveProject(p);
    }
    loadData();
  };

  const handleSaveInspectorProfile = (updated) => {
    const saved = saveInspectorProfile(updated);
    setInspectorExtendedProfile(saved);
    return saved;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <main className="flex-1">
        <FreelancerDashboard
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectActiveProject={handleSelectActiveProject}
          onUpdateProjects={handleUpdateProjects}
          inspectorProfile={profile}
          inspectorExtendedProfile={inspectorExtendedProfile}
          onSaveInspectorProfile={handleSaveInspectorProfile}
          onSignOut={signOut}
        />
      </main>
    </div>
  );
}

export default function FreelancerApp() {
  return <FreelancerAppInner />;
}
