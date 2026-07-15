import React, { useState, useRef } from 'react';
import {
  WORKFLOW_STATUS,
  OVERALL_RESULTS,
  CONDITION_RATINGS,
  SEVERITY_LEVELS,
  INSPECTOR_INSTRUCTIONS,
  TESTS_WITH_MEASUREMENT,
  getInspectorStatusChip,
  isTestLockedForInspector,
} from '../data/testWorkflow';
import { getStageIndex, TEST_KNOWLEDGE } from '../data/stageStructure';

function formatCaptureTime(date = new Date()) {
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function InspectorTestFillScreen({
  test,
  stage,
  subStage,
  inspectorName,
  onBack,
  onSubmit,
}) {
  const fileInputRef = useRef(null);
  const [instructionsOpen, setInstructionsOpen] = useState(true);
  const [photos, setPhotos] = useState(test.photos || []);
  const [photoTimestamps, setPhotoTimestamps] = useState(test.photoTimestamps || []);
  const [overallResult, setOverallResult] = useState(test.overallResult || '');
  const [conditionRating, setConditionRating] = useState(test.conditionRating || '');
  const [remarks, setRemarks] = useState(test.remarks || '');
  const [measurement, setMeasurement] = useState(test.measurement || '');
  const [severity, setSeverity] = useState(test.severity || '');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const locked = isTestLockedForInspector(test) || submitted;
  const isRevision = test.workflowStatus === WORKFLOW_STATUS.REVISION_REQUESTED;
  const statusChip = getInspectorStatusChip(
    locked
      ? WORKFLOW_STATUS.SUBMITTED
      : test.workflowStatus === WORKFLOW_STATUS.NOT_STARTED
        ? WORKFLOW_STATUS.IN_PROGRESS
        : test.workflowStatus
  );
  const stageNum = getStageIndex(stage?.id);
  const instruction =
    INSPECTOR_INSTRUCTIONS[test.testNumber] ||
    'Follow standard site inspection procedure and capture clear photo evidence.';
  const knowledge = TEST_KNOWLEDGE[test.testNumber] || test.knowledge;
  const showMeasurement = TESTS_WITH_MEASUREMENT.includes(test.testNumber);
  const issueFlagged =
    overallResult === OVERALL_RESULTS.ISSUE_FOUND ||
    overallResult === OVERALL_RESULTS.NOT_DONE ||
    conditionRating === CONDITION_RATINGS.POOR;
  const remarksRequired =
    overallResult === OVERALL_RESULTS.ISSUE_FOUND || overallResult === OVERALL_RESULTS.NOT_DONE;
  const canSubmit =
    !locked &&
    photos.length >= 1 &&
    overallResult &&
    conditionRating &&
    (!remarksRequired || remarks.trim()) &&
    (!issueFlagged || severity);

  const handlePhotoCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file || locked) return;
    const reader = new FileReader();
    reader.onload = () => {
      const now = new Date().toISOString();
      setPhotos((prev) => [...prev.slice(0, 2), reader.result].slice(0, 3));
      setPhotoTimestamps((prev) => [...prev.slice(0, 2), now].slice(0, 3));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRetake = (index) => {
    if (locked) return;
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoTimestamps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    await onSubmit({
      photos,
      photoTimestamps,
      overallResult,
      conditionRating,
      remarks: remarks.trim(),
      measurement: measurement.trim(),
      severity: issueFlagged ? severity : null,
      workflowStatus: WORKFLOW_STATUS.SUBMITTED,
      submittedAt: new Date().toISOString(),
      submittedBy: inspectorName,
      timestamp: new Date().toISOString(),
      status:
        overallResult === OVERALL_RESULTS.DONE_CORRECTLY && conditionRating === CONDITION_RATINGS.GOOD
          ? 'Pass'
          : 'Needs Attention',
    });
    setSubmitted(true);
    setSubmitting(false);
  };

  const inputClass =
    'w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40';

  const resultOptions = [
    { value: OVERALL_RESULTS.DONE_CORRECTLY, label: 'Done Correctly', hint: 'Matches expected quality' },
    { value: OVERALL_RESULTS.ISSUE_FOUND, label: 'Issue Found', hint: 'Problem seen on site' },
    { value: OVERALL_RESULTS.NOT_DONE, label: 'Not Done / Absent', hint: 'Work missing or incomplete' },
    {
      value: OVERALL_RESULTS.NOT_APPLICABLE,
      label: 'Not applicable',
      hint: 'Does not apply to this build type',
    },
  ];

  return (
    <div className="space-y-5 animate-fadeIn max-w-[390px] mx-auto pb-28">
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 active:scale-95 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-slate-400">
            Stage {stageNum} › Visit {subStage?.code}
          </p>
          <h1 className="text-[17px] font-medium text-[#085041] leading-snug">{test.name}</h1>
        </div>
        <span
          className={`text-[11px] font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${statusChip.className}`}
        >
          {submitted ? 'Submitted' : isRevision ? 'Sent Back for Correction' : statusChip.label}
        </span>
      </div>

      {isRevision && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-[14px] text-amber-900">
          <p className="font-medium text-amber-800 text-[13px] uppercase tracking-wider">
            Sent Back for Correction
          </p>
          <p className="mt-2 leading-[1.6]">
            {test.revisionReason ||
              'Admin asked you to correct this test. Review the note, update photos/findings, and resubmit.'}
          </p>
        </div>
      )}

      {submitted && (
        <div className="bg-[#E1F5EE] border border-[#1D9E75]/30 rounded-2xl p-4 text-[14px] text-[#085041]">
          Test submitted. You can continue other checks for this visit.
        </div>
      )}

      {knowledge && !locked && (
        <div className="bg-[#E1F5EE]/60 border border-[#1D9E75]/20 rounded-2xl p-4 space-y-3">
          <p className="text-[12px] font-medium text-[#085041] uppercase tracking-wider">
            Why this test matters
          </p>
          <div>
            <p className="text-[12px] font-medium text-[#085041] mb-1">If done right</p>
            <p className="text-[14px] text-slate-700 leading-[1.6]">{knowledge.benefit}</p>
          </div>
          <div>
            <p className="text-[12px] font-medium text-rose-700 mb-1">If skipped / done wrong</p>
            <p className="text-[14px] text-rose-800/90 leading-[1.6]">
              {knowledge.ifSkipped || knowledge.demerit}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setInstructionsOpen(!instructionsOpen)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left cursor-pointer"
        >
          <span className="text-[15px] font-medium text-amber-800">What to check on site</span>
          <svg
            className={`w-5 h-5 text-amber-600 transition-transform ${instructionsOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {instructionsOpen && (
          <div className="px-4 pb-4 border-t border-slate-100">
            <p className="text-[15px] text-slate-600 leading-[1.6] pt-3">{instruction}</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wider">
          Photo evidence (camera only)
        </p>
        <p className="text-[13px] text-slate-500 -mt-1">
          Use your phone camera on site. Gallery upload is not for site evidence.
        </p>
        {!locked && photos.length < 3 && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoCapture}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full min-h-[72px] py-4 bg-amber-50 border-2 border-dashed border-amber-300 rounded-2xl text-amber-900 font-medium text-[15px] active:scale-[0.99] cursor-pointer"
            >
              Take photo ({photos.length}/3)
            </button>
          </>
        )}
        {photos.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {photos.map((photo, i) => (
              <div key={i} className="space-y-1">
                <div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <img src={photo} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                </div>
                <p className="text-[11px] text-slate-400 text-center w-24">
                  {formatCaptureTime(photoTimestamps[i] ? new Date(photoTimestamps[i]) : new Date())}
                </p>
                {!locked && (
                  <button
                    type="button"
                    onClick={() => handleRetake(i)}
                    className="text-[12px] text-rose-600 font-medium w-24 text-center cursor-pointer"
                  >
                    Retake
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`space-y-5 ${locked ? 'opacity-60 pointer-events-none' : ''}`}>
        <div>
          <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wider mb-2">
            Overall result *
          </p>
          <div className="space-y-2">
            {resultOptions.map((opt) => {
              const selected = overallResult === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOverallResult(opt.value)}
                  className={`w-full text-left min-h-[72px] rounded-2xl border-2 px-4 py-3.5 transition-all cursor-pointer ${
                    selected
                      ? 'border-[#1D9E75] bg-[#E1F5EE] text-[#085041]'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <p className="text-[16px] font-medium">{opt.label}</p>
                  <p className={`text-[13px] mt-0.5 ${selected ? 'text-[#085041]/80' : 'text-slate-400'}`}>
                    {opt.hint}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wider mb-2">
            Condition rating *
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                value: CONDITION_RATINGS.GOOD,
                label: 'GOOD',
                color: 'border-[#1D9E75] bg-[#E1F5EE] text-[#085041]',
              },
              {
                value: CONDITION_RATINGS.AVERAGE,
                label: 'AVERAGE',
                color: 'border-amber-400 bg-amber-50 text-amber-900',
              },
              {
                value: CONDITION_RATINGS.POOR,
                label: 'POOR',
                color: 'border-rose-400 bg-rose-50 text-rose-800',
              },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setConditionRating(opt.value)}
                className={`min-h-[64px] rounded-2xl border-2 font-medium text-[13px] transition-all cursor-pointer ${
                  conditionRating === opt.value ? opt.color : 'border-slate-200 bg-white text-slate-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {showMeasurement && (
          <div>
            <label className="block text-[12px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Measurement (if applicable)
            </label>
            <input
              type="text"
              value={measurement}
              onChange={(e) => setMeasurement(e.target.value)}
              placeholder="e.g. bar spacing 180mm"
              className={inputClass}
            />
          </div>
        )}

        {(remarksRequired || issueFlagged || remarks) && (
          <div>
            <label className="block text-[12px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Remarks {remarksRequired ? '*' : '(optional)'}
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Describe what you observed. If issue found, explain clearly."
              className={`${inputClass} resize-none`}
            />
          </div>
        )}
        {!remarksRequired && !issueFlagged && !remarks && (
          <div>
            <label className="block text-[12px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Remarks (optional)
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional notes"
              className={`${inputClass} resize-none`}
            />
          </div>
        )}
      </div>

      {issueFlagged && !locked && (
        <div className="space-y-3">
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-[14px] text-rose-800 leading-[1.6]">
            You are flagging an issue. Describe it in remarks and set severity.
          </div>
          <div>
            <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wider mb-2">
              Severity of issue *
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  value: SEVERITY_LEVELS.MINOR,
                  label: 'MINOR',
                  color: 'border-yellow-400 bg-yellow-50 text-yellow-900',
                },
                {
                  value: SEVERITY_LEVELS.MODERATE,
                  label: 'MODERATE',
                  color: 'border-orange-400 bg-orange-50 text-orange-900',
                },
                {
                  value: SEVERITY_LEVELS.CRITICAL,
                  label: 'CRITICAL',
                  color: 'border-rose-400 bg-rose-50 text-rose-900',
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSeverity(opt.value)}
                  className={`min-h-[56px] rounded-2xl border-2 font-medium text-[12px] cursor-pointer ${
                    severity === opt.value ? opt.color : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!locked && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pointer-events-none max-w-md mx-auto">
          <div className="pointer-events-auto">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="w-full py-4 bg-[#1D9E75] hover:bg-[#177e5e] disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium text-[16px] rounded-2xl active:scale-[0.98] transition-all cursor-pointer disabled:cursor-not-allowed shadow-lg"
            >
              {submitting ? 'Submitting…' : isRevision ? 'Resubmit test' : 'Submit test'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
