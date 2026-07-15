import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ensureProjectChat,
  getChatMessages,
  sendChatMessage,
  enableSupabaseChatIfAvailable,
} from '../services/chatService';
import { TYPE, BUTTONS } from '../data/designTokens';

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function roleLabel(role) {
  if (role === 'admin') return 'SiteVerify Admin';
  if (role === 'homeowner') return 'Homeowner';
  if (role === 'inspector') return 'Inspector';
  return 'SiteVerify';
}

/** Small chat icon to place near a project card / header. */
export function ProjectChatIcon({ onClick, title = 'Open chat', className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-[#085041] shadow-sm hover:bg-[#E1F5EE] hover:border-[#1D9E75]/40 active:scale-95 transition-all cursor-pointer flex-shrink-0 ${className}`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    </button>
  );
}

/**
 * Full chat screen — opened from the project chat icon.
 * Auto-creates the thread on mount. Homeowner ↔ admin.
 */
export default function ProjectChatScreen({ project, currentUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const bottomRef = useRef(null);

  const role = currentUser?.role || 'homeowner';
  const canWrite = role === 'homeowner' || role === 'admin';
  const name =
    currentUser?.full_name || currentUser?.name || (role === 'admin' ? 'Admin' : 'You');
  const userId = currentUser?.id || null;
  const siteName =
    project?.projectName ||
    `${project?.homeownerName || project?.homeowner || 'Project'}'s House`;

  const refresh = useCallback(async () => {
    if (!project?.id) return;
    const list = await getChatMessages(project.id);
    setMessages(list);
  }, [project?.id]);

  useEffect(() => {
    if (!project?.id) return undefined;
    let cancelled = false;

    (async () => {
      enableSupabaseChatIfAvailable();
      await ensureProjectChat(project);
      if (cancelled) return;
      await refresh();
      if (!cancelled) setReady(true);
    })();

    const onStorage = () => refresh();
    window.addEventListener('siteverify-chat-updated', onStorage);
    const poll = setInterval(refresh, 4000);

    return () => {
      cancelled = true;
      window.removeEventListener('siteverify-chat-updated', onStorage);
      clearInterval(poll);
    };
  }, [project?.id, project, refresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, ready]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!canWrite || !draft.trim() || sending) return;
    setSending(true);
    await sendChatMessage({
      projectId: project.id,
      senderId: userId,
      senderRole: role,
      senderName: name,
      body: draft,
    });
    setDraft('');
    await refresh();
    setSending(false);
  };

  if (!project) return null;

  return (
    <div className="flex flex-col h-[min(100dvh,720px)] min-h-[520px] bg-[#F8F8F6] animate-fadeIn">
      <header className="flex-shrink-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className={TYPE.eyebrow}>Project chat</p>
          <h1 className="text-[16px] font-medium text-[#085041] truncate">{siteName}</h1>
          <p className="text-[12px] text-slate-400">Homeowner ↔ Admin</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {!ready ? (
          <p className={`${TYPE.label} py-10 text-center`}>Opening chat…</p>
        ) : messages.length === 0 ? (
          <p className={`${TYPE.label} py-10 text-center`}>No messages yet. Say hello.</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderRole === role && m.senderRole !== 'system';
            if (m.senderRole === 'system') {
              return (
                <div key={m.id} className="text-center py-1">
                  <p className="text-[12px] text-slate-400 px-4 leading-[1.5]">{m.body}</p>
                </div>
              );
            }
            return (
              <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                <p className="text-[11px] text-slate-400 mb-0.5">
                  {mine ? 'You' : roleLabel(m.senderRole)}
                  {m.senderName && !mine ? ` · ${m.senderName}` : ''} · {formatTime(m.createdAt)}
                </p>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-[1.6] ${
                    mine
                      ? 'bg-[#1D9E75] text-white rounded-br-md'
                      : 'bg-white border border-slate-100 text-slate-800 rounded-bl-md shadow-sm'
                  }`}
                >
                  {m.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {canWrite ? (
        <form
          onSubmit={handleSend}
          className="flex-shrink-0 p-3 bg-white border-t border-slate-100 flex gap-2"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message…"
            className="flex-1 px-3 py-3 border border-slate-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
            autoFocus
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className={`px-4 py-3 ${BUTTONS.primary} text-[14px]`}
          >
            Send
          </button>
        </form>
      ) : (
        <p className="flex-shrink-0 p-3 text-[12px] text-slate-400 border-t border-slate-100 text-center bg-white">
          Only homeowner and admin can send messages here.
        </p>
      )}
    </div>
  );
}
