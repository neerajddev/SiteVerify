import React, { useState } from 'react';
import { KERALA_CONSTRUCTION_TYPES } from '../data/keralaConstructionTypes';
import { formatVisitDate } from '../data/projectAnalytics';
import {
  getVisitTimeline,
  getNextEligibleVisitCode,
  parseDistrict,
  getMapsUrl,
  constructionTypeLocked,
} from '../data/adminVisits';
import { WORKFLOW_STATUS, getAdminStatusChip } from '../data/testWorkflow';
import ProjectChatScreen, { ProjectChatIcon } from './ProjectChat';

const STATUS_STYLES = {
  approved: 'bg-[#E1F5EE] text-[#085041] border-[#1D9E75]/30',
  submitted: 'bg-purple-50 text-purple-700 border-purple-200',
  revision: 'bg-amber-50 text-amber-800 border-amber-200',
  in_progress: 'bg-amber-50 text-amber-800 border-amber-200',
  assigned: 'bg-sky-50 text-sky-800 border-sky-200',
  not_started: 'bg-slate-50 text-slate-500 border-slate-200',
  locked: 'bg-slate-50 text-slate-400 border-slate-100',
};

export default function AdminProjectDetail({
  project,
  inspectors = [],
  currentUser = null,
  onBack,
  onAssign,
  onOpenReview,
}) {
  const [expandedCode, setExpandedCode] = useState(
    () => getNextEligibleVisitCode(project) || '1A'
  );
  const [chatOpen, setChatOpen] = useState(false);
  const timeline = getVisitTimeline(project);
  const nextCode = getNextEligibleVisitCode(project);
  const district = parseDistrict(project);
  const mapsUrl = getMapsUrl(project);
  const typeLabel =
    KERALA_CONSTRUCTION_TYPES.find((t) => t.id === project.constructionType)?.shortName ||
    project.constructionType ||
    'Not set';
  const inspector =
    inspectors.find((i) => i.id === project.inspectorId) ||
    (project.assignedInspector || project.inspector
      ? { full_name: project.assignedInspector || project.inspector, phone: '' }
      : null);
  const visitsDone = timeline.filter((t) => t.status.key === 'approved').length;
  const canAssignNext = Boolean(nextCode);

  if (chatOpen) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <ProjectChatScreen
          project={project}
          currentUser={currentUser || { role: 'admin', full_name: 'Admin' }}
          onBack={() => setChatOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-slate-600 cursor-pointer"
        >
          ← All projects
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-[#1D9E75] uppercase tracking-wider">Project detail</p>
          <h1 className="text-[22px] font-medium text-[#085041] leading-tight truncate">
            {project.projectName || `${project.homeownerName || project.homeowner}'s House`}
          </h1>
        </div>
        <ProjectChatIcon onClick={() => setChatOpen(true)} title="Open project chat" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left — project info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wider">Site</p>
            <div className="space-y-2 text-[14px] text-slate-700 leading-[1.6]">
              <p>
                <span className="text-slate-400">Homeowner · </span>
                {project.homeownerName || project.homeowner || '—'}
              </p>
              <p>
                <span className="text-slate-400">Address · </span>
                {project.location || '—'}
              </p>
              <p>
                <span className="text-slate-400">District · </span>
                {district || '—'}
                {project.pinCode ? ` · ${project.pinCode}` : ''}
              </p>
              <p>
                <span className="text-slate-400">Build type · </span>
                {typeLabel}
                {constructionTypeLocked(project) && (
                  <span className="ml-2 text-[11px] text-slate-400">(locked after first visit)</span>
                )}
              </p>
              {project.buildingPermit || project.permitNumber ? (
                <p>
                  <span className="text-slate-400">Permit · </span>
                  {project.buildingPermit || project.permitNumber}
                </p>
              ) : null}
              {project.createdAt && (
                <p>
                  <span className="text-slate-400">Registered · </span>
                  {formatVisitDate(project.createdAt)}
                </p>
              )}
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-[#085041] font-medium underline"
                >
                  Open in Maps →
                </a>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wider">
              Assigned inspector
            </p>
            {inspector && inspector.full_name !== 'Pending Assignment' ? (
              <>
                <p className="text-[16px] font-medium text-[#085041]">{inspector.full_name}</p>
                {inspector.phone && (
                  <p className="text-[14px] text-slate-500">{inspector.phone}</p>
                )}
                <p className="text-[13px] text-slate-500">
                  {visitsDone} of 9 visits approved on this project
                </p>
                <button
                  type="button"
                  onClick={() => onAssign(project.id)}
                  className="text-[13px] font-medium text-amber-800 underline cursor-pointer"
                >
                  Change inspector / reassign visit
                </button>
              </>
            ) : (
              <>
                <p className="text-[14px] text-slate-500">No inspector assigned yet.</p>
                <button
                  type="button"
                  onClick={() => onAssign(project.id)}
                  className="w-full py-3 bg-[#1D9E75] hover:bg-[#177e5e] text-white text-[15px] font-medium rounded-xl cursor-pointer"
                >
                  Assign first visit →
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right — 9-visit timeline */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-[16px] font-medium text-[#085041]">9-visit timeline</h2>
              <p className="text-[13px] text-slate-500 mt-0.5">
                Assign the next visit only after the previous one is fully approved.
              </p>
            </div>
            {canAssignNext && (
              <button
                type="button"
                onClick={() => onAssign(project.id)}
                className="flex-shrink-0 px-4 py-2.5 bg-[#1D9E75] hover:bg-[#177e5e] text-white text-[13px] font-medium rounded-xl cursor-pointer"
              >
                Assign {nextCode ? `Visit ${nextCode}` : 'next'} →
              </button>
            )}
          </div>

          <div className="space-y-2">
            {timeline.map(({ visit, status, tests, isCurrent, locked }) => {
              const expanded = expandedCode === visit.code;
              const styleKey = locked ? 'locked' : status.key;
              return (
                <div
                  key={visit.code}
                  className={`rounded-xl border ${
                    visit.adminPriority === 'critical' && status.key === 'submitted'
                      ? 'border-rose-300 bg-rose-50/40'
                      : isCurrent
                        ? 'border-amber-300 bg-amber-50/30'
                        : 'border-slate-100'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedCode(expanded ? null : visit.code)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 cursor-pointer"
                  >
                    <span
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-medium flex-shrink-0 border ${
                        STATUS_STYLES[styleKey] || STATUS_STYLES.not_started
                      }`}
                    >
                      {visit.code}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium text-slate-800">
                        {visit.visitLabel} · {visit.name}
                      </p>
                      <p className="text-[12px] text-slate-500 mt-0.5">
                        {locked
                          ? 'Locked — finish previous visit first'
                          : status.date
                            ? `${status.label} · ${formatVisitDate(status.date)}`
                            : status.label}
                        {visit.adminPriority === 'critical' ? ' · Critical window' : ''}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${
                        STATUS_STYLES[styleKey] || STATUS_STYLES.not_started
                      }`}
                    >
                      {locked ? 'Locked' : status.label}
                    </span>
                  </button>

                  {expanded && (
                    <div className="px-4 pb-4 border-t border-slate-100/80 pt-3 space-y-2">
                      {tests.map(({ test, stage, subStage }) => {
                        const chip = getAdminStatusChip(test.workflowStatus || WORKFLOW_STATUS.NOT_STARTED);
                        const canReview = test.workflowStatus === WORKFLOW_STATUS.SUBMITTED;
                        return (
                          <div
                            key={test.id}
                            className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="text-[14px] text-slate-800">
                                <span className="text-amber-800 font-medium">T{test.testNumber}</span>{' '}
                                {test.name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${chip.className}`}>
                                {chip.label}
                              </span>
                              {canReview && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenReview({
                                      projectId: project.id,
                                      stageId: stage.id,
                                      subStageId: subStage.id,
                                      testId: test.id,
                                    })
                                  }
                                  className="text-[12px] font-medium text-[#085041] underline cursor-pointer"
                                >
                                  Review
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!canAssignNext && (
            <p className="mt-4 text-[14px] text-[#085041] bg-[#E1F5EE] border border-[#1D9E75]/30 rounded-xl px-4 py-3">
              All 9 visits approved — project complete.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
