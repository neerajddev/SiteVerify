import React, { useState, useEffect } from 'react';
import HomeownerDashboard from './components/HomeownerDashboard';
import FreelancerDashboard from './components/FreelancerDashboard';
import AdminDashboard from './components/AdminDashboard';
import { PROJECTS_LIST } from './data/mockData';

// ─── localStorage Schema Version Guard ──────────────────────────────────────
// Bump this whenever the PROJECTS_LIST schema changes incompatibly.
// Any stale localStorage data from a previous schema version is cleared.
const SCHEMA_VERSION = '2.0.0';

function loadProjectsFromStorage() {
  try {
    const version = localStorage.getItem('siteverify_schema_version');
    if (version !== SCHEMA_VERSION) {
      // Schema changed — clear stale data and start fresh from seed
      localStorage.removeItem('siteverify_projects');
      localStorage.setItem('siteverify_schema_version', SCHEMA_VERSION);
      return PROJECTS_LIST;
    }
    const saved = localStorage.getItem('siteverify_projects');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('[SiteVerify] Error reading localStorage:', e);
    localStorage.removeItem('siteverify_projects');
  }
  return PROJECTS_LIST;
}

export default function App() {
  const [role, setRole] = useState('homeowner'); // 'homeowner' | 'freelancer' | 'admin'
  const [activeProjectId, setActiveProjectId] = useState('proj_001');

  const [projects, setProjects] = useState(() => loadProjectsFromStorage());

  // Sync to localStorage on every state change
  useEffect(() => {
    localStorage.setItem('siteverify_projects', JSON.stringify(projects));
  }, [projects]);

  const handleUpdateProjects = (updatedProjects) => {
    setProjects(updatedProjects);
  };

  const handleAddProject = (newProject) => {
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id);
  };

  // Resolve the active project — fall back to first project if ID not found
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">

      {/* ── PROTOTYPE VIEW CONTROLLER TOP BANNER ──────────────────────────────── */}
      <div className="bg-slate-900 text-white border-b border-slate-800 px-4 py-2.5 z-50 sticky top-0 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping" />
          <span className="font-extrabold text-slate-200 tracking-wide uppercase text-[10px]">
            SiteVerify Prototype Controller
          </span>
          <span className="text-[8px] text-slate-500 font-mono border border-slate-700 px-1.5 py-0.5 rounded">
            v{SCHEMA_VERSION}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Global Project switcher */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Active Site:</span>
            <select
              value={activeProjectId}
              onChange={e => setActiveProjectId(e.target.value)}
              className="px-2.5 py-1 bg-slate-850 border border-slate-700 text-slate-100 rounded-md font-bold focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
            >
              {projects.map(p => {
                const name = p.homeownerName || p.homeowner || 'Unknown Owner';
                const city = (p.location || 'Unknown, State').split(',')[0];
                return (
                  <option key={p.id} value={p.id}>
                    {name}'s House ({city})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Role switcher */}
          <div className="flex items-center gap-2.5">
            <span className="text-slate-400 font-medium">Portal Role:</span>
            <div className="bg-slate-800 rounded-lg p-0.5 flex border border-slate-700">
              <button
                onClick={() => setRole('homeowner')}
                className={`px-3 py-1 font-black rounded-md transition-all cursor-pointer ${
                  role === 'homeowner'
                    ? 'bg-teal-500 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🏠 Homeowner
              </button>
              <button
                onClick={() => setRole('freelancer')}
                className={`px-3 py-1 font-black rounded-md transition-all cursor-pointer ${
                  role === 'freelancer'
                    ? 'bg-amber-500 text-slate-900 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🔍 Freelancer
              </button>
              <button
                onClick={() => setRole('admin')}
                className={`px-3 py-1 font-black rounded-md transition-all cursor-pointer ${
                  role === 'admin'
                    ? 'bg-indigo-500 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                👑 Admin
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── RENDER PORTALS ─────────────────────────────────────────────────────── */}
      <main className="flex-1">
        {role === 'homeowner' && activeProject && (
          <HomeownerDashboard
            projectReport={activeProject}
            onAddProject={handleAddProject}
            onUpdateProjects={handleUpdateProjects}
            projects={projects}
          />
        )}
        {role === 'freelancer' && (
          <FreelancerDashboard
            projects={projects}
            activeProjectId={activeProjectId}
            onSelectActiveProject={setActiveProjectId}
            onUpdateProjects={handleUpdateProjects}
          />
        )}
        {role === 'admin' && (
          <AdminDashboard
            projects={projects}
            onUpdateProjects={handleUpdateProjects}
            onSelectActiveProject={setActiveProjectId}
            activeProjectId={activeProjectId}
          />
        )}
      </main>

    </div>
  );
}
