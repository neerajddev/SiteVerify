import { getSubStagesForStage } from './stageStructure';
import { WORKFLOW_STATUS, OVERALL_RESULTS } from './testWorkflow';

export const DEFAULT_PREP_CHECKLIST = [
  { id: 'prep_drawing', label: 'Review structural drawing / blueprint before visit' },
  { id: 'prep_access', label: 'Confirm site access and homeowner contact number' },
  { id: 'prep_tools', label: 'Carry tape measure, plumb bob, and spirit level' },
  { id: 'prep_camera', label: 'Ensure phone camera is charged for site photos' },
  { id: 'prep_contractor', label: 'Coordinate with contractor — stage must be ready for inspection' },
  { id: 'prep_ppe', label: 'Wear safety shoes and helmet on active construction site' },
];

export function isTestNotApplicable(test) {
  return test?.overallResult === OVERALL_RESULTS.NOT_APPLICABLE;
}

export function getAllTestsFromProject(project) {
  const tests = [];
  (project?.stages || []).forEach((stage) => {
    getSubStagesForStage(stage).forEach((sub) => {
      (sub.tests || []).forEach((test) => {
        tests.push({ stage, subStage: sub, test });
      });
    });
  });
  return tests;
}

export function isTestInAssignment(project, testId, stageId, subStageCode) {
  const a = project?.assignment;
  if (!a || a.scope === 'full' || !a.scope) return true;
  if ((a.scope === 'visit' || a.scope === 'substage') && a.visitCodes?.length) {
    return a.visitCodes.includes(subStageCode);
  }
  if (a.scope === 'stage' && a.stageIds?.length) {
    return a.stageIds.includes(stageId);
  }
  if (a.scope === 'tests' && a.testIds?.length) {
    return a.testIds.includes(testId);
  }
  return true;
}

export function getAssignedTests(project) {
  return getAllTestsFromProject(project).filter(({ test, stage, subStage }) =>
    isTestInAssignment(project, test.id, stage.id, subStage?.code)
  );
}

export function filterStagesByAssignment(project) {
  const a = project?.assignment;
  if (!a || a.scope === 'full' || !a.scope) return project?.stages || [];
  if ((a.scope === 'visit' || a.scope === 'substage') && a.visitCodes?.length) {
    return (project.stages || [])
      .map((stage) => {
        const subStages = getSubStagesForStage(stage)
          .filter((sub) => a.visitCodes.includes(sub.code))
          .map((sub) => ({ ...sub }));
        if (subStages.length === 0) return null;
        return { ...stage, subStages };
      })
      .filter(Boolean);
  }
  if (a.scope === 'stage' && a.stageIds?.length) {
    return (project.stages || []).filter((s) => a.stageIds.includes(s.id));
  }
  if (a.scope === 'tests' && a.testIds?.length) {
    return (project.stages || [])
      .map((stage) => {
        const subStages = getSubStagesForStage(stage)
          .map((sub) => ({
            ...sub,
            tests: sub.tests.filter((t) => a.testIds.includes(t.id)),
          }))
          .filter((sub) => sub.tests.length > 0);
        if (subStages.length === 0) return null;
        return { ...stage, subStages };
      })
      .filter(Boolean);
  }
  return project?.stages || [];
}

export function getProjectTestStats(project) {
  const assigned = getAssignedTests(project);
  const applicable = assigned.filter(({ test }) => !isTestNotApplicable(test));
  const total = applicable.length;
  const submitted = applicable.filter(
    ({ test }) => test.workflowStatus === WORKFLOW_STATUS.SUBMITTED
  ).length;
  const approved = applicable.filter(
    ({ test }) => test.workflowStatus === WORKFLOW_STATUS.APPROVED
  ).length;
  const revision = applicable.filter(
    ({ test }) => test.workflowStatus === WORKFLOW_STATUS.REVISION_REQUESTED
  ).length;
  const pending = applicable.filter(
    ({ test }) =>
      !test.workflowStatus ||
      test.workflowStatus === WORKFLOW_STATUS.NOT_STARTED ||
      test.workflowStatus === WORKFLOW_STATUS.IN_PROGRESS
  ).length;
  const notApplicable = assigned.length - applicable.length;

  return { total, submitted, approved, revision, pending, notApplicable, assigned };
}

/**
 * Progress % = (approved applicable tests / applicable tests) × 100
 * Applicable = all tests on the project that are not marked
 * "Not applicable for this build type" (e.g. T2–T4 on pure RR).
 * Only APPROVED counts — not submitted, not in progress.
 */
export function recalcProjectProgress(project) {
  const all = getAllTestsFromProject(project);
  const applicable = all.filter(({ test }) => !isTestNotApplicable(test));
  const denominator = applicable.length;
  if (denominator === 0) return 0;
  const approved = applicable.filter(
    ({ test }) => test.workflowStatus === WORKFLOW_STATUS.APPROVED
  ).length;
  return Math.round((approved / denominator) * 100);
}

export function getProjectStatusLabel(status) {
  const map = {
    'Pending Assignment': { label: 'Awaiting inspector', color: 'amber' },
    Inspecting: { label: 'On site', color: 'sky' },
    'Pending QA Review': { label: 'Waiting for Admin Review', color: 'indigo' },
    'Pending Approval': { label: 'Waiting for Admin Review', color: 'indigo' },
    'Rectification Required': { label: 'Fixes needed on site', color: 'rose' },
    'QA Certified': { label: 'Published', color: 'emerald' },
    'QA Approved': { label: 'Published', color: 'emerald' },
  };
  return map[status] || { label: status || 'Unknown', color: 'slate' };
}

export function getInspectorWorkload(projects, inspectors = []) {
  const byId = {};
  const byName = {};

  inspectors.forEach((ins) => {
    byId[ins.id] = {
      id: ins.id,
      name: ins.full_name,
      phone: ins.phone,
      activeSites: 0,
      pendingQA: 0,
      rectification: 0,
      testsDue: 0,
      testsSubmitted: 0,
      testsApproved: 0,
      nextVisit: null,
      projects: [],
    };
  });

  projects.forEach((p) => {
    const insId = p.inspectorId;
    const insName = p.assignedInspector || p.inspector;
    let bucket = insId ? byId[insId] : null;
    if (!bucket && insName) {
      bucket = byName[insName];
      if (!bucket) {
        bucket = {
          id: insId || insName,
          name: insName,
          phone: '',
          activeSites: 0,
          pendingQA: 0,
          rectification: 0,
          testsDue: 0,
          testsSubmitted: 0,
          testsApproved: 0,
          nextVisit: null,
          projects: [],
        };
        byName[insName] = bucket;
      }
    }
    if (!bucket || insName === 'Pending Assignment') return;

    const status = p.projectStatus || p.status;
    const stats = getProjectTestStats(p);
    bucket.projects.push({ project: p, stats, status });
    bucket.testsDue += stats.pending + stats.revision;
    bucket.testsSubmitted += stats.submitted;
    bucket.testsApproved += stats.approved;

    if (status === 'Inspecting') bucket.activeSites += 1;
    if (status === 'Pending QA Review' || status === 'Pending Approval') bucket.pendingQA += 1;
    if (status === 'Rectification Required') bucket.rectification += 1;

    const visit = p.assignment?.scheduledVisitAt;
    if (visit && (!bucket.nextVisit || new Date(visit) < new Date(bucket.nextVisit))) {
      bucket.nextVisit = visit;
    }
  });

  const combined = [...Object.values(byId), ...Object.values(byName)];
  const seen = new Set();
  return combined.filter((w) => {
    if (seen.has(w.name)) return false;
    seen.add(w.name);
    return w.projects.length > 0 || inspectors.some((i) => i.id === w.id);
  });
}

export function getRecentActivity(projects, limit = 12) {
  const events = [];
  projects.forEach((p) => {
    const siteName = p.projectName || p.homeownerName || p.homeowner || 'Site';
    (p.historyLogs || []).forEach((log) => {
      events.push({
        id: `${p.id}-${log.timestamp}-${log.action}`,
        projectId: p.id,
        siteName,
        action: log.action,
        by: log.by,
        timestamp: log.timestamp,
      });
    });
    getAssignedTests(p).forEach(({ test, stage, subStage }) => {
      if (test.submittedAt) {
        events.push({
          id: `${p.id}-sub-${test.id}`,
          projectId: p.id,
          siteName,
          action: `Test ${test.testNumber} submitted: ${test.name}`,
          by: test.submittedBy || p.assignedInspector,
          timestamp: test.submittedAt,
        });
      }
      if (test.approvedAt) {
        events.push({
          id: `${p.id}-app-${test.id}`,
          projectId: p.id,
          siteName,
          action: `Test ${test.testNumber} approved`,
          by: test.approvedBy || 'Admin',
          timestamp: test.approvedAt,
        });
      }
    });
  });
  return events
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

export function formatVisitDate(isoString) {
  if (!isoString) return 'Not scheduled';
  return new Date(isoString).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function getAssignmentScopeLabel(assignment) {
  if (!assignment || assignment.scope === 'full' || !assignment.scope) {
    return 'Full site inspection';
  }
  if (assignment.scope === 'visit' || assignment.scope === 'substage') {
    const codes = assignment.visitCodes || [];
    if (codes.length === 1) return `Visit ${codes[0]}`;
    return codes.length ? `Visits ${codes.join(', ')}` : 'Site visit';
  }
  if (assignment.scope === 'stage') {
    const count = assignment.stageIds?.length || 0;
    return `${count} stage${count !== 1 ? 's' : ''} to check`;
  }
  if (assignment.scope === 'tests') {
    const count = assignment.testIds?.length || 0;
    return `${count} check${count !== 1 ? 's' : ''} on this visit`;
  }
  return 'Site inspection';
}

export function isInspectorDutyPast(project) {
  const status = project?.projectStatus || project?.status;
  return status === 'QA Certified' || status === 'QA Approved';
}

export function isInspectorDutyActive(project) {
  return !isInspectorDutyPast(project);
}

export function getDutyProgress(project) {
  return recalcProjectProgress(project);
}

export function getDutyProgressLabel(project) {
  const all = getAllTestsFromProject(project);
  const applicable = all.filter(({ test }) => !isTestNotApplicable(test));
  const approved = applicable.filter(
    ({ test }) => test.workflowStatus === WORKFLOW_STATUS.APPROVED
  ).length;
  const total = applicable.length;
  const revision = applicable.filter(
    ({ test }) => test.workflowStatus === WORKFLOW_STATUS.REVISION_REQUESTED
  ).length;
  const pending = applicable.filter(
    ({ test }) =>
      !test.workflowStatus ||
      test.workflowStatus === WORKFLOW_STATUS.NOT_STARTED ||
      test.workflowStatus === WORKFLOW_STATUS.IN_PROGRESS
  ).length;

  if (isInspectorDutyPast(project)) {
    return `${approved} check${approved !== 1 ? 's' : ''} completed`;
  }
  if (revision > 0) {
    return `${revision} sent back for correction · ${pending} to do`;
  }
  return `${approved} of ${total} checks approved`;
}

export function splitInspectorProjects(projects, inspectorId, inspectorName) {
  const mine = (projects || []).filter(
    (p) =>
      (inspectorId && p.inspectorId === inspectorId) ||
      p.inspector === inspectorName ||
      p.assignedInspector === inspectorName
  );
  return {
    active: mine.filter(isInspectorDutyActive),
    past: mine
      .filter(isInspectorDutyPast)
      .sort((a, b) => {
        const aDate = a.assignment?.completedAt || a.assignment?.scheduledVisitAt || '';
        const bDate = b.assignment?.completedAt || b.assignment?.scheduledVisitAt || '';
        return new Date(bDate) - new Date(aDate);
      }),
  };
}

export function groupAssignedTests(project) {
  const groups = [];
  const seen = new Set();
  getAssignedTests(project).forEach(({ test, stage, subStage }) => {
    const key = `${stage.id}::${subStage.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      groups.push({ stage, subStage, tests: [] });
    }
    groups.find((g) => `${g.stage.id}::${g.subStage.id}` === key).tests.push(test);
  });
  return groups;
}

export function buildAssignmentPayload({
  inspectorId,
  inspectorName,
  scope,
  visitCodes,
  stageIds,
  testIds,
  scheduledVisitAt,
  preparationNotes,
  constructionType,
  assignedBy = 'Admin',
}) {
  return {
    inspectorId,
    inspectorName,
    scope: scope || 'full',
    visitCodes: visitCodes || [],
    stageIds: stageIds || [],
    testIds: testIds || [],
    scheduledVisitAt: scheduledVisitAt || null,
    preparationNotes: preparationNotes || '',
    constructionType: constructionType || null,
    preparationChecklist: DEFAULT_PREP_CHECKLIST.map((item) => ({ ...item, checked: false })),
    assignedAt: new Date().toISOString(),
    assignedBy,
  };
}
