import React, { useState } from 'react';
import {
  isTestApprovedForHomeowner,
  getHomeownerWorkflowStatus,
  getIssueBanner,
  OVERALL_RESULT_LABELS,
} from '../data/testWorkflow';
import { getStageIndex } from '../data/stageStructure';

function formatTimestamp(isoString) {
  if (!isoString) return 'Not yet inspected';
  return new Date(isoString).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function BackButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
      aria-label={label || 'Go back'}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
}

function Breadcrumb({ parts }) {
  return (
    <p className="text-[12px] text-slate-400 font-normal leading-relaxed">
      {parts.map((part, i) => (
        <span key={`${part}-${i}`}>
          {i > 0 && <span className="mx-1.5 text-slate-300">›</span>}
          <span className={i === parts.length - 1 ? 'text-slate-600 font-medium' : ''}>{part}</span>
        </span>
      ))}
    </p>
  );
}

export default function HomeownerTestDetail({ test, stage, subStage, onBack, project }) {
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);
  const approved = isTestApprovedForHomeowner(test);
  const statusConfig = getHomeownerWorkflowStatus(test);
  const issueBanner = getIssueBanner(test);
  const stageNum = getStageIndex(stage?.id);
  const inspectorName =
    project?.assignedInspector || project?.inspector || 'SiteVerify inspector';

  const crumb = (
    <div className="flex items-center gap-3 pt-1">
      <BackButton onClick={onBack} label="Back to tests" />
      <div className="min-w-0 flex-1">
        <Breadcrumb
          parts={[
            `Stage ${stageNum}`,
            `Visit ${subStage?.code || ''}`,
            `Test ${test.testNumber || ''}`,
          ]}
        />
      </div>
    </div>
  );

  if (!approved) {
    return (
      <div className="space-y-5 animate-fadeIn max-w-[390px] mx-auto">
        {crumb}
        <h1 className="text-[22px] font-medium text-[#085041] leading-snug">{test.name}</h1>
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-5 text-center space-y-2">
          <p className="text-[12px] font-medium text-slate-500 uppercase tracking-wider">
            Waiting for Admin Review
          </p>
          <p className="text-[14px] text-slate-600 leading-[1.6]">
            Your inspector has submitted this check. Our QA team is reviewing it. Photos and
            results will appear here after approval.
          </p>
        </div>
      </div>
    );
  }

  const photos = test.photos?.length ? test.photos : ['/assets/foundation_inspection.png'];
  const gpsMeta = test.photoTimestamps?.[0] || null;
  const lat = gpsMeta?.gpsLat ?? gpsMeta?.lat ?? project?.coordinates?.lat;
  const lng = gpsMeta?.gpsLng ?? gpsMeta?.lng ?? project?.coordinates?.lng;

  return (
    <div className="space-y-5 animate-fadeIn max-w-[390px] mx-auto">
      {crumb}

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-[22px] font-medium text-[#085041] leading-snug flex-1">{test.name}</h1>
        <span className={`flex-shrink-0 text-[12px] font-bold px-3 py-1.5 rounded-full border ${statusConfig.className}`}>
          {statusConfig.label}
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wider">Inspector photo</p>
        {photos.map((photoUrl, i) => (
          <div key={`${photoUrl}-${i}`} className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
            <div className="aspect-[4/3]">
              <img src={photoUrl} alt={`Evidence for ${test.name}`} className="w-full h-full object-cover" />
            </div>
            <div className="px-3 py-2 bg-[#085041] text-white text-[12px] flex flex-wrap gap-x-3 gap-y-0.5">
              <span>{formatTimestamp(test.submittedAt || test.approvedAt || test.timestamp)}</span>
              {lat != null && lng != null && (
                <span>
                  GPS {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#E1F5EE] border border-[#1D9E75]/25 rounded-2xl px-4 py-3 space-y-1">
        <p className="text-[12px] font-bold text-[#085041] uppercase tracking-wider">
          Reviewed by SiteVerify QA
        </p>
        <p className="text-[14px] text-[#085041]/90 leading-[1.6]">
          {test.approvedBy || 'Admin'}
          {test.approvedAt ? ` · ${formatTimestamp(test.approvedAt)}` : ''}
        </p>
        <p className="text-[12px] text-slate-600">Checked by {inspectorName}</p>
      </div>

      {test.overallResult && test.overallResult !== 'not_applicable' && (
        <div className="flex flex-wrap gap-2">
          <span className="text-[12px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {OVERALL_RESULT_LABELS[test.overallResult] || test.overallResult}
          </span>
          {test.conditionRating && (
            <span
              className={`text-[12px] font-bold px-3 py-1 rounded-full border uppercase ${
                test.conditionRating === 'good'
                  ? 'bg-[#E1F5EE] text-[#085041] border-[#1D9E75]/30'
                  : test.conditionRating === 'average'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-600 border-rose-200'
              }`}
            >
              {test.conditionRating}
            </span>
          )}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wider">Inspector remarks</p>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-[14px] text-[#1A1A1A] leading-[1.6]">
            {test.adminNote || test.remarks || 'No remarks recorded.'}
          </p>
        </div>
      </div>

      {issueBanner && (
        <div className={`border rounded-2xl p-4 text-[14px] leading-[1.6] ${issueBanner.className}`}>
          {issueBanner.text}
        </div>
      )}

      {test.knowledge && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => setIsKnowledgeOpen(!isKnowledgeOpen)}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-[#E1F5EE]/40 cursor-pointer"
          >
            <span className="text-[16px] font-medium text-[#085041]">Why this matters</span>
            <svg
              className={`w-5 h-5 text-[#1D9E75] transition-transform ${isKnowledgeOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isKnowledgeOpen && (
            <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-4">
              <div>
                <p className="text-[14px] font-medium text-slate-800 mb-1">Benefit</p>
                <p className="text-[14px] text-slate-600 leading-[1.6]">{test.knowledge.benefit}</p>
              </div>
              <div>
                <p className="text-[14px] font-medium text-slate-800 mb-1">If skipped</p>
                <p className="text-[14px] text-slate-600 leading-[1.6]">{test.knowledge.demerit}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
