import React, { useState } from 'react';
import {
  WORKFLOW_STATUS,
  OVERALL_RESULT_LABELS,
  getAdminStatusChip,
  hasIssueFlag,
} from '../data/testWorkflow';
import { getStageIndex } from '../data/stageStructure';

function formatTimestamp(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function ReadOnlyCard({ label, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <div className="text-sm text-slate-800">{children}</div>
    </div>
  );
}

function ConditionBadge({ rating }) {
  const map = {
    good: 'bg-[#1D9E75]/10 text-[#1D9E75] border-[#1D9E75]/30',
    average: 'bg-amber-50 text-amber-700 border-amber-200',
    poor: 'bg-rose-50 text-rose-600 border-rose-200',
  };
  return (
    <span className={`text-xs font-bold px-3 py-1 rounded-full border uppercase ${map[rating] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
      {rating || '—'}
    </span>
  );
}

function SeverityBadge({ severity }) {
  const map = {
    minor: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    moderate: 'bg-orange-50 text-orange-700 border-orange-200',
    critical: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return (
    <span className={`text-xs font-bold px-3 py-1 rounded-full border uppercase ${map[severity] || ''}`}>
      {severity || '—'}
    </span>
  );
}

export default function AdminTestReviewScreen({
  test,
  stage,
  subStage,
  project,
  onBack,
  onApprove,
  onSendBack,
  adminName = 'Admin',
  hideBack = false,
}) {
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [adminNote, setAdminNote] = useState(test.adminNote || '');
  const [confirming, setConfirming] = useState(false);
  const [approved, setApproved] = useState(false);

  const stageNum = getStageIndex(stage?.id);
  const statusChip = getAdminStatusChip(test.workflowStatus);
  const inspectorName = test.submittedBy || project?.assignedInspector || project?.inspector || 'Inspector';
  const timestamps = test.photoTimestamps || [];

  const handleApprove = async () => {
    setConfirming(true);
    await onApprove({ adminNote: adminNote.trim() || null, approvedBy: adminName });
    setApproved(true);
    setConfirming(false);
  };

  const handleSendBack = async () => {
    if (!revisionReason.trim()) return;
    setConfirming(true);
    await onSendBack({ revisionReason: revisionReason.trim(), adminNote: adminNote.trim() || null });
    setConfirming(false);
    onBack();
  };

  if (approved) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-fadeIn p-4">
        <div className="bg-[#1D9E75]/10 border border-[#1D9E75]/30 rounded-2xl p-6 text-center">
          <p className="text-lg font-medium text-[#1D9E75]">Test approved.</p>
          <p className="text-sm text-slate-600 mt-2">Homeowner can now view the result.</p>
          {!hideBack && (
            <button type="button" onClick={onBack} className="mt-4 px-6 py-2.5 bg-[#1D9E75] text-white font-medium rounded-xl cursor-pointer">
              Back to review list
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fadeIn pb-8">
      {/* SECTION 1: SUMMARY */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {!hideBack && (
            <button type="button" onClick={onBack} className="text-xs font-medium text-slate-500 hover:text-slate-700 mb-2 cursor-pointer">
              ← Back
            </button>
          )}
          <p className="text-xs text-slate-400">
            Stage {stageNum} › Visit {subStage?.code} › {subStage?.name}
          </p>
          <h1 className="text-xl font-medium text-slate-800 mt-1">{test.name}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Inspector: <strong>{inspectorName}</strong> · Submitted {formatTimestamp(test.submittedAt)}
          </p>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full border flex-shrink-0 ${statusChip.className}`}>
          {statusChip.label}
        </span>
      </div>

      {/* SECTION 2: PHOTOS */}
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Inspector Evidence</p>
        {test.photos?.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {test.photos.map((photo, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setLightboxPhoto(photo)}
                className="flex-shrink-0 space-y-1 cursor-pointer"
              >
                <div className="w-[120px] h-[120px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img src={photo} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                </div>
                <p className="text-[10px] text-slate-400 text-center w-[120px]">
                  {formatTimestamp(timestamps[i])}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No photos submitted.</p>
        )}
      </div>

      {/* SECTION 3: FINDINGS */}
      <div className="space-y-3">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Inspector Findings</p>
        <ReadOnlyCard label="Overall Result">
          {OVERALL_RESULT_LABELS[test.overallResult] || test.overallResult || '—'}
        </ReadOnlyCard>
        <ReadOnlyCard label="Condition">
          <ConditionBadge rating={test.conditionRating} />
        </ReadOnlyCard>
        {test.measurement && (
          <ReadOnlyCard label="Measurement">{test.measurement}</ReadOnlyCard>
        )}
        <ReadOnlyCard label="Remarks">
          <p className="leading-relaxed italic">"{test.remarks || '—'}"</p>
        </ReadOnlyCard>
        {hasIssueFlag(test) && test.severity && (
          <ReadOnlyCard label="Severity">
            <SeverityBadge severity={test.severity} />
          </ReadOnlyCard>
        )}
      </div>

      {/* SECTION 4: ADMIN DECISION */}
      {test.workflowStatus === WORKFLOW_STATUS.SUBMITTED && (
        <div className="space-y-3 pt-2 border-t border-slate-200">
          {!showRevisionInput ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleApprove}
                disabled={confirming}
                className="py-4 bg-[#1D9E75] hover:bg-[#178f6a] text-white font-black text-sm rounded-2xl active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                ✅ Approve
              </button>
              <button
                type="button"
                onClick={() => setShowRevisionInput(true)}
                className="py-4 bg-amber-500 hover:bg-amber-600 text-white font-black text-sm rounded-2xl active:scale-[0.98] transition-all cursor-pointer"
              >
                Send Back for Correction
              </button>
            </div>
          ) : (
            <div className="space-y-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <label className="block text-xs font-medium text-amber-800">
                Reason for correction (inspector will see this) *
              </label>
              <textarea
                rows={3}
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                className="w-full px-3 py-2 border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                placeholder="Explain what needs to be corrected..."
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowRevisionInput(false)} className="flex-1 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold cursor-pointer">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendBack}
                  disabled={!revisionReason.trim() || confirming}
                  className="flex-1 py-2 bg-amber-500 text-white rounded-xl text-xs font-black cursor-pointer disabled:opacity-50"
                >
                  Confirm Send Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: QA NOTE */}
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
          Add QA note (internal only)
        </label>
        <textarea
          rows={2}
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="Internal note — homeowner won't see this"
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxPhoto(null)}>
          <img src={lightboxPhoto} alt="Enlarged evidence" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
