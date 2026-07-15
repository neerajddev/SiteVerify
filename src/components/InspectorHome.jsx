import React from 'react';
import { formatVisitDate } from '../data/projectAnalytics';
import {
  splitActiveVisitsByDay,
  getPastVisitCards,
} from '../data/inspectorVisits';

function VisitCard({ meta, onOpen, past = false }) {
  const statusStyles = {
    approved: 'bg-[#E1F5EE] text-[#085041] border-[#1D9E75]/30',
    revision: 'bg-amber-50 text-amber-800 border-amber-200',
    done: 'bg-slate-50 text-slate-600 border-slate-200',
  };

  return (
    <div
      className={`bg-white rounded-2xl p-4 border shadow-sm space-y-3 ${
        past ? 'border-slate-100' : 'border-slate-100'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[16px] font-medium text-[#085041] leading-tight">{meta.siteName}</h3>
          {meta.visitCode && (
            <span className="flex-shrink-0 text-[12px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
              {meta.visitLabel}
            </span>
          )}
        </div>
        <p className="text-[14px] text-slate-500 mt-1 leading-[1.6]">📍 {meta.location}</p>
        {meta.visitName && (
          <p className="text-[14px] text-slate-600 mt-1">{meta.visitName}</p>
        )}
        {meta.scheduled && (
          <p className="text-[12px] text-slate-500 mt-1.5">
            Scheduled {formatVisitDate(meta.scheduled)}
          </p>
        )}
        {past && meta.statusLabel && (
          <span
            className={`inline-block mt-2 text-[12px] font-bold px-2.5 py-1 rounded-full border ${
              statusStyles[meta.statusKey] || statusStyles.done
            }`}
          >
            {meta.statusLabel}
          </span>
        )}
      </div>
      {meta.mapsUrl && !past && (
        <a
          href={meta.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-[12px] font-medium text-amber-800 underline"
          onClick={(e) => e.stopPropagation()}
        >
          Get directions →
        </a>
      )}
      <button
        type="button"
        onClick={() => onOpen(meta.project, past ? 'past' : 'active')}
        className={`w-full text-[14px] font-medium px-3.5 py-3 rounded-xl transition-all active:scale-[0.99] cursor-pointer ${
          past
            ? 'bg-slate-100 text-slate-700 border border-slate-200'
            : 'bg-[#1D9E75] hover:bg-[#177e5e] text-white'
        }`}
      >
        {past ? 'View record →' : 'Open visit →'}
      </button>
    </div>
  );
}

export default function InspectorHome({
  activeDuties,
  pastDuties,
  onOpenDuty,
  onOpenSettings,
  verificationBanner,
}) {
  const { today, upcoming } = splitActiveVisitsByDay(activeDuties);
  const pastCards = getPastVisitCards(pastDuties).slice(0, 8);

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-[12px] font-medium text-[#1D9E75] uppercase tracking-wider">SiteVerify</p>
          <h1 className="text-[22px] font-medium text-[#085041]">Your visits</h1>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm text-slate-500 cursor-pointer"
          title="Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {verificationBanner}

      <section className="space-y-3">
        <h2 className="text-[12px] font-medium text-slate-400 uppercase tracking-wider px-1">
          Today ({today.length})
        </h2>
        {today.length > 0 ? (
          today.map((meta) => (
            <VisitCard key={meta.project.id} meta={meta} onOpen={onOpenDuty} />
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-5 text-[14px] text-slate-500 text-center">
            No visits scheduled for today.
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[12px] font-medium text-slate-400 uppercase tracking-wider px-1">
          Upcoming ({upcoming.length})
        </h2>
        {upcoming.length > 0 ? (
          upcoming.map((meta) => (
            <VisitCard key={meta.project.id} meta={meta} onOpen={onOpenDuty} />
          ))
        ) : (
          <p className="text-[14px] text-slate-400 px-1">No upcoming visits yet.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[12px] font-medium text-slate-400 uppercase tracking-wider px-1">
          Past submissions ({pastCards.length})
        </h2>
        {pastCards.length > 0 ? (
          pastCards.map((meta) => (
            <VisitCard key={`past-${meta.project.id}`} meta={meta} onOpen={onOpenDuty} past />
          ))
        ) : (
          <p className="text-[14px] text-slate-400 px-1">No past submissions yet.</p>
        )}
      </section>
    </div>
  );
}
