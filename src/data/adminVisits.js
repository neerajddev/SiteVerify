import { VISIT_MAP, getVisitByCode } from './visitStructure';
import { WORKFLOW_STATUS, SEVERITY_LEVELS } from './testWorkflow';
import { getAllTestsFromProject, isTestNotApplicable } from './projectAnalytics';

/** Extract district from "Thrissur, Kerala" style location strings. */
export function parseDistrict(locationOrProject) {
  if (!locationOrProject) return '';
  if (typeof locationOrProject === 'object') {
    if (locationOrProject.district) return locationOrProject.district;
    return parseDistrict(locationOrProject.location || '');
  }
  const part = String(locationOrProject).split(',')[0]?.trim() || '';
  return part;
}

export function getTestsForVisit(project, visitCode) {
  const visit = getVisitByCode(visitCode);
  if (!visit) return [];
  return getAllTestsFromProject(project).filter(
    ({ test }) => visit.testNumbers.includes(test.testNumber)
  );
}

/**
 * Status of one visit on a project derived from its tests + assignment.
 * not_started | locked | assigned | in_progress | submitted | approved | revision
 */
export function getVisitStatus(project, visitCode) {
  const visit = getVisitByCode(visitCode);
  if (!visit) return { key: 'not_started', label: 'Not started' };

  const tests = getTestsForVisit(project, visitCode).filter(
    ({ test }) => !isTestNotApplicable(test)
  );
  const history = project.visitHistory || [];
  const wasAssigned =
    project.assignment?.visitCodes?.includes(visitCode) ||
    history.some((h) => h.visitCode === visitCode || h.visitCodes?.includes(visitCode));

  if (tests.length === 0) {
    return { key: 'not_started', label: 'Not applicable', date: null };
  }

  const allApproved = tests.every(({ test }) => test.workflowStatus === WORKFLOW_STATUS.APPROVED);
  if (allApproved) {
    const approvedAt = tests
      .map(({ test }) => test.approvedAt)
      .filter(Boolean)
      .sort()
      .at(-1);
    return { key: 'approved', label: 'Approved', date: approvedAt };
  }

  const anyRevision = tests.some(
    ({ test }) => test.workflowStatus === WORKFLOW_STATUS.REVISION_REQUESTED
  );
  if (anyRevision) {
    return { key: 'revision', label: 'Sent Back for Correction', date: null };
  }

  const allSubmittedOrBeyond = tests.every(({ test }) =>
    [WORKFLOW_STATUS.SUBMITTED, WORKFLOW_STATUS.APPROVED].includes(test.workflowStatus)
  );
  if (allSubmittedOrBeyond) {
    const submittedAt = tests
      .map(({ test }) => test.submittedAt)
      .filter(Boolean)
      .sort()[0];
    return { key: 'submitted', label: 'Waiting for Admin Review', date: submittedAt };
  }

  const anyProgress = tests.some(({ test }) =>
    [
      WORKFLOW_STATUS.IN_PROGRESS,
      WORKFLOW_STATUS.SUBMITTED,
      WORKFLOW_STATUS.APPROVED,
    ].includes(test.workflowStatus)
  );
  if (anyProgress || (wasAssigned && project.assignment?.visitCodes?.includes(visitCode))) {
    const scheduled = project.assignment?.visitCodes?.includes(visitCode)
      ? project.assignment?.scheduledVisitAt
      : history.find((h) => h.visitCode === visitCode)?.scheduledVisitAt;
    return {
      key: anyProgress ? 'in_progress' : 'assigned',
      label: anyProgress ? 'In Progress' : 'Assigned',
      date: scheduled || null,
    };
  }

  return { key: 'not_started', label: 'Not started', date: null };
}

/** Index of first visit that is not fully approved (0-based). */
export function getNextEligibleVisitIndex(project) {
  for (let i = 0; i < VISIT_MAP.length; i += 1) {
    const st = getVisitStatus(project, VISIT_MAP[i].code);
    if (st.key !== 'approved') return i;
  }
  return VISIT_MAP.length; // all done
}

export function getNextEligibleVisitCode(project) {
  const i = getNextEligibleVisitIndex(project);
  return i < VISIT_MAP.length ? VISIT_MAP[i].code : null;
}

/**
 * Hard sequence lock: can only assign the next incomplete visit
 * (or reassign the currently open visit). Future visits blocked until previous approved.
 */
export function isVisitAssignable(project, visitCode) {
  const next = getNextEligibleVisitCode(project);
  if (!next) return false;
  const st = getVisitStatus(project, visitCode);
  if (visitCode === next) return true;
  // Allow reassigning the currently assigned/in-progress visit
  if (['assigned', 'in_progress', 'revision', 'submitted'].includes(st.key)) {
    return visitCode === project.assignment?.visitCodes?.[0];
  }
  return false;
}

export function getVisitTimeline(project) {
  const nextCode = getNextEligibleVisitCode(project);
  return VISIT_MAP.map((visit, index) => {
    const status = getVisitStatus(project, visit.code);
    const tests = getTestsForVisit(project, visit.code);
    return {
      visit,
      index,
      status,
      tests,
      isCurrent: visit.code === nextCode,
      isAssignable: isVisitAssignable(project, visit.code),
      locked:
        !isVisitAssignable(project, visit.code) &&
        status.key === 'not_started',
    };
  });
}

export function constructionTypeLocked(project) {
  const history = project.visitHistory || [];
  if (history.length > 0) return true;
  if (project.assignment?.visitCodes?.length && project.constructionType) return true;
  // Any approved visit means type was set for a prior assignment
  return VISIT_MAP.some((v) => getVisitStatus(project, v.code).key === 'approved');
}

/** Sort: critical severity first → Visit 3B → oldest submitted first */
export function sortReviewQueue(items) {
  const severityRank = (test) => {
    if (test.severity === SEVERITY_LEVELS.CRITICAL) return 0;
    if (test.severity === SEVERITY_LEVELS.MODERATE) return 1;
    if (test.severity === SEVERITY_LEVELS.MINOR) return 2;
    return 3;
  };
  const is3B = (item) =>
    item.subStage?.code === '3B' ||
    item.visitCode === '3B' ||
    [10, 11].includes(item.test?.testNumber);

  return [...items].sort((a, b) => {
    const sa = severityRank(a.test);
    const sb = severityRank(b.test);
    if (sa !== sb) return sa - sb;
    const a3 = is3B(a) ? 0 : 1;
    const b3 = is3B(b) ? 0 : 1;
    if (a3 !== b3) return a3 - b3;
    return new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0);
  });
}

export function isVisit3BItem(item) {
  return (
    item.subStage?.code === '3B' ||
    item.visitCode === '3B' ||
    [10, 11].includes(item.test?.testNumber)
  );
}

export function getProjectAttentionFlag(project) {
  const status = project.projectStatus || project.status;
  if (status === 'Pending Assignment') {
    return { key: 'assign', label: 'Awaiting assignment', tone: 'amber' };
  }
  const queue = getAllTestsFromProject(project).filter(
    ({ test }) => test.workflowStatus === WORKFLOW_STATUS.SUBMITTED
  );
  const has3B = queue.some(
    ({ test, subStage }) => subStage?.code === '3B' || [10, 11].includes(test.testNumber)
  );
  if (has3B) {
    return {
      key: '3b',
      label: 'Visit 3B submitted — approve today',
      tone: 'rose',
    };
  }
  const hasCritical = queue.some(({ test }) => test.severity === SEVERITY_LEVELS.CRITICAL);
  if (hasCritical) {
    return { key: 'critical', label: 'Issue flagged — review needed', tone: 'rose' };
  }
  if (queue.length > 0 || status === 'Pending QA Review' || status === 'Pending Approval') {
    return { key: 'review', label: 'Awaiting QA review', tone: 'amber' };
  }
  if (status === 'Rectification Required') {
    return { key: 'fix', label: 'Sent back for correction', tone: 'amber' };
  }
  return null;
}

export function getMapsUrl(project) {
  if (project.mapsUrl) return project.mapsUrl;
  if (project.coordinates) {
    return `https://www.google.com/maps?q=${project.coordinates.lat},${project.coordinates.lng}`;
  }
  if (project.location) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.location)}`;
  }
  return null;
}

export function countIssuesFlaggedThisWeek(projects, now = new Date()) {
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  let count = 0;
  projects.forEach((p) => {
    getAllTestsFromProject(p).forEach(({ test }) => {
      if (
        test.severity &&
        [SEVERITY_LEVELS.MODERATE, SEVERITY_LEVELS.CRITICAL].includes(test.severity) &&
        test.submittedAt &&
        new Date(test.submittedAt) >= weekAgo
      ) {
        count += 1;
      }
    });
  });
  return count;
}
