import { getVisitByCode } from './visitStructure';
import { WORKFLOW_STATUS } from './testWorkflow';
import { getAssignedTests, isInspectorDutyPast, isTestNotApplicable } from './projectAnalytics';
import { KERALA_CONSTRUCTION_TYPES } from './keralaConstructionTypes';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function getConstructionTypeLabel(project) {
  if (!project?.constructionType) return null;
  return (
    KERALA_CONSTRUCTION_TYPES.find((t) => t.id === project.constructionType)?.shortName ||
    project.constructionType
  );
}

/** First name only — privacy on inspector brief. */
export function homeownerFirstName(project) {
  const full = project?.homeownerName || project?.homeowner || 'Homeowner';
  return String(full).trim().split(/\s+/)[0] || 'Homeowner';
}

export function getAssignedVisitCode(project) {
  const codes = project?.assignment?.visitCodes;
  if (codes?.length) return codes[0];
  return null;
}

export function getVisitCardMeta(project) {
  const code = getAssignedVisitCode(project);
  const visit = code ? getVisitByCode(code) : null;
  const siteName = project.projectName || `${homeownerFirstName(project)}'s House`;
  const scheduled = project.assignment?.scheduledVisitAt || null;
  return {
    project,
    visitCode: code,
    visitLabel: visit ? visit.visitLabel : code ? `Visit ${code}` : 'Site visit',
    visitName: visit?.name || getAssignmentFallback(project),
    siteName,
    location: project.location || '',
    scheduled,
    mapsUrl:
      project.mapsUrl ||
      (project.coordinates
        ? `https://www.google.com/maps?q=${project.coordinates.lat},${project.coordinates.lng}`
        : project.location
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.location)}`
          : null),
  };
}

function getAssignmentFallback(project) {
  const a = project?.assignment;
  if (!a) return 'Inspection';
  if (a.scope === 'stage' && a.stageIds?.[0]) return a.stageIds[0];
  return 'Assigned checks';
}

/**
 * Split active duties into today vs upcoming.
 * No schedule date → treat as today (needs attention).
 */
export function splitActiveVisitsByDay(activeProjects, now = new Date()) {
  const today = startOfDay(now);
  const todayList = [];
  const upcoming = [];

  activeProjects.forEach((project) => {
    const meta = getVisitCardMeta(project);
    const t = meta.scheduled ? startOfDay(meta.scheduled) : today;
    if (t <= today) todayList.push(meta);
    else upcoming.push(meta);
  });

  const byDate = (a, b) => {
    const ta = a.scheduled ? new Date(a.scheduled).getTime() : 0;
    const tb = b.scheduled ? new Date(b.scheduled).getTime() : 0;
    return ta - tb;
  };

  return {
    today: todayList.sort(byDate),
    upcoming: upcoming.sort(byDate),
  };
}

/** Past visit cards with Approved / Sent back for correction. */
export function getPastVisitCards(pastProjects) {
  return pastProjects.map((project) => {
    const meta = getVisitCardMeta(project);
    const tests = getAssignedTests(project).filter(({ test }) => !isTestNotApplicable(test));
    const anyRevision = tests.some(({ test }) => test.workflowStatus === WORKFLOW_STATUS.REVISION_REQUESTED);
    const allApproved =
      tests.length > 0 &&
      tests.every(({ test }) => test.workflowStatus === WORKFLOW_STATUS.APPROVED);
    let statusKey = 'done';
    let statusLabel = 'Completed';
    if (anyRevision) {
      statusKey = 'revision';
      statusLabel = 'Sent Back for Correction';
    } else if (allApproved) {
      statusKey = 'approved';
      statusLabel = 'Approved';
    }
    return { ...meta, statusKey, statusLabel, past: true };
  });
}

export function getAssignedApplicableTests(project) {
  return getAssignedTests(project).filter(({ test }) => !isTestNotApplicable(test));
}

export function getVisitCompletionSummary(project) {
  const tests = getAssignedApplicableTests(project);
  const submittedOrBeyond = tests.filter(({ test }) =>
    [WORKFLOW_STATUS.SUBMITTED, WORKFLOW_STATUS.APPROVED, WORKFLOW_STATUS.REVISION_REQUESTED].includes(
      test.workflowStatus
    )
  );
  const incomplete = tests.filter(
    ({ test }) =>
      !test.workflowStatus ||
      test.workflowStatus === WORKFLOW_STATUS.NOT_STARTED ||
      test.workflowStatus === WORKFLOW_STATUS.IN_PROGRESS
  );
  const revision = tests.filter(
    ({ test }) => test.workflowStatus === WORKFLOW_STATUS.REVISION_REQUESTED
  );
  return {
    total: tests.length,
    done: submittedOrBeyond.length,
    incomplete,
    revision,
    allFilled: incomplete.length === 0 && tests.length > 0,
    readyToSubmitVisit:
      tests.length > 0 &&
      incomplete.length === 0 &&
      tests.every(
        ({ test }) =>
          test.workflowStatus === WORKFLOW_STATUS.SUBMITTED ||
          test.workflowStatus === WORKFLOW_STATUS.APPROVED ||
          test.workflowStatus === WORKFLOW_STATUS.REVISION_REQUESTED
      ),
  };
}

export { isInspectorDutyPast };
