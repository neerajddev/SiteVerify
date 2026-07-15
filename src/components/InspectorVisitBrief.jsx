import React, { useState } from 'react';
import { formatVisitDate } from '../data/projectAnalytics';
import {
  getVisitCardMeta,
  getConstructionTypeLabel,
  homeownerFirstName,
  getAssignedApplicableTests,
} from '../data/inspectorVisits';

export default function InspectorVisitBrief({
  project,
  onBack,
  onStartInspection,
  onTogglePrepItem,
  isRectification = false,
}) {
  const [studyOpen, setStudyOpen] = useState(false);
  const [takeOpen, setTakeOpen] = useState(true);
  const meta = getVisitCardMeta(project);
  const constructionType = getConstructionTypeLabel(project);
  const firstName = homeownerFirstName(project);
  const tests = getAssignedApplicableTests(project);
  const started = !!project.assignment?.inspectionStartedAt || project.projectStatus === 'Inspecting';
  const prepNotes = project.assignment?.preparationNotes;
  const checklist = project.assignment?.preparationChecklist || [];

  return (
    <div className="space-y-4 animate-fadeIn pb-8">
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <p className="text-[12px] font-medium text-[#1D9E75] uppercase tracking-wider">Visit brief</p>
          <h2 className="text-[16px] font-medium text-[#085041]">
            {meta.visitLabel}
            {meta.visitName ? ` · ${meta.visitName}` : ''}
          </h2>
        </div>
      </div>

      <header className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
        <h1 className="text-[20px] font-medium text-[#085041] leading-tight">{meta.siteName}</h1>
        <p className="text-[14px] text-slate-500 leading-[1.6]">📍 {meta.location}</p>
        {meta.mapsUrl && (
          <a
            href={meta.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-[14px] font-medium text-amber-800 underline"
          >
            Open directions in Maps →
          </a>
        )}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider">Homeowner</p>
            <p className="text-[14px] font-medium text-slate-800 mt-0.5">{firstName}</p>
          </div>
          {constructionType && (
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">Build type</p>
              <p className="text-[14px] font-medium text-slate-800 mt-0.5">{constructionType}</p>
            </div>
          )}
        </div>
        {meta.scheduled && (
          <p className="text-[12px] text-slate-500">Scheduled {formatVisitDate(meta.scheduled)}</p>
        )}
        {(project.blueprintUrl || project.blueprintFile) && (
          <div>
            {project.blueprintUrl ? (
              <a
                href={project.blueprintUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex text-[13px] font-medium text-[#085041] bg-[#E1F5EE] border border-[#1D9E75]/30 px-3 py-2 rounded-xl"
              >
                Open site drawing →
              </a>
            ) : (
              <p className="text-[12px] text-slate-400">Drawing on file: {project.blueprintFile}</p>
            )}
          </div>
        )}
      </header>

      {isRectification && project.rectificationNotes && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-[12px] font-medium text-amber-800 uppercase tracking-wider">
            Sent Back for Correction
          </p>
          <p className="text-[14px] text-amber-900 mt-1.5 leading-[1.6]">{project.rectificationNotes}</p>
        </div>
      )}

      {prepNotes && (
        <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4">
          <p className="text-[12px] font-medium text-sky-800 uppercase tracking-wider">Admin prep notes</p>
          <p className="text-[14px] text-sky-900 mt-1.5 leading-[1.6]">{prepNotes}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wider">
          Tests for this visit ({tests.length})
        </p>
        <div className="space-y-1.5">
          {tests.map(({ test }) => (
            <div
              key={test.id}
              className="flex items-center gap-2 text-[14px] bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100"
            >
              <span className="text-amber-800 font-medium flex-shrink-0">T{test.testNumber}</span>
              <span className="text-slate-700">{test.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setTakeOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left cursor-pointer"
        >
          <span className="text-[15px] font-medium text-slate-800">What to take</span>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${takeOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {takeOpen && (
          <div className="px-4 pb-4 border-t border-slate-100 space-y-2 pt-3">
            {checklist.length > 0 ? (
              checklist.map((item) => (
                <label key={item.id} className="flex items-start gap-2.5 text-[14px] text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!item.checked}
                    onChange={() => onTogglePrepItem(item.id)}
                    className="accent-[#1D9E75] mt-1 rounded"
                  />
                  <span className={item.checked ? 'line-through text-slate-400' : ''}>{item.label}</span>
                </label>
              ))
            ) : (
              <ul className="space-y-2 text-[14px] text-slate-600 leading-[1.6]">
                <li>• Tape measure, plumb bob, spirit level</li>
                <li>• Charged phone (camera for evidence)</li>
                <li>• Safety shoes and helmet</li>
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setStudyOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left cursor-pointer"
        >
          <span className="text-[15px] font-medium text-slate-800">Before you leave</span>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${studyOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {studyOpen && (
          <div className="px-4 pb-4 border-t border-slate-100 pt-3">
            <ul className="space-y-2 text-[14px] text-slate-600 leading-[1.6]">
              <li>1. Open the site drawing and note details for this visit.</li>
              <li>2. Confirm build type and access to the site.</li>
              <li>3. Each test screen will show what to check and why it matters.</li>
            </ul>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onStartInspection}
        className="w-full py-4 bg-[#1D9E75] hover:bg-[#177e5e] text-white text-[16px] font-medium rounded-2xl shadow-md active:scale-[0.98] cursor-pointer"
      >
        {started ? 'Continue inspection →' : 'Start inspection'}
      </button>
    </div>
  );
}
