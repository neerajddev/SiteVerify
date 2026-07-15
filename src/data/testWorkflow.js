import { STATUS_BADGES } from './designTokens';

export const WORKFLOW_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  REVISION_REQUESTED: 'revision_requested',
  APPROVED: 'approved',
};

export const OVERALL_RESULTS = {
  DONE_CORRECTLY: 'done_correctly',
  ISSUE_FOUND: 'issue_found',
  NOT_DONE: 'not_done',
  NOT_APPLICABLE: 'not_applicable',
};

export const CONDITION_RATINGS = {
  GOOD: 'good',
  AVERAGE: 'average',
  POOR: 'poor',
};

export const SEVERITY_LEVELS = {
  MINOR: 'minor',
  MODERATE: 'moderate',
  CRITICAL: 'critical',
};

export const TESTS_WITH_MEASUREMENT = [2, 3, 5, 6, 8, 10, 11, 15];

export const INSPECTOR_INSTRUCTIONS = {
  1: 'PRE-EVENT: Check trench before RCC steel cage is lowered — or, on Rubble Masonry (RR) builds, before rubble packing begins. Photograph clean, firm trench (no loose soil/roots/water). For RR, also add under Test 1: (1) trench bottom before rubble, (2) tight packing not thrown in, (3) crusher sand force-filled into gaps.',
  2: 'RCC only (N/A for pure RR): Photograph steel cage with tape measure for spacing; cover blocks under all sides — steel must not touch earth; confirm PCC base. If RR: mark Not Applicable — "RR masonry foundation — no steel reinforcement."',
  3: 'PRE-POUR plinth (RCC / hybrid): Photograph laps, stirrup spacing, and joint overlaps. Pure RR plinth: N/A. Hybrid RR+RCC plinth beam: this test APPLIES — note which method.',
  4: 'PRE-POUR plinth (RCC / hybrid): Photograph shuttering alignment, sealed gaps, and cover blocks between steel and shutter. Pure RR plinth: N/A. Applies only if concrete plinth/belt beam is cast on RR base.',
  5: 'MID-PROCESS (~60–70% walls, before plaster): Plumb bob/spirit level flush on wall. Photograph gap (or none) at top and bottom on multiple faces.',
  6: 'Before plaster hides joints: tape measure across mortar joints — max 12mm. Photograph close-up with tape visible.',
  7: 'Before plaster: photograph bonding pattern from a distance — vertical joints must be staggered, never continuous columns of joints.',
  8: 'Visit 3A — AFTER formwork up, BEFORE steel: spirit level on centering; props spaced and plumb; no sag. Photograph level bubble on formwork.',
  9: 'Visit 3A: walk full formwork; seal every sheet joint. Photograph gaps found then confirm sealed in remarks.',
  10: 'Visit 3B CRITICAL PRE-POUR: full slab steel grid with tape across main + distribution bars; check diameters and missing bars. Same-day admin approval before pour.',
  11: 'Visit 3B CRITICAL: cover blocks every 600–900mm under steel mat — steel never on formwork. Side photo showing gap. Invisible after pour.',
  12: 'Visit 3C DURING POUR: photograph needle vibrator actively in concrete every 300–450mm — not standing beside pour. Flag over-vibration or skipped areas.',
  13: 'Visit 3C — live on site during the pour: Observe the concrete as it arrives and is poured. Check the mix is consistent — not too watery, not too stiff. Photograph the concrete being poured showing its consistency. If anyone adds water to the mix on site, photograph immediately and flag as CRITICAL severity.',
  14: 'Visit 3D ~2–3 days after pour (must stay unannounced to the contractor): ponding 50–75mm across slab OR saturated wet gunny bags on columns/beams. Dry slab with no ponding = CRITICAL.',
  15: 'Visit 4B AFTER base coat set, BEFORE finish coat: spirit level on plaster surface — vertical and flat. Photograph bubble position.',
  16: 'Visit 4A FIRST (before plaster): observe cement:sand mix (typically 1:4–1:6). Photograph mixing/measured proportions. Flag too sandy or too cement-heavy.',
  17: 'Visit 4A AFTER mix is confirmed, BEFORE plaster: mesh at EVERY column/beam–wall junction, fixed firmly, ≥150mm each side. Photograph every major junction — not one and assume.',
};

export const OVERALL_RESULT_LABELS = {
  [OVERALL_RESULTS.DONE_CORRECTLY]: 'Done Correctly',
  [OVERALL_RESULTS.ISSUE_FOUND]: 'Issue Found',
  [OVERALL_RESULTS.NOT_DONE]: 'Not Done / Absent',
  [OVERALL_RESULTS.NOT_APPLICABLE]: 'Not applicable for this build type',
};

export function getDefaultWorkflowFields() {
  return {
    workflowStatus: WORKFLOW_STATUS.NOT_STARTED,
    overallResult: null,
    conditionRating: null,
    measurement: '',
    severity: null,
    photoTimestamps: [],
    submittedAt: null,
    submittedBy: null,
    revisionReason: null,
    adminNote: null,
    approvedAt: null,
    approvedBy: null,
    inspectorPayoutFlag: false,
  };
}

export function isTestApprovedForHomeowner(test) {
  return test?.workflowStatus === WORKFLOW_STATUS.APPROVED;
}

export function isTestLockedForInspector(test) {
  return test?.workflowStatus === WORKFLOW_STATUS.SUBMITTED;
}

export function isTestEditableByInspector(test) {
  return (
    test?.workflowStatus === WORKFLOW_STATUS.NOT_STARTED ||
    test?.workflowStatus === WORKFLOW_STATUS.IN_PROGRESS ||
    test?.workflowStatus === WORKFLOW_STATUS.REVISION_REQUESTED
  );
}

export function hasIssueFlag(test) {
  return (
    test?.overallResult === OVERALL_RESULTS.ISSUE_FOUND ||
    test?.overallResult === OVERALL_RESULTS.NOT_DONE ||
    test?.conditionRating === CONDITION_RATINGS.POOR
  );
}

export function getInspectorStatusChip(status) {
  switch (status) {
    case WORKFLOW_STATUS.IN_PROGRESS:
      return STATUS_BADGES.in_progress;
    case WORKFLOW_STATUS.SUBMITTED:
      return STATUS_BADGES.submitted;
    case WORKFLOW_STATUS.REVISION_REQUESTED:
      return STATUS_BADGES.revision_requested;
    case WORKFLOW_STATUS.APPROVED:
      return STATUS_BADGES.approved;
    default:
      return STATUS_BADGES.not_started;
  }
}

export function getAdminStatusChip(status) {
  if (status === WORKFLOW_STATUS.SUBMITTED) {
    return STATUS_BADGES.waiting_review;
  }
  if (status === WORKFLOW_STATUS.APPROVED) {
    return STATUS_BADGES.approved;
  }
  if (status === WORKFLOW_STATUS.REVISION_REQUESTED) {
    return STATUS_BADGES.revision_requested;
  }
  return { label: 'Not Submitted', className: STATUS_BADGES.not_started.className };
}

export function getHomeownerWorkflowStatus(test) {
  if (isTestApprovedForHomeowner(test)) {
    if (test.overallResult === OVERALL_RESULTS.NOT_APPLICABLE) {
      return {
        label: 'Not applicable for this build type',
        className: 'bg-slate-100 text-slate-500 border-slate-200',
        hasIssue: false,
        tone: 'na',
      };
    }
    if (hasIssueFlag(test)) {
      const critical =
        test.severity === SEVERITY_LEVELS.CRITICAL ||
        test.overallResult === OVERALL_RESULTS.NOT_DONE;
      return {
        label: critical ? 'Issue flagged' : 'Needs attention',
        className: critical
          ? 'bg-rose-50 text-rose-700 border-rose-200'
          : 'bg-amber-50 text-amber-700 border-amber-200',
        hasIssue: true,
        tone: critical ? 'critical' : 'attention',
      };
    }
    return {
      label: 'Pass',
      className: 'bg-[#E1F5EE] text-[#085041] border-[#1D9E75]/30',
      hasIssue: false,
      tone: 'pass',
    };
  }
  if (test?.workflowStatus === WORKFLOW_STATUS.SUBMITTED) {
    return {
      label: 'Waiting for Admin Review',
      className: 'bg-slate-100 text-slate-500 border-slate-200',
      hasIssue: false,
      tone: 'pending',
    };
  }
  return {
    label: 'In progress',
    className: 'bg-slate-100 text-slate-500 border-slate-200',
    hasIssue: false,
    tone: 'pending',
  };
}

export function getIssueBanner(test) {
  if (!isTestApprovedForHomeowner(test) || !hasIssueFlag(test)) return null;
  const severity = test.severity || CONDITION_RATINGS.POOR;
  if (severity === SEVERITY_LEVELS.CRITICAL || test.overallResult === OVERALL_RESULTS.NOT_DONE) {
    return {
      className: 'bg-rose-50 border-rose-200 text-rose-800',
      text: '🚨 Critical issue flagged. Immediate attention required. Contact your site supervisor.',
    };
  }
  if (severity === SEVERITY_LEVELS.MODERATE) {
    return {
      className: 'bg-orange-50 border-orange-200 text-orange-800',
      text: '⚠️ Moderate issue found. Please discuss with your contractor.',
    };
  }
  return {
    className: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    text: 'ℹ️ Minor observation noted. Review the inspector\'s remarks.',
  };
}

export function updateTestInProject(projects, projectId, stageId, subStageId, testId, updates) {
  return projects.map((p) => {
    if (p.id !== projectId) return p;
    const stages = p.stages.map((stage) => {
      if (stage.id !== stageId) return stage;
      const subStageKey = stage.subStages
        ? 'subStages'
        : stage.id === 'stage_1'
          ? (p.foundationType === 'rr' ? 'subStagesRR' : 'subStagesCF')
          : 'subStages';
      const subStages = (stage[subStageKey] || []).map((sub) => {
        if (sub.id !== subStageId) return sub;
        return {
          ...sub,
          tests: sub.tests.map((t) => (t.id === testId ? { ...t, ...updates } : t)),
        };
      });
      return { ...stage, [subStageKey]: subStages };
    });
    return { ...p, stages };
  });
}

export function findTestInProject(project, stageId, subStageId, testId) {
  const stage = project?.stages?.find((s) => s.id === stageId);
  if (!stage) return { stage: null, subStage: null, test: null };
  const subStageKey = stage.subStages
    ? 'subStages'
    : stage.id === 'stage_1'
      ? (project.foundationType === 'rr' ? 'subStagesRR' : 'subStagesCF')
      : 'subStages';
  const subStage = (stage[subStageKey] || []).find((s) => s.id === subStageId);
  const test = subStage?.tests?.find((t) => t.id === testId);
  return { stage, subStage, test };
}
