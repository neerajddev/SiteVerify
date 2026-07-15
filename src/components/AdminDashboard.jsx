import React, { useState } from 'react';
import { STATUS_ENUMS, generateAiFeedback } from '../data/mockData';
import { getSubStagesForStage as getStageSubStages } from '../data/stageStructure';
import {
  WORKFLOW_STATUS,
  updateTestInProject,
  findTestInProject,
  getAdminStatusChip,
} from '../data/testWorkflow';
import AdminTestReviewScreen from './AdminTestReviewScreen';
import AdminAssignTaskModal from './AdminAssignTaskModal';
import AdminKnowledgeBase from './AdminKnowledgeBase';
import AdminProjectDetail from './AdminProjectDetail';
import AdminReviewQueue from './AdminReviewQueue';
import {
  getProjectTestStats,
  getInspectorWorkload,
  getRecentActivity,
  formatVisitDate,
  getAssignmentScopeLabel,
  recalcProjectProgress,
  DEFAULT_PREP_CHECKLIST,
  getAllTestsFromProject,
} from '../data/projectAnalytics';
import { KERALA_CONSTRUCTION_TYPES } from '../data/keralaConstructionTypes';
import { applyRrFoundationNa } from '../data/stageStructure';
import { getVisitByCode } from '../data/visitStructure';
import {
  sortReviewQueue,
  getProjectAttentionFlag,
  parseDistrict,
  countIssuesFlaggedThisWeek,
} from '../data/adminVisits';

function getSubStageKey(stage, project) {
  if (stage?.subStages) return 'subStages';
  if (stage?.id === 'stage_1') {
    return project?.foundationType === 'rr' ? 'subStagesRR' : 'subStagesCF';
  }
  return 'subStages';
}

export default function AdminDashboard({ 
  projects, 
  onUpdateProjects, 
  onSelectActiveProject, 
  activeProjectId,
  inspectors = [],
  currentUser = null,
}) {
  const [selectedAuditProjId, setSelectedAuditProjId] = useState(null);
  const [activeStageIndex, setActiveStageIndex]        = useState(0);
  const [activeTab, setActiveTab]                      = useState('all');
  const [rectificationNotes, setRectificationNotes]    = useState('');
  const [showRectificationInput, setShowRectificationInput] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [adminSection, setAdminSection] = useState('overview');
  const [assignProjectId, setAssignProjectId] = useState(null);
  const [detailProjectId, setDetailProjectId] = useState(null);

  const getProjStatus = (proj) => proj.projectStatus || proj.status || (proj.inspector === 'Pending Assignment' ? 'Pending Assignment' : 'Inspecting');

  const getCount = (tabId) => {
    return projects.filter(p => {
      const s = getProjStatus(p);
      if (tabId === 'all')                return true;
      if (tabId === 'pending_assignment') return s === 'Pending Assignment';
      if (tabId === 'inspecting')         return s === 'Inspecting';
      if (tabId === 'pending_qa')         return s === 'Pending QA Review' || s === 'Pending Approval';
      if (tabId === 'rectification')      return s === 'Rectification Required';
      if (tabId === 'qa_certified')       return s === 'QA Certified' || s === 'QA Approved';
      return false;
    }).length;
  };

  const filteredProjects = projects.filter(p => {
    const s = getProjStatus(p);
    if (activeTab === 'all')                return true;
    if (activeTab === 'pending_assignment') return s === 'Pending Assignment';
    if (activeTab === 'inspecting')         return s === 'Inspecting';
    if (activeTab === 'pending_qa')         return s === 'Pending QA Review' || s === 'Pending Approval';
    if (activeTab === 'rectification')      return s === 'Rectification Required';
    if (activeTab === 'qa_certified')       return s === 'QA Certified' || s === 'QA Approved';
    return true;
  });

  // ── STATISTICS ───────────────────────────────────────────────────────────────
  const totalProjects = projects.length;
  const totalPassed = projects.reduce((acc, p) => {
    return acc + p.stages.reduce((accStage, s) => {
      const subStages = s.subStages || (p.foundationType === 'rr' ? s.subStagesRR : s.subStagesCF) || [];
      return accStage + subStages.reduce((accSub, sub) => {
        return accSub + sub.tests.filter(t => t.status === STATUS_ENUMS.PASS).length;
      }, 0);
    }, 0);
  }, 0);
  
  const pendingApprovals = projects.reduce((acc, p) => {
    return acc + p.stages.reduce((accStage, s) => {
      const subStages = s.subStages || (p.foundationType === 'rr' ? s.subStagesRR : s.subStagesCF) || [];
      return accStage + subStages.reduce((accSub, sub) => {
        return accSub + sub.tests.filter(t => t.status === STATUS_ENUMS.ATTENTION || t.status === STATUS_ENUMS.CRITICAL).length;
      }, 0);
    }, 0);
  }, 0);

  const workflowStats = projects.reduce(
    (acc, p) => {
      const s = getProjectTestStats(p);
      acc.submitted += s.submitted;
      acc.approved += s.approved;
      acc.pending += s.pending;
      return acc;
    },
    { submitted: 0, approved: 0, pending: 0 }
  );

  const inspectorWorkload = getInspectorWorkload(projects, inspectors);
  const recentActivity = getRecentActivity(projects, 15);
  const assignProject = projects.find((p) => p.id === assignProjectId);

  const reviewQueue = sortReviewQueue(
    projects.flatMap((p) =>
      getAllTestsFromProject(p)
        .filter(({ test }) => test.workflowStatus === WORKFLOW_STATUS.SUBMITTED)
        .map(({ stage, subStage, test }) => ({
          project: p,
          stage,
          subStage,
          test,
          submittedAt: test.submittedAt || '',
          visitCode: subStage?.code,
        }))
    )
  );
  const issuesThisWeek = countIssuesFlaggedThisWeek(projects);
  const detailProject = projects.find((p) => p.id === detailProjectId);

  const constructionTypeLabel = (id) =>
    KERALA_CONSTRUCTION_TYPES.find((t) => t.id === id)?.shortName || null;

  const handleAssignTask = async (projId, assignmentDetails) => {
    const updated = projects.map((p) => {
      if (p.id !== projId) return p;
      const assignment = {
        ...assignmentDetails,
        preparationChecklist: DEFAULT_PREP_CHECKLIST.map((item) => ({ ...item, checked: false })),
        assignedAt: new Date().toISOString(),
        assignedBy: 'Admin',
      };
      const visit = assignment.visitCodes?.[0] ? getVisitByCode(assignment.visitCodes[0]) : null;
      const scopeLabel =
        assignment.scope === 'full'
          ? 'full project'
          : assignment.scope === 'visit'
            ? `Visit ${(assignment.visitCodes || []).join(', ')}${visit ? ` (${visit.name})` : ''}`
            : assignment.scope === 'stage'
              ? `stage(s): ${(assignment.stageIds || []).join(', ')}`
              : `${(assignment.testIds || []).length} test(s)`;

      let stages = p.stages;
      if (assignmentDetails.applyRrNa) {
        stages = applyRrFoundationNa(stages, {
          ...p,
          foundationType: assignmentDetails.foundationType || p.foundationType,
          constructionType: assignmentDetails.constructionType || p.constructionType,
          plinthBeamType: assignmentDetails.plinthBeamType,
        });
      }

      const prevAssignment = p.assignment;
      const visitHistory = [...(p.visitHistory || [])];
      if (
        prevAssignment?.visitCodes?.[0] &&
        prevAssignment.visitCodes[0] !== assignment.visitCodes?.[0]
      ) {
        visitHistory.push({
          ...prevAssignment,
          visitCode: prevAssignment.visitCodes[0],
          archivedAt: new Date().toISOString(),
        });
      }

      return {
        ...p,
        stages,
        inspectorId: assignmentDetails.inspectorId,
        inspector: assignmentDetails.inspectorName,
        assignedInspector: assignmentDetails.inspectorName,
        constructionType: assignmentDetails.constructionType || p.constructionType || null,
        foundationType: assignmentDetails.foundationType || p.foundationType,
        plinthBeamType: assignmentDetails.plinthBeamType || p.plinthBeamType || null,
        assignment,
        visitHistory,
        status: 'Inspecting',
        projectStatus: 'Inspecting',
        currentPhase: visit ? `${visit.visitLabel} — ${visit.name}` : p.currentPhase,
        historyLogs: [
          ...(p.historyLogs || []),
          {
            action: `Inspection task assigned to ${assignmentDetails.inspectorName} (${scopeLabel})${assignment.scheduledVisitAt ? ` · Visit ${formatVisitDate(assignment.scheduledVisitAt)}` : ''}`,
            by: 'Admin',
            timestamp: new Date().toISOString(),
          },
        ],
      };
    });
    await onUpdateProjects(updated);
  };

  const handleAssignInspector = (projId, inspectorId, inspectorName) => {
    const updated = projects.map(p => {
      if (p.id !== projId) return p;
      const newStatus = !inspectorId ? 'Pending Assignment' : 'Inspecting';
      return {
        ...p,
        inspectorId: inspectorId || null,
        inspector: inspectorName,
        assignedInspector: inspectorName,
        status: newStatus,
        projectStatus: newStatus,
        historyLogs: [
          ...(p.historyLogs || []),
          {
            action: inspectorId
              ? `Inspector assigned: ${inspectorName}`
              : 'Inspector unassigned',
            by: 'Admin',
            timestamp: new Date().toISOString(),
          },
        ],
      };
    });
    onUpdateProjects(updated);
  };

  const getInspectorSelectValue = (proj) => {
    if (proj.inspectorId) return proj.inspectorId;
    if (proj.inspector === 'Pending Assignment') return 'pending';
    const match = inspectors.find(
      (i) => i.full_name === proj.inspector || i.full_name === proj.assignedInspector
    );
    return match?.id || 'pending';
  };

  const handleOpenAuditModal = (projId) => {
    setSelectedAuditProjId(projId);
    const proj = projects.find(p => p.id === projId);
    const status = getProjStatus(proj);
    if (status === 'Pending Assignment') {
      setActiveStageIndex('ai');
    } else {
      setActiveStageIndex(2); // Default to Slab stage
    }
  };

  const handleQAApproveProject = (projId) => {
    const updated = projects.map(p => {
      if (p.id !== projId) return p;
      const updatedStages = p.stages.map(stage => {
        const subStageKey = getSubStageKey(stage, p);
        const subStages    = stage[subStageKey] || [];
        const updatedSubStages = subStages.map(sub => ({
          ...sub,
          progress: 100,
          tests: sub.tests.map(t => ({
            ...t,
            status: STATUS_ENUMS.PASS,
            measuredValue: t.measuredValue !== undefined ? t.measuredValue : (
              t.id.includes('t1') || t.id.includes('cf_1_1') ? ((p.aiCalibratedSpecs?.minTrenchDepthMeters) || ((p.location || '').includes('Thrissur') ? 1.5 : 1.8))
              : t.id.includes('t2') || t.id.includes('2_1_2') ? 10
              : t.id.includes('2_1_1') ? 1.5 : undefined
            )
          }))
        }));
        const newStage = { ...stage };
        newStage[subStageKey] = updatedSubStages;
        newStage.progress = 100; newStage.status = 'Complete';
        return newStage;
      });
      return {
        ...p,
        totalProgress:  100,
        status:         'QA Certified',
        projectStatus:  'QA Certified',
        rectificationNotes: '',
        historyLogs: [
          ...(p.historyLogs || []),
          { action: 'QA Certified by Admin', by: 'Admin', timestamp: new Date().toISOString() }
        ],
        stages: updatedStages
      };
    });
    onUpdateProjects(updated);
    setSelectedAuditProjId(null);
    setShowRectificationInput(false);
    setRectificationNotes('');
  };

  // Admin issues a rectification order, looping the project back to the inspector
  const handleIssueRectification = (projId) => {
    if (!rectificationNotes.trim()) return;
    const updated = projects.map(p => {
      if (p.id !== projId) return p;
      return {
        ...p,
        status:             'Rectification Required',
        projectStatus:      'Rectification Required',
        rectificationNotes: rectificationNotes.trim(),
        historyLogs: [
          ...(p.historyLogs || []),
          { action: `Rectification order issued: ${rectificationNotes.trim()}`, by: 'Admin', timestamp: new Date().toISOString() }
        ]
      };
    });
    onUpdateProjects(updated);
    setSelectedAuditProjId(null);
    setShowRectificationInput(false);
    setRectificationNotes('');
  };

  const handleApproveTestWorkflow = async (projId, stageId, subStageId, testId, extras = {}) => {
    let updated = updateTestInProject(projects, projId, stageId, subStageId, testId, {
      workflowStatus: WORKFLOW_STATUS.APPROVED,
      approvedAt: new Date().toISOString(),
      approvedBy: extras.approvedBy || 'Admin',
      adminNote: extras.adminNote || null,
      inspectorPayoutFlag: true,
      status: STATUS_ENUMS.PASS,
    });
    updated = updated.map((p) => {
      if (p.id !== projId) return p;
      return { ...p, totalProgress: recalcProjectProgress(p) };
    });
    await onUpdateProjects(updated);
  };

  const handleSendBackTest = async (projId, stageId, subStageId, testId, extras = {}) => {
    const updated = updateTestInProject(projects, projId, stageId, subStageId, testId, {
      workflowStatus: WORKFLOW_STATUS.REVISION_REQUESTED,
      revisionReason: extras.revisionReason,
      adminNote: extras.adminNote || null,
    });
    await onUpdateProjects(updated);
  };

  const activeAuditProject = projects.find(p => p.id === selectedAuditProjId);
  // Use per-project drawing-extracted specs (no location-based lookup)
  const activeAuditSpecs = activeAuditProject?.aiCalibratedSpecs || null;

  const getSubStagesForStage = (stage) => getStageSubStages(stage);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Admin Console</h1>
            <p className="text-xs text-slate-400 font-bold mt-1">Assign inspectors, review submissions, publish reports to homeowners</p>
          </div>
          <div className="flex items-center gap-1 bg-white border border-slate-200 shadow-sm p-1.5 rounded-xl text-xs text-slate-500 font-bold">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Operations Active
          </div>
        </header>

        {/* Section navigation */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'overview', label: 'Dashboard' },
            { id: 'review', label: `Review${workflowStats.submitted ? ` (${workflowStats.submitted})` : ''}` },
            { id: 'projects', label: 'All projects' },
            { id: 'inspectors', label: 'Inspector status' },
            { id: 'knowledge', label: 'Knowledge' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setDetailProjectId(null);
                setAdminSection(tab.id);
              }}
              className={`px-4 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                adminSection === tab.id
                  ? 'bg-indigo-600 border-indigo-700 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Project detail or section content */}
        {detailProject ? (
          <AdminProjectDetail
            project={detailProject}
            inspectors={inspectors}
            currentUser={currentUser || { role: 'admin', full_name: 'Admin' }}
            onBack={() => setDetailProjectId(null)}
            onAssign={(id) => setAssignProjectId(id)}
            onOpenReview={(target) => {
              setSelectedAuditProjId(target.projectId);
              setReviewTarget(target);
            }}
          />
        ) : null}

        {/* OVERVIEW DASHBOARD */}
        {!detailProject && adminSection === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div
                className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm cursor-pointer hover:border-amber-400"
                onClick={() => {
                  setAdminSection('projects');
                  setActiveTab('pending_assignment');
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setAdminSection('projects');
                    setActiveTab('pending_assignment');
                  }
                }}
              >
                <p className="text-[10px] font-black text-slate-400 uppercase">New to assign</p>
                <p className="text-2xl font-black text-amber-600 mt-1">{getCount('pending_assignment')}</p>
                <p className="text-[10px] text-amber-700 font-bold mt-1">Open & assign →</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase">Active sites</p>
                <p className="text-2xl font-black text-sky-600 mt-1">{getCount('inspecting')}</p>
              </div>
              <div
                className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm cursor-pointer hover:border-indigo-200"
                onClick={() => setAdminSection('review')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setAdminSection('review')}
              >
                <p className="text-[10px] font-black text-slate-400 uppercase">Tests submitted</p>
                <p className="text-2xl font-black text-purple-600 mt-1">{workflowStats.submitted}</p>
                <p className="text-[10px] text-indigo-600 font-bold mt-1">Open review queue →</p>
              </div>
              <div
                className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm cursor-pointer hover:border-rose-200"
                onClick={() => setAdminSection('review')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setAdminSection('review')}
              >
                <p className="text-[10px] font-medium text-slate-400 uppercase">Issues this week</p>
                <p className="text-2xl font-medium text-rose-600 mt-1">{issuesThisWeek}</p>
                <p className="text-[10px] text-rose-700 font-medium mt-1">Moderate / critical flags</p>
              </div>
            </div>

            {/* Explicit assign queue — most visible place for new projects */}
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-amber-100 bg-amber-50/60 flex justify-between items-center gap-3">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">New projects — assign inspector</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Homes registered by homeowners land here. Assign one visit (usually 1A) to an inspector.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAdminSection('projects');
                    setActiveTab('pending_assignment');
                  }}
                  className="text-[10px] font-black text-amber-800 cursor-pointer whitespace-nowrap"
                >
                  View all →
                </button>
              </div>
              <div className="divide-y divide-slate-50">
                {projects.filter((p) => getProjStatus(p) === 'Pending Assignment').length === 0 ? (
                  <p className="p-6 text-sm text-slate-400 text-center">
                    No new projects waiting. When a homeowner registers a site, it appears here.
                  </p>
                ) : (
                  projects
                    .filter((p) => getProjStatus(p) === 'Pending Assignment')
                    .map((proj) => (
                      <div key={proj.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="font-extrabold text-slate-800 text-sm">
                            {proj.projectName || proj.homeownerName || proj.homeowner}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {proj.location}
                            {proj.blueprintName || proj.blueprintFile
                              ? ` · Drawing: ${proj.blueprintName || proj.blueprintFile}`
                              : ''}
                          </p>
                          <p className="text-[10px] text-amber-700 font-bold mt-1">Status: Pending Assignment</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAssignProjectId(proj.id)}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black rounded-xl cursor-pointer self-start sm:self-center"
                        >
                          Assign inspector →
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="font-extrabold text-slate-800 text-sm">Inspector status</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Workload per field inspector</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {inspectorWorkload.length === 0 ? (
                    <p className="p-6 text-sm text-slate-400 text-center">No inspectors assigned yet</p>
                  ) : (
                    inspectorWorkload.map((w) => (
                      <div key={w.id} className="px-5 py-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-extrabold text-slate-800 text-sm">{w.name}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {w.activeSites} active · {w.pendingQA} in QA · {w.testsDue} tests due
                          </p>
                          {w.nextVisit && (
                            <p className="text-[10px] text-indigo-600 font-bold mt-1">
                              Next visit: {formatVisitDate(w.nextVisit)}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-[10px] font-bold text-slate-500">
                          <span className="block text-purple-600">{w.testsSubmitted} submitted</span>
                          <span className="block text-[#1D9E75]">{w.testsApproved} approved</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="font-extrabold text-slate-800 text-sm">Recent updates</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Latest activity across all projects</p>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {recentActivity.length === 0 ? (
                    <p className="p-6 text-sm text-slate-400 text-center">No activity yet</p>
                  ) : (
                    recentActivity.map((ev) => (
                      <div key={ev.id} className="px-5 py-3">
                        <p className="text-xs font-bold text-slate-800">{ev.siteName}</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">{ev.action}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {ev.by} · {formatVisitDate(ev.timestamp)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-extrabold text-slate-800 text-sm">Projects needing attention</h3>
              </div>
              <div className="divide-y divide-slate-50">
                {projects
                  .filter((p) => {
                    const s = getProjStatus(p);
                    return s === 'Pending Assignment' || s === 'Pending QA Review' || s === 'Rectification Required' || getProjectTestStats(p).submitted > 0;
                  })
                  .slice(0, 8)
                  .map((proj) => {
                    const stats = getProjectTestStats(proj);
                    const status = getProjStatus(proj);
                    return (
                      <div key={proj.id} className="px-5 py-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-extrabold text-slate-800 text-sm">{proj.projectName || proj.homeownerName}</p>
                          <p className="text-[11px] text-slate-500">{proj.location} · {proj.assignedInspector || 'Unassigned'}</p>
                          {stats.submitted > 0 && (
                            <p className="text-[10px] text-purple-600 font-bold mt-1">{stats.submitted} test(s) awaiting your review</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {status === 'Pending Assignment' && (
                            <button type="button" onClick={() => setAssignProjectId(proj.id)} className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-lg cursor-pointer">
                              Assign
                            </button>
                          )}
                          <button type="button" onClick={() => handleOpenAuditModal(proj.id)} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-[10px] font-black rounded-lg cursor-pointer">
                            Review
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* REVIEW QUEUE */}
        {!detailProject && adminSection === 'review' && (
          <AdminReviewQueue
            queue={reviewQueue}
            projects={projects}
            constructionTypeLabel={constructionTypeLabel}
            onApprove={async (projectId, stageId, subStageId, testId, extras) => {
              await handleApproveTestWorkflow(projectId, stageId, subStageId, testId, extras);
            }}
            onSendBack={async (projectId, stageId, subStageId, testId, extras) => {
              await handleSendBackTest(projectId, stageId, subStageId, testId, extras);
            }}
          />
        )}

        {!detailProject && adminSection === 'knowledge' && <AdminKnowledgeBase />}

        {/* INSPECTOR STATUS DASHBOARD */}
        {!detailProject && adminSection === 'inspectors' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800">Inspector workload</h3>
              <p className="text-xs text-slate-400 mt-1">Track each inspector's sites, visits, and test progress</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-3">Inspector</th>
                    <th className="px-6 py-3">Active sites</th>
                    <th className="px-6 py-3">Tests due</th>
                    <th className="px-6 py-3">Submitted</th>
                    <th className="px-6 py-3">Approved</th>
                    <th className="px-6 py-3">Next visit</th>
                    <th className="px-6 py-3">Assigned projects</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {inspectorWorkload.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400">No inspector assignments yet</td></tr>
                  ) : (
                    inspectorWorkload.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-extrabold text-slate-800">{w.name}</td>
                        <td className="px-6 py-4">{w.activeSites}</td>
                        <td className="px-6 py-4 text-amber-600 font-bold">{w.testsDue}</td>
                        <td className="px-6 py-4 text-purple-600 font-bold">{w.testsSubmitted}</td>
                        <td className="px-6 py-4 text-[#1D9E75] font-bold">{w.testsApproved}</td>
                        <td className="px-6 py-4 text-xs text-slate-600">{w.nextVisit ? formatVisitDate(w.nextVisit) : '—'}</td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {w.projects.map(({ project: p, stats }) => (
                              <div key={p.id} className="text-[11px] text-slate-600">
                                <span className="font-bold">{p.projectName || p.homeownerName}</span>
                                <span className="text-slate-400"> · {stats.approved}/{stats.total} done</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!detailProject && adminSection === 'projects' && (
        <>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg">
              📊
            </div>
            <div>
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Sites</span>
              <span className="font-extrabold text-xl text-slate-800 block mt-1.5">{totalProjects} Projects</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg">
              ✓
            </div>
            <div>
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Passed Checks</span>
              <span className="font-extrabold text-xl text-slate-800 block mt-1.5">{totalPassed} Verified</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black text-lg">
              ⚠️
            </div>
            <div>
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Deviations Logged</span>
              <span className="font-extrabold text-xl text-slate-800 block mt-1.5">{pendingApprovals} Warnings</span>
            </div>
          </div>
        </div>

        {/* Tabs Filter Bar */}
        <div className="flex flex-wrap gap-2 pb-2">
          {[
            { id: 'all',                label: 'All Projects',          color: 'indigo' },
            { id: 'pending_assignment', label: 'Pending Assignment',     color: 'amber' },
            { id: 'inspecting',         label: 'Inspecting',             color: 'sky' },
            { id: 'pending_qa',         label: 'Waiting for Admin Review', color: 'rose' },
            { id: 'rectification',      label: 'Rectification',          color: 'orange' },
            { id: 'qa_certified',       label: 'QA Certified',           color: 'emerald' },
          ].map(tab => {
            const count = getCount(tab.id);
            const isSelected = activeTab === tab.id;
            let btnClass = '';
            if (isSelected) {
              if (tab.color === 'indigo')  btnClass = 'bg-indigo-600 border-indigo-700 text-white shadow shadow-indigo-500/25';
              else if (tab.color === 'amber')   btnClass = 'bg-amber-500 border-amber-600 text-slate-900 shadow shadow-amber-500/25';
              else if (tab.color === 'sky')     btnClass = 'bg-sky-500 border-sky-600 text-white shadow shadow-sky-500/25';
              else if (tab.color === 'rose')    btnClass = 'bg-rose-500 border-rose-600 text-white shadow shadow-rose-500/25';
              else if (tab.color === 'orange')  btnClass = 'bg-orange-500 border-orange-600 text-white shadow shadow-orange-500/25';
              else if (tab.color === 'emerald') btnClass = 'bg-emerald-500 border-emerald-600 text-white shadow shadow-emerald-500/25';
            } else {
              btnClass = 'bg-white text-slate-655 border-slate-200 hover:bg-slate-50';
            }
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${btnClass}`}>
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                  isSelected ? (tab.color === 'amber' ? 'bg-slate-900/10 text-slate-900' : 'bg-white/20 text-white') : 'bg-slate-100 text-slate-500 border border-slate-200/50'
                }`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Projects Control Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-md overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Site assignments</h3>
            <span className="text-[10px] text-slate-400 font-bold">List of Residential Sites</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/20">
                  <th className="px-6 py-4">Homeowner & Site</th>
                  <th className="px-6 py-4">Stage & Drawing</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Assigned Inspector</th>
                  <th className="px-6 py-4">Stage Progress</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-slate-400 font-bold bg-white text-xs">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <span className="text-2xl">📭</span>
                        <p>No sites found in this category.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map(proj => {
                    const isActive = activeProjectId === proj.id;
                    const status = getProjStatus(proj);
                    const attention = getProjectAttentionFlag(proj);
                    const district = parseDistrict(proj);
                    
                    return (
                      <tr key={proj.id} className={`hover:bg-slate-50/30 transition-colors ${isActive ? 'bg-indigo-50/10' : ''} ${attention?.tone === 'rose' ? 'bg-rose-50/20' : attention?.tone === 'amber' ? 'bg-amber-50/20' : ''}`}>
                        <td className="px-6 py-4.5">
                          <button
                            type="button"
                            onClick={() => setDetailProjectId(proj.id)}
                            className="text-left cursor-pointer group"
                          >
                            <span className="font-medium text-[#085041] block leading-tight group-hover:underline">
                              {proj.projectName || proj.homeownerName || proj.homeowner}
                            </span>
                          </button>
                          <span className="text-[12px] text-slate-400 block mt-0.5">
                            {proj.homeownerName || proj.homeowner}
                            {district ? ` · ${district}` : ''}
                            {proj.pinCode ? ` · PIN ${proj.pinCode}` : ''}
                          </span>
                          <span className="text-[12px] text-slate-400 block mt-0.5">{proj.location}</span>
                          {constructionTypeLabel(proj.constructionType) && (
                            <span className="text-[12px] text-[#085041] font-medium block mt-0.5">
                              {constructionTypeLabel(proj.constructionType)}
                            </span>
                          )}
                          {attention && (
                            <span className={`inline-block mt-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                              attention.tone === 'rose'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {attention.label}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4.5">
                          <span className="font-bold text-slate-700 block">
                            {proj.currentPhase || proj.current_phase || '—'}
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            {proj.blueprintName}
                          </span>
                        </td>
                        <td className="px-6 py-4.5">
                          {(() => {
                            let badgeClass = 'bg-slate-50 text-slate-600 border-slate-200';
                            let label = status;
                            if (status === 'Pending Assignment')   { badgeClass = 'bg-amber-50 text-amber-700 border-amber-200'; }
                            else if (status === 'Inspecting')      { badgeClass = 'bg-sky-50 text-sky-700 border-sky-200'; }
                            else if (status === 'Pending QA Review' || status === 'Pending Approval') { badgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse'; label = 'Waiting for Admin Review'; }
                            else if (status === 'Rectification Required') { badgeClass = 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'; label = '🔧 Rectification'; }
                            else if (status === 'QA Certified' || status === 'QA Approved') { badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-250'; label = 'QA Certified'; }
                            return (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border ${badgeClass}`}>
                                {label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4.5">
                          <div className="space-y-1.5">
                            <p className="font-bold text-slate-700 text-xs">
                              {proj.assignedInspector || proj.inspector || 'Unassigned'}
                            </p>
                            {proj.assignment?.scheduledVisitAt && (
                              <p className="text-[10px] text-indigo-600 font-bold">
                                Visit: {formatVisitDate(proj.assignment.scheduledVisitAt)}
                              </p>
                            )}
                            {proj.assignment && (
                              <p className="text-[10px] text-slate-400">
                                {getAssignmentScopeLabel(proj.assignment)}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => setAssignProjectId(proj.id)}
                              className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 cursor-pointer"
                            >
                              {proj.inspectorId ? 'Reassign task' : 'Assign task'} →
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-800 text-xs">{proj.totalProgress}%</span>
                            <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                              <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${proj.totalProgress}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDetailProjectId(proj.id)}
                              className="bg-[#E1F5EE] hover:bg-[#d0eee3] text-[#085041] text-xs font-medium px-3.5 py-2 rounded-xl transition-all shadow-sm border border-[#1D9E75]/30 cursor-pointer"
                            >
                              Open project
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenAuditModal(proj.id)}
                              className="bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium px-3 py-2 rounded-xl transition-all border border-slate-200 cursor-pointer"
                            >
                              Stages
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}

      </div>

      {assignProjectId && assignProject && (
        <AdminAssignTaskModal
          project={assignProject}
          inspectors={inspectors}
          projects={projects}
          onClose={() => setAssignProjectId(null)}
          onAssign={(details) => handleAssignTask(assignProjectId, details)}
        />
      )}

      {/* ── QA REVIEW AUDIT DETAIL MODAL ───────────────────────────────────────── */}
      {selectedAuditProjId && activeAuditProject && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedAuditProjId(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-fadeInUp"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-5 flex items-start justify-between z-10 rounded-t-3xl shadow-sm">
              <div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">QA review</span>
                <h2 className="text-lg font-black text-slate-800 mt-1">{activeAuditProject.homeownerName || activeAuditProject.homeowner}'s Site</h2>
                <p className="text-xs text-slate-400 font-bold">{activeAuditProject.location} • System: {activeAuditProject.foundationType === 'rr' ? 'Random Rubble (RR)' : 'Column Footing'}</p>
                {activeAuditProject.blueprintUrl && (
                  <a
                    href={activeAuditProject.blueprintUrl}
                    download={activeAuditProject.blueprintFile || activeAuditProject.blueprintName}
                    className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    📎 View uploaded drawing ({activeAuditProject.blueprintFile || activeAuditProject.blueprintName})
                  </a>
                )}
              </div>
              <button 
                onClick={() => setSelectedAuditProjId(null)}
                className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Status Informative Banners */}
            {(getProjStatus(activeAuditProject) === 'Pending QA Review' || getProjStatus(activeAuditProject) === 'Pending Approval') && (
              <div className="mx-6 mt-4 p-3.5 bg-indigo-50 border border-indigo-150 rounded-2xl flex items-start gap-2.5">
                <span className="text-lg leading-none">📋</span>
                <div className="text-xs text-indigo-950 font-medium">
                  <strong className="block font-black text-indigo-900 mb-0.5">Ready for your review</strong>
                  <span className="text-[11px] text-indigo-700">Inspector submitted this site. Approve checks, then publish to homeowner.</span>
                  Field Auditor <strong className="text-indigo-900">{activeAuditProject.assignedInspector || activeAuditProject.inspector}</strong> has submitted the inspection report. Review metrics and certify or issue a rectification order.
                </div>
              </div>
            )}
            {(getProjStatus(activeAuditProject) === 'QA Certified' || getProjStatus(activeAuditProject) === 'QA Approved') && (
              <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-150 rounded-2xl flex items-start gap-2.5">
                <span className="text-lg leading-none">✓</span>
                <div className="text-xs text-emerald-950 font-medium">
                  <strong className="block font-black text-emerald-900 mb-0.5">Report published</strong>
                  <span className="text-[11px] text-emerald-700">Homeowner can now see the full inspection report.</span>
                  This project has been certified. The final report is published on the homeowner's portal.
                </div>
              </div>
            )}
            {getProjStatus(activeAuditProject) === 'Rectification Required' && (
              <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-rose-600">🔧</span>
                  <strong className="text-xs font-black text-rose-700">Rectification Order Active</strong>
                </div>
                <p className="text-xs text-rose-700 font-medium leading-snug">{activeAuditProject.rectificationNotes}</p>
                <p className="text-[10px] text-rose-500 font-bold">Inspector has been notified. Awaiting correction & re-submission.</p>
              </div>
            )}

            {/* Stage Selector tabs */}
            <div className="p-4 border-b border-slate-50 bg-slate-50/20">
              <div className="flex overflow-x-auto gap-2.5 pb-1.5 scrollbar-thin">
                <button
                  onClick={() => setActiveStageIndex('ai')}
                  className={`flex-shrink-0 px-3.5 py-2 text-xs font-bold rounded-xl border whitespace-nowrap transition-all cursor-pointer ${
                    activeStageIndex === 'ai'
                      ? 'bg-violet-600 border-violet-700 text-white shadow shadow-violet-500/25 font-black'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  🤖 AI Geotech Report
                </button>
                {activeAuditProject.stages.map((stage, idx) => (
                  <button
                    key={stage.id}
                    onClick={() => setActiveStageIndex(idx)}
                    className={`flex-shrink-0 px-3.5 py-2 text-xs font-bold rounded-xl border whitespace-nowrap transition-all cursor-pointer ${
                      activeStageIndex === idx
                        ? 'bg-indigo-500 border-indigo-600 text-white shadow shadow-indigo-500/25 font-black'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {stage.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Inspection details lists */}
            <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
              {activeStageIndex === 'ai' ? (
                <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-850">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">
                      🤖 Gemini AI Geotechnical & Blueprint Report
                    </span>
                    <span className="text-[8px] bg-indigo-500/10 text-indigo-305 border border-indigo-500/20 px-2 py-0.5 rounded uppercase font-black animate-pulse">
                      Simulated Gemini Pro
                    </span>
                  </div>
                <div className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line bg-slate-950/40 p-4 border border-slate-850 rounded-xl max-h-80 overflow-y-auto scrollbar-thin">
                    {activeAuditProject.aiFeedback || generateAiFeedback(
                      activeAuditProject.location,
                      activeAuditProject.blueprintFile || activeAuditProject.blueprintName,
                      activeAuditProject.aiCalibratedSpecs,
                      [],
                      activeAuditProject.totalProgress > 0
                    )}
                  </div>
                </div>
              ) : (
                (() => {
                  const stage = activeAuditProject.stages[activeStageIndex];
                  if (!stage) return null;
                  const subStages = getSubStagesForStage(stage);
                  
                  if (subStages.length === 0) {
                    return (
                      <div className="text-center py-8 text-slate-400 text-xs">
                        No inspection tests recorded for this stage.
                      </div>
                    );
                  }

                  return subStages.map(subStage => (
                    <div key={subStage.id} className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 border-b border-slate-50 pb-1.5">
                        Visit {subStage.code}: {subStage.name}
                      </h4>
                      
                      <div className="space-y-3">
                        {subStage.tests.map(test => {
                          const wfStatus = test.workflowStatus || WORKFLOW_STATUS.NOT_STARTED;
                          const statusChip = getAdminStatusChip(wfStatus);
                          const canReview = wfStatus === WORKFLOW_STATUS.SUBMITTED;

                          return (
                            <button
                              key={test.id}
                              type="button"
                              onClick={() =>
                                canReview &&
                                setReviewTarget({
                                  projectId: activeAuditProject.id,
                                  stageId: stage.id,
                                  subStageId: subStage.id,
                                  testId: test.id,
                                })
                              }
                              disabled={!canReview}
                              className={`w-full text-left bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2 transition-all ${
                                canReview ? 'hover:border-purple-300 hover:bg-purple-50/30 cursor-pointer' : 'cursor-default'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-[10px] text-slate-400">Test {test.testNumber}</p>
                                  <h5 className="font-extrabold text-slate-800 text-sm leading-snug">{test.name}</h5>
                                </div>
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex-shrink-0 ${statusChip.className}`}>
                                  {statusChip.label}
                                </span>
                              </div>
                              {test.photos?.length > 0 && (
                                <p className="text-[11px] text-slate-500">{test.photos.length} photo(s) attached</p>
                              )}
                              {canReview && (
                                <p className="text-[11px] font-bold text-purple-600">Tap to review →</p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()
              )}
            </div>

            {/* Footer buttons */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/20 rounded-b-3xl space-y-3">
              {/* Rectification Input Panel */}
              {showRectificationInput && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-rose-600 uppercase tracking-wider">Rectification Directive (required)</label>
                  <textarea
                    rows="3"
                    value={rectificationNotes}
                    onChange={e => setRectificationNotes(e.target.value)}
                    placeholder="Describe the exact correction required, e.g., 'Curing pond on NE corner slab is dry — must maintain ponding for minimum 7 days post-pour.'"
                    className="w-full px-3.5 py-2.5 border border-rose-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { setShowRectificationInput(false); setRectificationNotes(''); }}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 rounded-xl transition-all">Cancel</button>
                    <button onClick={() => handleIssueRectification(activeAuditProject.id)}
                      disabled={!rectificationNotes.trim()}
                      className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white text-xs font-black rounded-xl transition-all active:scale-95 shadow shadow-rose-500/20 cursor-pointer">
                      🔧 Issue Rectification Order
                    </button>
                  </div>
                </div>
              )}
              {!showRectificationInput && (
                <div className="flex justify-end gap-2.5">
                  {(getProjStatus(activeAuditProject) === 'Pending QA Review' || getProjStatus(activeAuditProject) === 'Pending Approval') && (
                    <>
                      <button onClick={() => setShowRectificationInput(true)}
                        className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black rounded-xl transition-all active:scale-95 cursor-pointer">
                        🔧 Issue Rectification
                      </button>
                      <button onClick={() => handleQAApproveProject(activeAuditProject.id)}
                        className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl transition-all active:scale-95 shadow shadow-emerald-500/20 cursor-pointer">
                        ✓ Publish report to homeowner
                      </button>
                    </>
                  )}
                  <button onClick={() => { setSelectedAuditProjId(null); setShowRectificationInput(false); setRectificationNotes(''); }}
                    className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer">
                    Close Audit
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin test review overlay */}
      {reviewTarget && (() => {
        const reviewProject =
          projects.find((p) => p.id === (reviewTarget.projectId || selectedAuditProjId)) ||
          activeAuditProject;
        if (!reviewProject) return null;
        const { stage, subStage, test } = findTestInProject(
          reviewProject,
          reviewTarget.stageId,
          reviewTarget.subStageId,
          reviewTarget.testId
        );
        if (!test) return null;
        return (
          <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto py-8 px-4">
            <AdminTestReviewScreen
              test={test}
              stage={stage}
              subStage={subStage}
              project={reviewProject}
              onBack={() => setReviewTarget(null)}
              onApprove={async (extras) => {
                await handleApproveTestWorkflow(
                  reviewProject.id,
                  reviewTarget.stageId,
                  reviewTarget.subStageId,
                  reviewTarget.testId,
                  extras
                );
              }}
              onSendBack={async (extras) => {
                await handleSendBackTest(
                  reviewProject.id,
                  reviewTarget.stageId,
                  reviewTarget.subStageId,
                  reviewTarget.testId,
                  extras
                );
              }}
            />
          </div>
        );
      })()}

    </div>
  );
}
