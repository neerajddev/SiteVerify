import React, { useState, useEffect, useCallback } from 'react';
import { listProjectChatInbox } from '../services/chatService';
import ProjectChatScreen from './ProjectChat';
import { TYPE } from '../data/designTokens';

function formatInboxTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Admin chat hub — Google Chat style.
 * Left: all project conversations. Right: open thread.
 */
export default function AdminChatInbox({ projects = [], currentUser }) {
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [query, setQuery] = useState('');

  const refresh = useCallback(async () => {
    const rows = await listProjectChatInbox(projects);
    setInbox(rows);
    setLoading(false);
  }, [projects]);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener('siteverify-chat-updated', onUpdate);
    const poll = setInterval(refresh, 5000);
    return () => {
      window.removeEventListener('siteverify-chat-updated', onUpdate);
      clearInterval(poll);
    };
  }, [refresh]);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;
  const filtered = inbox.filter((row) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      row.siteName.toLowerCase().includes(q) ||
      row.homeowner.toLowerCase().includes(q) ||
      row.location.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[560px] grid grid-cols-1 lg:grid-cols-5">
      {/* Conversation list */}
      <div
        className={`lg:col-span-2 border-r border-slate-100 flex-col ${
          activeProjectId ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <div className="px-4 py-4 border-b border-slate-100 space-y-3">
          <div>
            <p className={TYPE.eyebrow}>Messages</p>
            <h2 className="text-[18px] font-medium text-[#085041]">Chats</h2>
            <p className="text-[13px] text-slate-500 mt-0.5">
              All project conversations with homeowners
            </p>
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sites or homeowners…"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
          />
        </div>

        <div className="flex-1 overflow-y-auto max-h-[65vh] divide-y divide-slate-50">
          {loading ? (
            <p className="p-8 text-center text-[14px] text-slate-400">Loading chats…</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-[14px] text-slate-400">No projects yet.</p>
          ) : (
            filtered.map((row) => {
              const active = row.projectId === activeProjectId;
              return (
                <button
                  key={row.projectId}
                  type="button"
                  onClick={() => setActiveProjectId(row.projectId)}
                  className={`w-full text-left px-4 py-3.5 flex gap-3 cursor-pointer transition-colors ${
                    active ? 'bg-[#E1F5EE]/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-[#085041] text-white flex items-center justify-center text-[14px] font-medium flex-shrink-0">
                    {(row.homeowner || row.siteName || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[15px] font-medium text-[#085041] truncate">{row.siteName}</p>
                      <span className="text-[11px] text-slate-400 flex-shrink-0">
                        {formatInboxTime(row.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-500 truncate mt-0.5">{row.homeowner}</p>
                    <p
                      className={`text-[13px] truncate mt-1 ${
                        row.hasMessages ? 'text-slate-600' : 'text-slate-400 italic'
                      }`}
                    >
                      {row.lastMessagePreview}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Open conversation */}
      <div
        className={`lg:col-span-3 flex-col min-h-[560px] bg-[#F8F8F6] ${
          activeProjectId ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {activeProject ? (
          <ProjectChatScreen
            project={activeProject}
            currentUser={currentUser}
            onBack={() => setActiveProjectId(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-16">
            <div className="w-16 h-16 rounded-2xl bg-[#E1F5EE] text-[#085041] flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-[18px] font-medium text-[#085041]">Select a chat</h3>
            <p className="text-[14px] text-slate-500 mt-2 max-w-sm leading-[1.6]">
              Choose a project on the left to message the homeowner — same thread they see on their app.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
