import React, { useState, useEffect } from 'react';
import FreelancerDashboard from '../components/FreelancerDashboard';
import PortalAuth from '../components/PortalAuth';
import PhoneAppShell from '../components/PhoneAppShell';
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
      <PhoneAppShell portal="inspector" accent="amber" showInstallBanner={false}>
        <div className="flex flex-1 flex-col items-center justify-center text-slate-800 py-20">
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-amber-500 animate-spin" />
        </div>
      </PhoneAppShell>
    );
  }

  if (!user || !profile) {
    return (
      <PhoneAppShell portal="inspector" accent="amber" showInstallBanner={false}>
        <PortalAuth
          portal="inspector"
          onAuthenticated={completeLogin}
          onDemoLogin={demoLogin}
        />
      </PhoneAppShell>
    );
  }

  if (profile?.role !== 'inspector') {
    return (
      <PhoneAppShell portal="inspector" accent="amber" showInstallBanner={false}>
        <PortalAuth
          portal="inspector"
          userRole={profile?.role}
          onSignOut={signOut}
        />
      </PhoneAppShell>
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
      <PhoneAppShell portal="inspector" accent="amber">
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-amber-500 animate-spin" />
        </div>
      </PhoneAppShell>
    );
  }

  return (
    <PhoneAppShell portal="inspector" accent="amber">
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
    </PhoneAppShell>
  );
}

export default function FreelancerApp() {
  return <FreelancerAppInner />;
}
