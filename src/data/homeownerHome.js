import { getSubStagesForStage } from './stageStructure';
import { WORKFLOW_STATUS, OVERALL_RESULTS, SEVERITY_LEVELS, isTestApprovedForHomeowner } from './testWorkflow';
import { VISIT_MAP, getVisitByCode } from './visitStructure';
import { KERALA_CONSTRUCTION_TYPES } from './keralaConstructionTypes';
import { isTestNotApplicable, recalcProjectProgress } from './projectAnalytics';

const STAGE_PILL_LABELS = {
  stage_1: 'Foundation',
  stage_2: 'Walls',
  stage_3: 'Slab',
  stage_4: 'Plastering',
};

export function getConstructionTypeLabel(project) {
  if (!project?.constructionType) return null;
  const t = KERALA_CONSTRUCTION_TYPES.find((x) => x.id === project.constructionType);
  return t?.shortName || project.constructionType;
}

/** Progress for homeowner: approved / applicable (excludes N/A). */
export function getHomeownerProgressSummary(project) {
  const all = [];
  (project?.stages || []).forEach((stage) => {
    getSubStagesForStage(stage).forEach((sub) => {
      (sub.tests || []).forEach((test) => all.push(test));
    });
  });
  const applicable = all.filter((t) => !isTestNotApplicable(t));
  const approved = applicable.filter((t) => t.workflowStatus === WORKFLOW_STATUS.APPROVED).length;
  const total = applicable.length || 17;
  const pct = recalcProjectProgress(project);
  return {
    approved,
    total,
    pct,
    label: `${approved} of ${total} checks complete`,
  };
}

function visitTestList(project, visitCode) {
  const visit = getVisitByCode(visitCode);
  if (!visit || !project?.stages) return [];
  const stage = project.stages.find((s) => s.id === visit.stageId);
  if (!stage) return [];
  const sub = getSubStagesForStage(stage).find((s) => s.code === visitCode);
  return sub?.tests || [];
}

export function getVisitHomeownerStatus(project, visitCode) {
  const tests = visitTestList(project, visitCode);
  if (!tests.length) return { key: 'locked', label: 'Inspection not yet assigned' };

  const applicable = tests.filter((t) => !isTestNotApplicable(t));
  if (!applicable.length) {
    return { key: 'na', label: 'Not applicable for this build type' };
  }

  const allApproved = applicable.every((t) => t.workflowStatus === WORKFLOW_STATUS.APPROVED);
  if (allApproved) return { key: 'approved', label: 'Approved ✓' };

  const anySubmitted = applicable.some((t) => t.workflowStatus === WORKFLOW_STATUS.SUBMITTED);
  if (anySubmitted) return { key: 'review', label: 'Waiting for Admin Review' };

  const anyRevision = applicable.some((t) => t.workflowStatus === WORKFLOW_STATUS.REVISION_REQUESTED);
  if (anyRevision) return { key: 'revision', label: 'Sent Back for Correction' };

  const anyStarted = applicable.some(
    (t) =>
      t.workflowStatus === WORKFLOW_STATUS.IN_PROGRESS ||
      t.workflowStatus === WORKFLOW_STATUS.NOT_STARTED
  );

  const assignment = project.assignment;
  const assignedHere =
    assignment?.scope === 'visit' && assignment.visitCodes?.includes(visitCode);
  const assignedStage =
    assignment?.scope === 'stage' &&
    assignment.stageIds?.includes(getVisitByCode(visitCode)?.stageId);
  const assignedFull = !assignment || assignment.scope === 'full';

  if (assignedHere || assignedStage || (assignedFull && anyStarted)) {
    if (applicable.every((t) => !t.workflowStatus || t.workflowStatus === WORKFLOW_STATUS.NOT_STARTED)) {
      return { key: 'assigned', label: 'Assigned — not started' };
    }
    return { key: 'progress', label: 'In progress' };
  }

  // Future visit with no activity
  const anyActivity = applicable.some(
    (t) =>
      t.workflowStatus &&
      t.workflowStatus !== WORKFLOW_STATUS.NOT_STARTED
  );
  if (!anyActivity) {
    return { key: 'locked', label: 'Inspection not yet assigned' };
  }

  return { key: 'progress', label: 'In progress' };
}

export function isVisitLockedForHomeowner(project, visitCode) {
  const status = getVisitHomeownerStatus(project, visitCode);
  return status.key === 'locked';
}

/**
 * Next inspection card: prefer scheduled assignment visit; else first incomplete visit.
 */
export function getNextVisitCard(project) {
  const a = project?.assignment;
  if (a?.visitCodes?.[0] && a.scheduledVisitAt) {
    const code = a.visitCodes[0];
    const visit = getVisitByCode(code);
    const status = getVisitHomeownerStatus(project, code);
    if (status.key !== 'approved') {
      const date = new Date(a.scheduledVisitAt);
      const dateLabel = date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
      return {
        visitCode: code,
        title: visit ? `${visit.visitLabel} — ${visit.name}` : `Visit ${code}`,
        stageName: visit?.stageName || '',
        dateLabel,
        line: `Next inspection: ${visit?.name || code} · Scheduled ${dateLabel}`,
      };
    }
  }

  for (const visit of VISIT_MAP) {
    const status = getVisitHomeownerStatus(project, visit.code);
    if (status.key === 'locked') continue;
    if (status.key === 'approved' || status.key === 'na') continue;
    return {
      visitCode: visit.code,
      title: `${visit.visitLabel} — ${visit.name}`,
      stageName: visit.stageName,
      dateLabel: null,
      line: `Next up: ${visit.name} (${status.label})`,
    };
  }

  return null;
}

export function getStagePillState(project, stageId) {
  const stage = (project?.stages || []).find((s) => s.id === stageId);
  const label = STAGE_PILL_LABELS[stageId] || stage?.name || 'Stage';
  if (!stage) return { id: stageId, label, state: 'future' };

  const tests = [];
  getSubStagesForStage(stage).forEach((sub) => {
    (sub.tests || []).forEach((t) => {
      if (!isTestNotApplicable(t)) tests.push(t);
    });
  });

  if (!tests.length) return { id: stageId, label, state: 'future' };

  const allApproved = tests.every((t) => t.workflowStatus === WORKFLOW_STATUS.APPROVED);
  if (allApproved) return { id: stageId, label, state: 'complete' };

  const anyLive = tests.some(
    (t) =>
      t.workflowStatus === WORKFLOW_STATUS.IN_PROGRESS ||
      t.workflowStatus === WORKFLOW_STATUS.SUBMITTED ||
      t.workflowStatus === WORKFLOW_STATUS.REVISION_REQUESTED ||
      t.workflowStatus === WORKFLOW_STATUS.APPROVED
  );

  if (anyLive || stage.status === 'In Progress') {
    return { id: stageId, label, state: 'current' };
  }

  return { id: stageId, label, state: 'future' };
}

export function getHomeownerStagePills(project) {
  return ['stage_1', 'stage_2', 'stage_3', 'stage_4'].map((id) =>
    getStagePillState(project, id)
  );
}

/** Issues homeowner should worry about — only approved moderate/critical. */
export function getHomeownerIssueAlerts(project) {
  const alerts = [];
  (project?.stages || []).forEach((stage) => {
    getSubStagesForStage(stage).forEach((sub) => {
      (sub.tests || []).forEach((test) => {
        if (!isTestApprovedForHomeowner(test)) return;
        const isIssue =
          test.overallResult === OVERALL_RESULTS.ISSUE_FOUND ||
          test.overallResult === OVERALL_RESULTS.NOT_DONE ||
          test.conditionRating === 'poor';
        if (!isIssue) return;
        const severity = test.severity || SEVERITY_LEVELS.MODERATE;
        if (severity === SEVERITY_LEVELS.MINOR) return;
        alerts.push({
          testId: test.id,
          stageId: stage.id,
          subStageId: sub.id,
          testNumber: test.testNumber,
          name: test.name,
          severity,
          remarks: test.remarks || test.adminNote || 'An issue was noted on this check.',
          stageName: stage.name,
          visitCode: sub.code,
        });
      });
    });
  });
  return alerts.sort((a, b) => {
    const rank = { critical: 0, moderate: 1, minor: 2 };
    return (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3);
  });
}

export { STAGE_PILL_LABELS };
