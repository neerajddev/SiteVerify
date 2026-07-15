import React from 'react';
import {
  getHomeownerProgressSummary,
  getNextVisitCard,
  getHomeownerStagePills,
  getHomeownerIssueAlerts,
  getConstructionTypeLabel,
} from '../data/homeownerHome';

function ProgressRing({ pct, label }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-[104px] h-[104px] flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#E5E7EB" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#1D9E75"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[22px] font-medium text-[#085041] leading-none">{pct}%</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[16px] font-medium text-[#085041] leading-snug">{label}</p>
        <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">Approved checks only</p>
      </div>
    </div>
  );
}

/**
 * Core homeowner home: site card, progress, next visit, stage pills, issue alerts.
 * Fits first viewport — no scrolling needed for the essentials.
 */
export default function HomeownerHomeCore({
  project,
  onOpenStage,
  onOpenIssue,
  onOpenChat,
}) {
  if (!project) return null;

  const progress = getHomeownerProgressSummary(project);
  const nextVisit = getNextVisitCard(project);
  const pills = getHomeownerStagePills(project);
  const issues = getHomeownerIssueAlerts(project);
  const typeLabel = getConstructionTypeLabel(project);
  const siteName = project.projectName || project.name || 'My Home';
  const location = project.location || '';

  return (
    <div className="space-y-4">
      {/* Site card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-[#1D9E75] uppercase tracking-wider">Your home</p>
            <h1 className="text-[22px] font-medium text-[#085041] mt-1 leading-tight">{siteName}</h1>
            <p className="text-[14px] text-slate-500 mt-1.5 leading-[1.6]">
              {location}
              {project.pinCode ? ` · PIN ${project.pinCode}` : ''}
            </p>
            {typeLabel && (
              <p className="text-[12px] text-slate-500 mt-2 font-medium">{typeLabel}</p>
            )}
          </div>
          {onOpenChat && (
            <button
              type="button"
              onClick={onOpenChat}
              title="Chat with SiteVerify"
              aria-label="Chat with SiteVerify"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#E1F5EE] border border-[#1D9E75]/30 text-[#085041] hover:bg-[#d0eee3] active:scale-95 transition-all cursor-pointer flex-shrink-0"
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
          )}
        </div>
      </div>

      {/* Progress — hero number */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
        <ProgressRing pct={progress.pct} label={progress.label} />
      </div>

      {/* Next visit */}
      {nextVisit ? (
        <div className="bg-[#E1F5EE] border border-[#1D9E75]/25 rounded-3xl p-5">
          <p className="text-[12px] font-medium text-[#085041] uppercase tracking-wider">Next inspection</p>
          <p className="text-[16px] font-medium text-[#085041] mt-1.5 leading-snug">{nextVisit.title}</p>
          <p className="text-[14px] text-slate-600 mt-1 leading-[1.6]">{nextVisit.line}</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl p-5">
          <p className="text-[14px] text-slate-500 leading-[1.6]">
            No inspection scheduled right now. We will update this when the next visit is booked.
          </p>
        </div>
      )}

      {/* Stage pills */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4">
        <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wider px-1 mb-3">
          Build stages
        </p>
        <div className="grid grid-cols-4 gap-2">
          {pills.map((pill) => {
            const styles =
              pill.state === 'complete'
                ? 'bg-[#1D9E75] text-white border-[#1D9E75]'
                : pill.state === 'current'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-slate-50 text-slate-400 border-slate-200';
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => onOpenStage?.(pill.id)}
                className={`px-1.5 py-2.5 rounded-xl border text-center cursor-pointer active:scale-[0.98] ${styles}`}
              >
                <span className="block text-[11px] font-medium leading-tight">{pill.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Issue alerts — only moderate / critical after approval */}
      {issues.length > 0 && (
        <div className="space-y-2">
          {issues.slice(0, 3).map((issue) => {
            const critical = issue.severity === 'critical';
            return (
              <button
                key={issue.testId}
                type="button"
                onClick={() => onOpenIssue?.(issue)}
                className={`w-full text-left rounded-2xl border p-4 cursor-pointer active:scale-[0.99] ${
                  critical
                    ? 'bg-rose-50 border-rose-200'
                    : 'bg-orange-50 border-orange-200'
                }`}
              >
                <p
                  className={`text-[12px] font-bold uppercase tracking-wider ${
                    critical ? 'text-rose-700' : 'text-orange-800'
                  }`}
                >
                  {critical ? 'Critical issue' : 'Needs attention'}
                </p>
                <p className="text-[16px] font-medium text-[#1A1A1A] mt-1">
                  T{issue.testNumber} · {issue.name}
                </p>
                <p className="text-[14px] text-slate-600 mt-1 line-clamp-2 leading-[1.6]">
                  {issue.remarks}
                </p>
                <p className="text-[12px] font-medium mt-2 text-[#085041]">Tap for full detail →</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
