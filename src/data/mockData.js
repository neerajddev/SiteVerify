// ─── SiteVerify Phase 2 — Construction Inspection Data Model ──────────────────

import {
  buildBlankStages,
  buildDemoStagesThrissur,
  buildDemoStagesKochi,
  TEST_KNOWLEDGE,
  getSubStagesForStage,
  getStageIndex,
  getHomeownerTestStatus,
} from './stageStructure';
import { getDefaultWorkflowFields, WORKFLOW_STATUS, OVERALL_RESULTS, CONDITION_RATINGS } from './testWorkflow';

function patchTestWorkflow(stages, stageIdx, subCode, testNum, fields) {
  const sub = stages[stageIdx]?.subStages?.find((s) => s.code === subCode);
  const test = sub?.tests?.find((t) => t.testNumber === testNum);
  if (test) Object.assign(test, fields);
}

function subCodeForSlabTest(testNum) {
  if (testNum <= 9) return '3A';
  if (testNum <= 11) return '3B';
  if (testNum <= 13) return '3C';
  return '3D';
}

function applySlabDutyWorkflowDemo(stages) {
  const approved = (testNum, submittedAt, approvedAt) =>
    patchTestWorkflow(stages, 2, subCodeForSlabTest(testNum), testNum, {
      workflowStatus: WORKFLOW_STATUS.APPROVED,
      overallResult: OVERALL_RESULTS.DONE_CORRECTLY,
      conditionRating: CONDITION_RATINGS.GOOD,
      submittedAt,
      submittedBy: 'Arun Kumar',
      approvedAt,
      approvedBy: 'Admin',
    });

  approved(8, '2026-07-08T10:00:00+05:30', '2026-07-08T14:00:00+05:30');
  approved(9, '2026-07-08T10:30:00+05:30', '2026-07-08T14:00:00+05:30');
  approved(10, '2026-07-09T11:00:00+05:30', '2026-07-09T16:00:00+05:30');
  approved(11, '2026-07-09T11:30:00+05:30', '2026-07-09T16:00:00+05:30');

  patchTestWorkflow(stages, 2, subCodeForSlabTest(12), 12, {
    workflowStatus: WORKFLOW_STATUS.SUBMITTED,
    overallResult: OVERALL_RESULTS.DONE_CORRECTLY,
    conditionRating: CONDITION_RATINGS.GOOD,
    submittedAt: '2026-07-10T09:00:00+05:30',
    submittedBy: 'Arun Kumar',
  });

  patchTestWorkflow(stages, 2, subCodeForSlabTest(13), 13, {
    workflowStatus: WORKFLOW_STATUS.IN_PROGRESS,
    overallResult: OVERALL_RESULTS.DONE_CORRECTLY,
    conditionRating: CONDITION_RATINGS.AVERAGE,
  });

  patchTestWorkflow(stages, 2, subCodeForSlabTest(14), 14, {
    workflowStatus: WORKFLOW_STATUS.NOT_STARTED,
  });
}

export { TEST_KNOWLEDGE, getSubStagesForStage, getStageIndex, getHomeownerTestStatus };
export {
  WORKFLOW_STATUS,
  OVERALL_RESULTS,
  CONDITION_RATINGS,
  SEVERITY_LEVELS,
  INSPECTOR_INSTRUCTIONS,
  TESTS_WITH_MEASUREMENT,
  OVERALL_RESULT_LABELS,
  isTestApprovedForHomeowner,
  getHomeownerWorkflowStatus,
  getIssueBanner,
  updateTestInProject,
  findTestInProject,
} from './testWorkflow';

export const STATUS_ENUMS = {
  PASS: 'Pass',
  IGNORED: 'Can be ignored',
  ATTENTION: 'Needs Attention',
  CRITICAL: 'Critical'
};

// Canonical project lifecycle statuses
export const PROJECT_STATUSES = {
  PENDING_ASSIGNMENT:    'Pending Assignment',
  INSPECTING:            'Inspecting',
  PENDING_QA_REVIEW:     'Pending QA Review',
  RECTIFICATION_REQUIRED:'Rectification Required',
  QA_CERTIFIED:          'QA Certified',
  // Legacy aliases kept for backward-compat (old localStorage data)
  PENDING_APPROVAL:      'Pending QA Review',
  QA_APPROVED:           'QA Certified'
};

/** Returns true for any variant of the "needs QA review" status */
export const isPendingQA = (status) =>
  status === 'Pending QA Review' || status === 'Pending Approval';

/** Returns true for any variant of the "certified" status */
export const isQACertified = (status) =>
  status === 'QA Certified' || status === 'QA Approved';

/** Homeowner only sees full inspection report after admin publishes (QA Certified) */
export const isPublishedToHomeowner = (status) => isQACertified(status);

export function getHomeownerStatusLabel(status) {
  if (status === 'Pending Assignment') return { badge: 'Getting started', icon: '🕒' };
  if (status === 'Inspecting') return { badge: 'Site check in progress', icon: '🔍' };
  if (isPendingQA(status)) return { badge: 'Almost ready', icon: '📋' };
  if (status === 'Rectification Required') return { badge: 'Fixes needed on site', icon: '🔧' };
  if (isQACertified(status)) return { badge: 'Report ready', icon: '✅' };
  return { badge: 'In progress', icon: '⏳' };
}

export function getHomeownerStatusDescription(status) {
  if (status === 'Pending Assignment') {
    return 'We are setting up your site visit. You will see updates here soon.';
  }
  if (status === 'Inspecting') {
    return 'Your inspector is working on site. Results will appear here when ready.';
  }
  if (isPendingQA(status)) {
    return 'Your inspection is waiting for admin review. The full report will appear here shortly.';
  }
  if (status === 'Rectification Required') {
    return 'Some work needs to be fixed on site. The report will update after the re-check.';
  }
  if (isQACertified(status)) {
    return 'Your quality report is ready. Tap a phase below to see the details.';
  }
  return 'Your site verification is in progress.';
}

// Available site inspectors in the prototype
export const INSPECTORS = [
  'Arun Kumar',
  'Biju Varghese',
  'Rahul Raj'
];

// Diagnostic soil data — for inspector reference only, NOT used for auto-recommendation
export const AI_SPECIFICATIONS = {
  'Thrissur, Kerala': {
    locationName: 'Thrissur, Kerala',
    soilType: 'Laterite Clayey (Swell-prone)',
    bearingCapacity: '150 kN/m²',
    // NOTE: No recommendedFoundation — foundation is always extracted from approved drawings
    trenchDepthSpec: 1.5,
    mortarThicknessSpec: { min: 8, max: 12 },
    plumbSpec: 3
  },
  'Kochi, Kerala': {
    locationName: 'Kochi, Kerala',
    soilType: 'Loose Marine Sand / Clay (Coastal)',
    bearingCapacity: '95 kN/m²',
    trenchDepthSpec: 1.8,
    mortarThicknessSpec: { min: 8, max: 12 },
    plumbSpec: 3
  }
};

export const PROJECTS_LIST = [
  {
    id: 'proj_new_001',
    ownerId: 'demo-user-homeowner-001',
    homeowner: 'Anitha Thomas',
    inspector: 'Pending Assignment',
    inspectorId: null,
    blueprintName: 'palakkad_gplus1_drawings.pdf',
    status: 'Pending Assignment',
    homeownerName: 'Anitha Thomas',
    projectName: 'Anitha Residence — Palakkad',
    assignedInspector: 'Pending Assignment',
    blueprintFile: 'palakkad_gplus1_drawings.pdf',
    blueprintUrl: '/assets/foundation_inspection.png',
    projectStatus: 'Pending Assignment',
    location: 'Palakkad, Kerala',
    pinCode: '678001',
    coordinates: { lat: 10.7867, lng: 76.6548 },
    foundationType: 'cf',
    constructionType: null,
    contractor: 'To be confirmed',
    architect: 'To be confirmed',
    totalProgress: 0,
    currentPhase: 'Awaiting first visit',
    rectificationNotes: '',
    assignment: null,
    historyLogs: [
      {
        action: 'Homeowner registered project and uploaded drawings',
        by: 'Anitha Thomas',
        timestamp: '2026-07-14T09:15:00+05:30',
      },
    ],
    stages: buildBlankStages(),
  },
  {
    id: 'proj_001',
    ownerId: 'demo-user-homeowner-001',
    // Legacy fields kept for backward-compat
    homeowner: 'Suresh Nair',
    inspector: 'Arun Kumar',
    inspectorId: 'demo-user-inspector-001',
    blueprintName: 'floor_plan_thrissur_v3.pdf',
    status: 'Inspecting',
    // New canonical fields
    homeownerName: 'Suresh Nair',
    projectName: 'Suresh Nair Residence — Thrissur',
    assignedInspector: 'Arun Kumar',
    assignment: {
      inspectorId: 'demo-user-inspector-001',
      inspectorName: 'Arun Kumar',
      scope: 'visit',
      visitCodes: ['3C'],
      stageIds: [],
      testIds: [],
      scheduledVisitAt: '2026-07-12T09:00:00+05:30',
      preparationNotes: 'Visit 3C — pour day. Be on site before the transit mixer arrives. Watch vibration and flag any water added to the mix.',
      preparationChecklist: [
        { id: 'prep_drawing', label: 'Review structural drawing / blueprint before visit', checked: false },
        { id: 'prep_access', label: 'Confirm site access and homeowner contact number', checked: false },
        { id: 'prep_tools', label: 'Carry tape measure, plumb bob, and spirit level', checked: false },
        { id: 'prep_camera', label: 'Ensure phone camera is charged for site photos', checked: false },
        { id: 'prep_contractor', label: 'Coordinate with contractor — stage must be ready for inspection', checked: false },
        { id: 'prep_ppe', label: 'Wear safety shoes and helmet on active construction site', checked: false },
      ],
      assignedAt: '2026-07-01T10:00:00+05:30',
      assignedBy: 'Admin',
    },
    blueprintFile: 'floor_plan_thrissur_v3.pdf',
    blueprintUrl: '/assets/foundation_inspection.png',
    projectStatus: 'Inspecting',
    location: 'Thrissur, Kerala',
    coordinates: { lat: 10.5276, lng: 76.2144 },
    foundationType: 'cf',
    constructionType: 'contemporary_traditional',
    contractor: 'Apex Builders',
    architect: 'Design Studio Kerala',
    totalProgress: 68,
    currentPhase: 'Slab',
    rectificationNotes: '',
    aiCalibratedSpecs: {
      soilType: 'Laterite Clayey (Swell-prone)',
      detectedFoundation: 'Random Rubble (RR) Masonry',
      maxPlumbDeviationMM: 3,
      minTrenchDepthMeters: 1.5,
      mortarThicknessMMMin: 8,
      mortarThicknessMMMax: 12
    },
    historyLogs: [
      { action: 'Slab stage inspection assigned', by: 'Admin', timestamp: '2026-07-01T10:00:00+05:30' },
      { action: 'Test 12 submitted for admin review', by: 'Arun Kumar', timestamp: '2026-07-10T09:00:00+05:30' },
    ],
    inspectionChecklist: [
      { id: 'chk_01', stage: 'Foundation', criterion: 'Verify excavation trench depth matches structural drawings.', targetValue: '>= 1.5m', targetNumeric: 1.5, checkType: 'trench_depth', unit: 'm', enteredValue: '1.5', status: 'Pass', photoEvidenceUrl: '/assets/foundation_inspection.png', photoMetadata: [{ gpsLat: 10.5279, gpsLng: 76.2148, timestamp: '2026-05-08T10:00:00Z', outsideBoundary: false }], flaggedAtSave: false, rectificationFiled: false, remarks: 'Trench depth verified at 1.5m. Conforms to structural drawing spec.' },
      { id: 'chk_02', stage: 'Foundation', criterion: 'Verify stone quality and soundness (hammer test).', targetValue: 'Pass / Fail', targetNumeric: null, checkType: 'qualitative', unit: null, enteredValue: 'Pass', status: 'Pass', photoEvidenceUrl: '/assets/foundation_inspection.png', photoMetadata: [{ gpsLat: 10.5279, gpsLng: 76.2148, timestamp: '2026-05-09T09:30:00Z', outsideBoundary: false }], flaggedAtSave: false, rectificationFiled: false, remarks: 'Hard granite stones verified. Hammer ring sound clear.' },
      { id: 'chk_03', stage: 'Structure', criterion: 'Verify wall plumb deviation within spec.', targetValue: '<= 3mm', targetNumeric: 3, checkType: 'plumb', unit: 'mm', enteredValue: '2', status: 'Pass', photoEvidenceUrl: '/assets/wall_plumb_check.png', photoMetadata: [{ gpsLat: 10.5279, gpsLng: 76.2148, timestamp: '2026-06-02T11:45:00Z', outsideBoundary: false }], flaggedAtSave: false, rectificationFiled: false, remarks: 'Plumb deviation 2mm, within 3mm drawing limit.' },
      { id: 'chk_04', stage: 'Structure', criterion: 'Verify mortar joint thickness is within the approved range.', targetValue: '8-12mm', targetNumeric: { min: 8, max: 12 }, checkType: 'mortar', unit: 'mm', enteredValue: '10', status: 'Pass', photoEvidenceUrl: '/assets/wall_plumb_check.png', photoMetadata: [{ gpsLat: 10.5279, gpsLng: 76.2148, timestamp: '2026-06-03T09:30:00Z', outsideBoundary: false }], flaggedAtSave: false, rectificationFiled: false, remarks: 'Mortar joints at 10mm, within 8–12mm range.' },
      { id: 'chk_05', stage: 'Slab', criterion: 'Verify slab formwork level and gap sealing.', targetValue: 'Pass / Fail', targetNumeric: null, checkType: 'qualitative', unit: null, enteredValue: 'Pass', status: 'Pass', photoEvidenceUrl: '/assets/concrete_pouring.png', photoMetadata: [{ gpsLat: 10.5279, gpsLng: 76.2148, timestamp: '2026-06-15T08:00:00Z', outsideBoundary: false }], flaggedAtSave: false, rectificationFiled: false, remarks: 'Formwork leveled and gaps foam-sealed.' },
      { id: 'chk_06', stage: 'Slab', criterion: 'Verify concrete curing — ponding or wet-bag coverage must be complete.', targetValue: 'Pass / Fail', targetNumeric: null, checkType: 'qualitative', unit: null, enteredValue: 'Fail', status: 'Needs Attention', photoEvidenceUrl: '/assets/concrete_pouring.png', photoMetadata: [{ gpsLat: 10.5279, gpsLng: 76.2148, timestamp: '2026-06-24T10:00:00Z', outsideBoundary: false }], flaggedAtSave: true, rectificationFiled: false, remarks: 'Curing ponds dry in two areas under midday sun. Re-inspection required.' },
      { id: 'chk_07', stage: 'Plastering', criterion: 'Verify plastering verticality and mortar mix proportion.', targetValue: 'Pass / Fail', targetNumeric: null, checkType: 'qualitative', unit: null, enteredValue: '', status: 'Pending', photoEvidenceUrl: null, photoMetadata: [], flaggedAtSave: false, rectificationFiled: false, remarks: '' }
    ],
    stages: (() => {
      const s = buildDemoStagesThrissur();
      applySlabDutyWorkflowDemo(s);
      return s;
    })(),
  },
  {
    id: 'proj_003',
    homeowner: 'Priya Krishnan',
    inspector: 'Arun Kumar',
    inspectorId: 'demo-user-inspector-001',
    blueprintName: 'kozhikode_villa_plan.pdf',
    status: 'QA Certified',
    homeownerName: 'Priya Krishnan',
    assignedInspector: 'Arun Kumar',
    assignment: {
      inspectorId: 'demo-user-inspector-001',
      inspectorName: 'Arun Kumar',
      scope: 'visit',
      visitCodes: ['1A', '1B'],
      stageIds: [],
      testIds: [],
      scheduledVisitAt: '2026-05-08T09:00:00+05:30',
      completedAt: '2026-05-18T17:30:00+05:30',
      preparationNotes: 'Past foundation visits 1A+1B completed (record only).',
      preparationChecklist: [
        { id: 'prep_drawing', label: 'Review structural drawing / blueprint before visit', checked: true },
        { id: 'prep_access', label: 'Confirm site access and homeowner contact number', checked: true },
        { id: 'prep_tools', label: 'Carry tape measure, plumb bob, and spirit level', checked: true },
        { id: 'prep_camera', label: 'Ensure phone camera is charged for site photos', checked: true },
        { id: 'prep_contractor', label: 'Coordinate with contractor — stage must be ready for inspection', checked: true },
        { id: 'prep_ppe', label: 'Wear safety shoes and helmet on active construction site', checked: true },
      ],
      assignedAt: '2026-05-05T10:00:00+05:30',
      assignedBy: 'Admin',
    },
    blueprintFile: 'kozhikode_villa_plan.pdf',
    blueprintUrl: '/assets/foundation_inspection.png',
    projectStatus: 'QA Certified',
    location: 'Kozhikode, Kerala',
    coordinates: { lat: 11.2588, lng: 75.7804 },
    foundationType: 'rr',
    contractor: 'Malabar Constructions',
    architect: 'Greenline Architects',
    totalProgress: 100,
    currentPhase: 'Foundation',
    rectificationNotes: '',
    aiCalibratedSpecs: {
      soilType: 'Laterite (Moderate bearing)',
      detectedFoundation: 'Random Rubble (RR) Masonry',
      maxPlumbDeviationMM: 3,
      minTrenchDepthMeters: 1.5,
      mortarThicknessMMMin: 8,
      mortarThicknessMMMax: 12,
    },
    historyLogs: [
      { action: 'Foundation stage inspection assigned', by: 'Admin', timestamp: '2026-05-05T10:00:00+05:30' },
      { action: 'All foundation tests submitted', by: 'Arun Kumar', timestamp: '2026-05-18T11:00:00+05:30' },
      { action: 'Duty completed — report published to homeowner', by: 'Admin', timestamp: '2026-05-18T17:30:00+05:30' },
    ],
    inspectionChecklist: [],
    stages: (() => {
      const s = buildBlankStages();
      patchTestWorkflow(s, 0, '1A', 1, {
        status: STATUS_ENUMS.PASS,
        photos: ['/assets/foundation_inspection.png'],
        measuredValue: 1.5,
        remarks: 'Trench depth 1.5m verified. Base cleaned.',
        workflowStatus: WORKFLOW_STATUS.APPROVED,
        overallResult: OVERALL_RESULTS.DONE_CORRECTLY,
        conditionRating: CONDITION_RATINGS.GOOD,
        submittedAt: '2026-05-08T10:00:00+05:30',
        submittedBy: 'Arun Kumar',
        approvedAt: '2026-05-08T16:00:00+05:30',
        approvedBy: 'Admin',
      });
      patchTestWorkflow(s, 0, '1A', 2, {
        status: STATUS_ENUMS.PASS,
        photos: ['/assets/foundation_inspection.png'],
        remarks: 'Rebar spacing and cover blocks verified.',
        workflowStatus: WORKFLOW_STATUS.APPROVED,
        overallResult: OVERALL_RESULTS.DONE_CORRECTLY,
        conditionRating: CONDITION_RATINGS.GOOD,
        submittedAt: '2026-05-09T10:00:00+05:30',
        submittedBy: 'Arun Kumar',
        approvedAt: '2026-05-09T16:00:00+05:30',
        approvedBy: 'Admin',
      });
      patchTestWorkflow(s, 0, '1B', 3, {
        status: STATUS_ENUMS.PASS,
        photos: ['/assets/foundation_inspection.png'],
        remarks: 'Lapping length verified at 50D.',
        workflowStatus: WORKFLOW_STATUS.APPROVED,
        overallResult: OVERALL_RESULTS.DONE_CORRECTLY,
        conditionRating: CONDITION_RATINGS.GOOD,
        submittedAt: '2026-05-15T10:00:00+05:30',
        submittedBy: 'Arun Kumar',
        approvedAt: '2026-05-15T16:00:00+05:30',
        approvedBy: 'Admin',
      });
      patchTestWorkflow(s, 0, '1B', 4, {
        status: STATUS_ENUMS.PASS,
        photos: ['/assets/foundation_inspection.png'],
        remarks: 'Shuttering sealed. Cover blocks in place.',
        workflowStatus: WORKFLOW_STATUS.APPROVED,
        overallResult: OVERALL_RESULTS.DONE_CORRECTLY,
        conditionRating: CONDITION_RATINGS.GOOD,
        submittedAt: '2026-05-18T11:00:00+05:30',
        submittedBy: 'Arun Kumar',
        approvedAt: '2026-05-18T17:30:00+05:30',
        approvedBy: 'Admin',
      });
      s[0].progress = 100;
      s[0].status = 'Complete';
      return s;
    })(),
  },
  {
    id: 'proj_002',
    // Legacy fields kept for backward-compat
    homeowner: 'Ravi Menon',
    inspector: 'Biju Varghese',
    blueprintName: 'kochi_beachfront_rev2.dwg',
    status: 'Pending QA Review',
    // New canonical fields
    homeownerName: 'Ravi Menon',
    assignedInspector: 'Biju Varghese',
    blueprintFile: 'kochi_beachfront_rev2.dwg',
    projectStatus: 'Pending QA Review',
    location: 'Kochi, Kerala',
    coordinates: { lat: 9.9312, lng: 76.2673 },
    foundationType: 'column_footing',
    contractor: 'Horizon Builders',
    architect: 'Coastal Design Partners',
    totalProgress: 50,
    currentPhase: 'Slab',
    rectificationNotes: '',
    aiCalibratedSpecs: {
      soilType: 'Loose Marine Sand / Clay (Coastal)',
      detectedFoundation: 'Column Footing System',
      maxPlumbDeviationMM: 3,
      minTrenchDepthMeters: 1.8,
      mortarThicknessMMMin: 8,
      mortarThicknessMMMax: 12
    },
    historyLogs: [],
    inspectionChecklist: [
      { id: 'chk_01', stage: 'Foundation', criterion: 'Verify excavation pit depth matches structural drawings.', targetValue: '>= 1.8m', targetNumeric: 1.8, checkType: 'trench_depth', unit: 'm', enteredValue: '1.8', status: 'Pass', photoEvidenceUrl: '/assets/foundation_inspection.png', photoMetadata: [{ gpsLat: 9.9315, gpsLng: 76.2678, timestamp: '2026-05-08T10:00:00Z', outsideBoundary: false }], flaggedAtSave: false, rectificationFiled: false, remarks: 'Pit depth 1.8m confirmed with plumb bob. Matches drawing spec.' },
      { id: 'chk_02', stage: 'Foundation', criterion: 'Verify PCC bedding thickness and quality.', targetValue: 'Pass / Fail', targetNumeric: null, checkType: 'qualitative', unit: null, enteredValue: 'Pass', status: 'Pass', photoEvidenceUrl: '/assets/foundation_inspection.png', photoMetadata: [{ gpsLat: 9.9315, gpsLng: 76.2678, timestamp: '2026-05-10T11:00:00Z', outsideBoundary: false }], flaggedAtSave: false, rectificationFiled: false, remarks: 'PCC bed 7.5cm thick, cast level.' },
      { id: 'chk_03', stage: 'Structure', criterion: 'Verify wall plumb deviation within spec.', targetValue: '<= 3mm', targetNumeric: 3, checkType: 'plumb', unit: 'mm', enteredValue: '1.5', status: 'Pass', photoEvidenceUrl: '/assets/wall_plumb_check.png', photoMetadata: [{ gpsLat: 9.9315, gpsLng: 76.2678, timestamp: '2026-06-02T11:45:00Z', outsideBoundary: false }], flaggedAtSave: false, rectificationFiled: false, remarks: 'Max deviation 1.5mm across all wall faces checked.' },
      { id: 'chk_04', stage: 'Structure', criterion: 'Verify mortar joint thickness is within the approved range.', targetValue: '8-12mm', targetNumeric: { min: 8, max: 12 }, checkType: 'mortar', unit: 'mm', enteredValue: '9', status: 'Pass', photoEvidenceUrl: '/assets/wall_plumb_check.png', photoMetadata: [{ gpsLat: 9.9315, gpsLng: 76.2678, timestamp: '2026-06-03T09:30:00Z', outsideBoundary: false }], flaggedAtSave: false, rectificationFiled: false, remarks: 'Mortar joints consistently at 9mm.' },
      { id: 'chk_05', stage: 'Slab', criterion: 'Verify slab formwork level and gap sealing.', targetValue: 'Pass / Fail', targetNumeric: null, checkType: 'qualitative', unit: null, enteredValue: 'Fail', status: 'Needs Attention', photoEvidenceUrl: '/assets/concrete_pouring.png', photoMetadata: [{ gpsLat: 9.9315, gpsLng: 76.2678, timestamp: '2026-06-24T10:00:00Z', outsideBoundary: false }], flaggedAtSave: true, rectificationFiled: false, remarks: 'Two panels have gaps not sealed — risk of honeycomb void.' },
      { id: 'chk_06', stage: 'Slab', criterion: 'Verify concrete compaction and vibration execution.', targetValue: 'Pass / Fail', targetNumeric: null, checkType: 'qualitative', unit: null, enteredValue: '', status: 'Pending', photoEvidenceUrl: null, photoMetadata: [], flaggedAtSave: false, rectificationFiled: false, remarks: '' },
      { id: 'chk_07', stage: 'Plastering', criterion: 'Verify plastering verticality and mortar mix proportion.', targetValue: 'Pass / Fail', targetNumeric: null, checkType: 'qualitative', unit: null, enteredValue: '', status: 'Pending', photoEvidenceUrl: null, photoMetadata: [], flaggedAtSave: false, rectificationFiled: false, remarks: '' }
    ],
    stages: buildDemoStagesKochi(),
  }
];

export const getBlankStages = () => buildBlankStages();

/**
 * Generates an AI Blueprint Extraction Report.
 * Frames the analysis as extracting what the approved drawings SPECIFY,
 * not recommending what to do based on location.
 *
 * @param {string} location - Site location string
 * @param {string} blueprint - Blueprint file name
 * @param {object} aiCalibratedSpecs - Specs extracted from the homeowner's drawing
 * @param {Array}  imageFiles - Array of site photo URLs submitted
 * @param {boolean} hasStarted - Whether construction is already underway
 */
export const generateAiFeedback = (location, blueprint, aiCalibratedSpecs, imageFiles, hasStarted) => {
  const specs = aiCalibratedSpecs || {};
  const detectedFoundation = specs.detectedFoundation || 'Not Specified';
  const trenchDepth       = specs.minTrenchDepthMeters  || 1.5;
  const plumbLimit        = specs.maxPlumbDeviationMM    || 3;
  const mortarMin         = specs.mortarThicknessMMMin   || 8;
  const mortarMax         = specs.mortarThicknessMMMax   || 12;
  const soilType          = specs.soilType               || 'Regional soil type (diagnostic only)';

  let report = `### 🤖 Gemini AI Blueprint Extraction Report

**Extraction Context**:
- **Drawing File**: ${blueprint}
- **Site Location**: ${location}
- **Contextual Soil Note**: ${soilType} *(Diagnostic — For inspector reference only, does NOT determine foundation type)*

#### 📐 Specifications Extracted from Approved Structural Drawings:
| Parameter | Extracted Value | Source |
|---|---|---|
| Foundation System | **${detectedFoundation}** | Structural drawing (approved by engineer) |
| Min. Trench / Pit Depth | **${trenchDepth}m** | Section drawing — foundation detail |
| Max. Plumb Deviation | **${plumbLimit}mm** | IS 1905 tolerance, confirmed in drawing notes |
| Mortar Joint Thickness | **${mortarMin}mm – ${mortarMax}mm** | Drawing notes / specification sheet |

`;

  if (!hasStarted) {
    report += `#### 📋 Site Status: Pre-Construction Phase
- **Baseline Visual Scan**: No active construction detected from submitted boundary photos. Baseline recorded.
- **🔒 Inspector Directives** (Derived from drawing specs, not from regional estimate):
  1. Before any concrete is poured, physically verify excavation depth achieves the drawn minimum of **${trenchDepth}m**.
  2. Confirm that the foundation system being executed on-site matches the drawing specification: **${detectedFoundation}**.
  3. Record all measurements against the extracted spec values above. Field values must match — deviation must be flagged and photo-evidenced.`;
  } else {
    report += `#### 🛠️ Site Status: Construction Phase Active
- **Gemini Vision Extraction** (${imageFiles?.length || 0} homeowner-submitted images analyzed):
  - Construction progress is visible and consistent with the declared active phase.
  - AI cross-references site photos against extracted drawing parameters.
  - ⚠️ Photo analysis is indicative only. All parameters must be physically verified by the field inspector.
- **🔒 Inspector Directives** (Derived from drawing specs, not from regional estimate):
  1. Measure and record actual trench / pit depth. Target: **≥ ${trenchDepth}m**. Any shortfall is a CRITICAL flag.
  2. Verify plumb using a calibrated spirit level or plumb bob. Tolerance: **≤ ${plumbLimit}mm**.
  3. Measure mortar joint thickness using a feeler gauge. Acceptable range: **${mortarMin}mm – ${mortarMax}mm**.
  4. All out-of-spec measurements MUST be accompanied by geo-tagged photo evidence before the checklist item can be saved.`;
  }

  return report;
};

/**
 * Generates a blank flat inspectionChecklist from a project's aiCalibratedSpecs.
 * Used when creating a new project via the homeowner submittal form.
 */
export const getBlankChecklist = (aiCalibratedSpecs, foundationType = 'rr') => {
  const isRR       = (foundationType || '').includes('rr') || (foundationType || '').toLowerCase().includes('rubble');
  const specs      = aiCalibratedSpecs || {};
  const trenchDepth = specs.minTrenchDepthMeters  || 1.5;
  const plumbLimit  = specs.maxPlumbDeviationMM    || 3;
  const mortarMin   = specs.mortarThicknessMMMin   || 8;
  const mortarMax   = specs.mortarThicknessMMMax   || 12;

  const blank = (id, stage, criterion, targetValue, targetNumeric, checkType, unit) => ({
    id, stage, criterion, targetValue, targetNumeric, checkType, unit,
    enteredValue: '', status: 'Pending',
    photoEvidenceUrl: null, photoMetadata: [],
    flaggedAtSave: false, rectificationFiled: false, remarks: ''
  });

  return [
    blank('chk_01', 'Foundation',
      'Verify excavation trench / pit depth matches structural drawings.',
      `>= ${trenchDepth}m`, trenchDepth, 'trench_depth', 'm'),
    blank('chk_02', 'Foundation',
      isRR
        ? 'Verify stone quality and soundness (hammer test).'
        : 'Verify PCC bedding thickness (≥ 7.5cm) and quality.',
      'Pass / Fail', null, 'qualitative', null),
    blank('chk_03', 'Structure',
      'Verify wall plumb deviation is within the approved tolerance.',
      `<= ${plumbLimit}mm`, plumbLimit, 'plumb', 'mm'),
    blank('chk_04', 'Structure',
      'Verify mortar joint thickness is within the approved range.',
      `${mortarMin}–${mortarMax}mm`, { min: mortarMin, max: mortarMax }, 'mortar', 'mm'),
    blank('chk_05', 'Slab',
      'Verify slab formwork is level and all gaps are sealed.',
      'Pass / Fail', null, 'qualitative', null),
    blank('chk_06', 'Slab',
      'Verify concrete compaction and vibration execution.',
      'Pass / Fail', null, 'qualitative', null),
    blank('chk_07', 'Plastering',
      'Verify plastering verticality and mortar mix proportion.',
      'Pass / Fail', null, 'qualitative', null)
  ];
};
