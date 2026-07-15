/**
 * SiteVerify visit map — source of truth for admin assignment.
 *
 * Structure (do not change):
 *   PROJECT → 4 STAGES → 9 VISITS → 17 TESTS
 *
 * Use the word "visit" everywhere in product copy (not "sub-stage").
 *
 * Timing types (plain English):
 *   pre_event   — arrive BEFORE work is covered or poured
 *   mid_process — check while work is partway done
 *   during_event — live on site during active work (Visit 3C only)
 *   post_event  — arrive AFTER work is done
 */

export const VISIT_TYPES = {
  PRE_EVENT: 'pre_event',
  DURING_EVENT: 'during_event',
  POST_EVENT: 'post_event',
  MID_PROCESS: 'mid_process',
};

export const VISIT_MAP = [
  {
    code: '1A',
    stageId: 'stage_1',
    stageName: 'Foundation',
    name: 'Trench & Footing Check',
    visitLabel: 'Visit 1A',
    testNumbers: [1, 2],
    type: VISIT_TYPES.PRE_EVENT,
    timing: 'Before footing concrete pour — or before rubble packing on Rubble Masonry (RR) builds',
    gapAfter: 'Wait at least 7 days before Visit 1B (footing must cure)',
    cannotCombine: true,
    adminPriority: 'normal',
    /** Which tests can be N/A — shown in admin knowledge + assign UI */
    naByFoundation: {
      rcc: [],
      rr_pure: [2],
      rr_hybrid: [2],
    },
    rrNotes: {
      test2: 'Not applicable for this build type on Rubble Masonry (RR) — no steel cage.',
      rubbleEvidenceUnderTest1: [
        'Photo: trench bottom before rubble',
        'Photo: tight rubble packing (not thrown in)',
        'Photo: crusher sand force-filled into gaps',
      ],
    },
  },
  {
    code: '1B',
    stageId: 'stage_1',
    stageName: 'Foundation',
    name: 'Plinth Beam Check',
    visitLabel: 'Visit 1B',
    testNumbers: [3, 4],
    type: VISIT_TYPES.PRE_EVENT,
    timing: 'Before plinth beam pour — after footing has cured (at least 7 days after Visit 1A)',
    gapAfter: 'Then DPC at plinth top → Stage 1 complete',
    cannotCombine: true,
    adminPriority: 'normal',
    naByFoundation: {
      rcc: [],
      rr_pure: [3, 4],
      rr_hybrid: [],
    },
    rrNotes: {
      test3: 'Pure RR plinth → not applicable. Hybrid RR + RCC plinth beam → applies.',
      test4: 'Pure RR plinth → not applicable. Hybrid RR + RCC plinth beam → applies.',
    },
  },
  {
    code: '2A',
    stageId: 'stage_2',
    stageName: 'Structure Till Slab',
    name: 'Wall Construction Check',
    visitLabel: 'Visit 2A',
    testNumbers: [5, 6, 7],
    type: VISIT_TYPES.MID_PROCESS,
    timing: 'While walls are being built (~60–70% up) — mortar joints still visible, before plaster',
    gapAfter: 'Walls finish → sill/lintels → ready for Stage 3',
    cannotCombine: true,
    adminPriority: 'normal',
  },
  {
    code: '3A',
    stageId: 'stage_3',
    stageName: 'Slab',
    name: 'Formwork Check',
    visitLabel: 'Visit 3A',
    testNumbers: [8, 9],
    type: VISIT_TYPES.PRE_EVENT,
    timing: 'After formwork (centering) is up, before steel is placed',
    gapAfter: 'Admin approves → contractor lays slab steel',
    cannotCombine: true,
    adminPriority: 'high',
  },
  {
    code: '3B',
    stageId: 'stage_3',
    stageName: 'Slab',
    name: 'Steel & Cover Blocks',
    visitLabel: 'Visit 3B',
    testNumbers: [10, 11],
    type: VISIT_TYPES.PRE_EVENT,
    timing: 'After steel is fully placed, before pour',
    gapAfter: 'Admin approves → pour may begin',
    cannotCombine: true,
    adminPriority: 'critical',
    alertNote:
      'Admin must approve Visit 3B within 2–4 hours of submission. The concrete pour cannot wait — transit-mix concrete must be used within about 90 minutes of batching. If admin is unavailable, escalate immediately.',
  },
  {
    code: '3C',
    stageId: 'stage_3',
    stageName: 'Slab',
    name: 'Pour Day (Live Observation)',
    visitLabel: 'Visit 3C',
    testNumbers: [12, 13],
    type: VISIT_TYPES.DURING_EVENT,
    timing: 'Live on site during active work — inspector present while concrete is poured',
    gapAfter: 'Slab finished → curing begins immediately',
    cannotCombine: true,
    adminPriority: 'critical',
    requiresPourDate: true,
    schedulingRule:
      'Pour day must be confirmed by the contractor at least 24 hours in advance. Admin contacts the contractor (WhatsApp or phone), fills the pour date when assigning Visit 3C, then assigns the inspector. If pour date is unknown, do not assign 3C.',
  },
  {
    code: '3D',
    stageId: 'stage_3',
    stageName: 'Slab',
    name: 'Curing Verification',
    visitLabel: 'Visit 3D',
    testNumbers: [14],
    type: VISIT_TYPES.POST_EVENT,
    timing: '2–3 days after pour',
    gapAfter: 'Curing continues 14 days min; shuttering 21–28 days',
    cannotCombine: true,
    adminPriority: 'high',
    unannounced: true,
    schedulingRule:
      'Visit 3D must NOT be announced to the contractor. Admin assigns the inspector and date internally only. This is deliberate — an unannounced curing check shows whether the slab is actually kept wet, not just flooded the night before.',
  },
  {
    code: '4A',
    stageId: 'stage_4',
    stageName: 'Plastering',
    name: 'Pre-Plaster Check',
    visitLabel: 'Visit 4A',
    // On site: check mix (T16) first, then mesh (T17)
    testNumbers: [16, 17],
    type: VISIT_TYPES.PRE_EVENT,
    timing: 'Before first plaster coat — after wall prep / mesh ready',
    gapAfter: 'Admin approves → plastering can begin',
    cannotCombine: false,
    adminPriority: 'high',
    note: 'May share day with Visit 4B only if mesh is ready on one section and base coat is ready on another',
  },
  {
    code: '4B',
    stageId: 'stage_4',
    stageName: 'Plastering',
    name: 'Surface Quality Check',
    visitLabel: 'Visit 4B',
    testNumbers: [15],
    type: VISIT_TYPES.POST_EVENT,
    timing: 'After base coat has set (1–3 days), before finish coat',
    gapAfter: 'Admin approves → finish coat → Stage 4 complete',
    cannotCombine: false,
    adminPriority: 'normal',
  },
];

export const VISIT_TYPE_LABELS = {
  [VISIT_TYPES.PRE_EVENT]: 'Before the work is covered',
  [VISIT_TYPES.DURING_EVENT]: 'Live on site during active work',
  [VISIT_TYPES.POST_EVENT]: 'After the work is done',
  [VISIT_TYPES.MID_PROCESS]: 'While work is partway done',
};

/** Tests auto-marked N/A on pure Rubble Masonry (RR) foundations */
export const RR_NA_TEST_NUMBERS = [2, 3, 4];

export function getVisitByCode(code) {
  return VISIT_MAP.find((v) => v.code === code) || null;
}

export function getVisitsForStage(stageId) {
  return VISIT_MAP.filter((v) => v.stageId === stageId);
}

export function isRrFoundationProject(project) {
  if (!project) return false;
  if (project.foundationType === 'rr') return true;
  return ['rr_load_bearing', 'laterite'].includes(project.constructionType);
}

/**
 * Pure RR → T2, T3, T4 not applicable.
 * Hybrid RR + RCC plinth beam (`plinthBeamType === 'rcc'`) → only T2 not applicable.
 * RCC column footing → none N/A.
 */
export function getRrNaTestNumbers(project) {
  if (!isRrFoundationProject(project)) return [];
  if (project.plinthBeamType === 'rcc') return [2];
  return [...RR_NA_TEST_NUMBERS];
}

export function getVisitTotalsSummary() {
  return {
    totalVisits: VISIT_MAP.length,
    totalTests: 17,
    note: 'Rubble Masonry (RR): up to 3 tests N/A (T2–T4). RCC footing: all 17 apply.',
  };
}
