/**
 * SiteVerify — Kerala Construction Types & Stage Reference
 * Admin knowledge base (Research Verified | July 2026)
 *
 * Product stages stay fixed (4 stages → 9 visits → 17 tests).
 * Assignment rule: ONE VISIT per site day.
 * Never combine 1A+1B, or any slab visits 3A–3D.
 */

import { VISIT_MAP, VISIT_TYPE_LABELS } from './visitStructure';

/** @deprecated Prefer VISIT_MAP — kept for any stage-level summaries */
export const SITEVERIFY_STAGE_GUIDE = [
  {
    id: 'stage_1',
    name: 'Foundation',
    visitNote: '2 visits: 1A (tests 1–2) then 1B (tests 3–4). Min 7 days apart. Cannot combine.',
    testNumbers: [1, 2, 3, 4],
    priorities: [
      'Visit 1A before pour/rubble pack',
      'Visit 1B before plinth pour',
      'RR: mark Tests 2–4 N/A as applicable',
    ],
  },
  {
    id: 'stage_2',
    name: 'Structure Till Slab',
    visitNote: '1 visit (2A) when walls ~60–70% up — before plaster hides joints.',
    testNumbers: [5, 6, 7],
    priorities: ['Wall plumb', 'Mortar ≤12mm', 'Staggered bonding'],
  },
  {
    id: 'stage_3',
    name: 'Slab',
    visitNote: '4 separate visits: 3A formwork → 3B steel (critical) → 3C pour day → 3D curing (unannounced).',
    testNumbers: [8, 9, 10, 11, 12, 13, 14],
    priorities: [
      '3B same-day admin approval before pour',
      '3C live vibration + no on-site water',
      '3D ponding check unannounced',
    ],
  },
  {
    id: 'stage_4',
    name: 'Plastering',
    visitNote: 'Visit 4A: T16 then T17 before plaster. Visit 4B: T15 after base coat.',
    testNumbers: [16, 17, 15],
    priorities: ['Mix before plaster starts (T16)', 'Joint mesh everywhere (T17)', 'Plaster plumb after base coat (T15)'],
  },
];

export const SITEVERIFY_VISIT_GUIDE = VISIT_MAP.map((v) => ({
  ...v,
  typeLabel: VISIT_TYPE_LABELS[v.type],
}));

export const KERALA_CONSTRUCTION_TYPES = [
  {
    id: 'rr_load_bearing',
    name: 'RR Foundation + Load Bearing',
    shortName: 'Rubble Masonry (RR)',
    summary:
      'Random Rubble (granite/laterite) dry-packed foundation; walls carry the load. Common in stable midland/highland soil.',
    whereUsed: 'Thrissur interior, Palakkad, Malappuram, northern Kannur, Kozhikode (hard soil). G / G+1 only. Not for coastal or soft soil.',
    foundation: 'rr',
    siteverifyFocus: 'stage_1',
    inspectionPriorities: [
      'Tight dry-pack vs thrown rubble (most common Kerala defect)',
      'DPC continuity at plinth',
      'Mortar joint thickness and bonding in walls',
      'Lintels above all openings',
      'Wall plumb each course',
    ],
    risks: [
      'Throwing rubble into trench without packing leaves voids and uneven settlement',
      'Digging “6 feet” as superstition instead of stopping at hard strata',
    ],
  },
  {
    id: 'laterite',
    name: 'Laterite Stone Structure (Vettukallu)',
    shortName: 'Laterite',
    summary:
      'Laterite block walls; soft when quarried, hardens with age. Excellent thermal mass; high water absorption.',
    whereUsed: 'Thrissur, Malappuram, Kozhikode, Kannur, Kasaragod. G / G+1. Not multi-storey above 2 floors; avoid coastal salt spray.',
    foundation: 'rr_or_column',
    siteverifyFocus: 'stage_2',
    inspectionPriorities: [
      'DPC quality (critical because laterite absorbs water)',
      'Mortar joints 10–15mm',
      'Bonding pattern + wall plumb every 3–4 courses',
      'Joint mesh at RCC column–laterite junctions',
      'External plaster / waterproofing coverage',
    ],
    risks: [
      'Missing DPC → rising damp into laterite',
      'Unplastered external faces in monsoon',
    ],
  },
  {
    id: 'contemporary_traditional',
    name: 'Contemporary Traditional (RCC + Kerala aesthetics)',
    shortName: 'RCC + Traditional',
    summary:
      'RCC frame carries all loads; walls non-structural. Mangalore tiles / verandah aesthetics. Primary NRI home type — SiteVerify’s main focus.',
    whereUsed: 'All districts; typical 1,500–3,000 sq ft G+1 NRI homes.',
    foundation: 'column_footing',
    siteverifyFocus: 'all',
    inspectionPriorities: [
      'All 17 SiteVerify tests apply in full',
      'Cover blocks at footings (highest shortcut risk)',
      'Slab vibration in one continuous pour',
      'Joint mesh at every column–wall junction',
      'Post-pour curing full duration',
    ],
    risks: [
      'Early shuttering removal to start next floor',
      'Missing joint mesh on budget builds',
    ],
  },
  {
    id: 'modern_square',
    name: 'Modern Square / Contemporary (RCC + Flat Roof)',
    shortName: 'Modern Flat Roof',
    summary:
      'RCC frame, flat slab roof, box form, large glass. Urban Kochi / TVM / Kozhikode and younger NRI homes.',
    whereUsed: 'Urban plots; G+1 / G+2; 1,200–2,500 sq ft typical.',
    foundation: 'column_footing',
    siteverifyFocus: 'stage_3',
    inspectionPriorities: [
      'Stage 3 slab tests at highest priority',
      'Vibration critical (honeycomb + flat-roof leaks)',
      'Watch for unusually slim columns vs span',
      'Note: roof waterproofing / slope checks are beyond current 17-test scope — flag in remarks',
    ],
    risks: [
      'Flat roof leakage without slope + membrane',
      'Honeycombing on long spans',
      'Slim columns with reduced steel for aesthetics',
      'Parapet–slab junction leaks',
    ],
  },
];

export const FOUNDATION_QUICK_REF = [
  {
    id: 'rr',
    name: 'RR Foundation',
    usedFor: 'Stable midland/highland laterite soil; G / G+1',
    keyCheck: 'Tight dry-pack vs thrown rubble',
  },
  {
    id: 'column_footing',
    name: 'Column Footing (Isolated RCC)',
    usedFor: 'Modern RCC frames (Types 3 & 4)',
    keyCheck: 'Cover blocks, steel cage, concrete grade',
  },
  {
    id: 'raft',
    name: 'Raft Foundation',
    usedFor: 'Weak soil, urban plots, G+2+',
    keyCheck: 'Waterproofing below raft, uniform thickness',
  },
  {
    id: 'pile',
    name: 'Pile Foundation',
    usedFor: 'Coastal / backwater / marshy — Alappuzha, coastal Ernakulam, Kuttanad',
    keyCheck: 'Pile depth records, pile-cap connection',
  },
];

export const SEASONAL_CALENDAR = [
  {
    period: 'October – February',
    label: 'Best season',
    note: 'Dry, cool — best for foundation pours, slab pours, plaster, paint.',
  },
  {
    period: 'March – May',
    label: 'Acceptable with care',
    note: 'Heat accelerates drying — curing is critical. OK for structure and walls.',
  },
  {
    period: 'June – September',
    label: 'Southwest monsoon — high risk',
    note: 'Avoid foundation/slab pours and plaster. Flag monsoon pours and increase visit frequency.',
  },
  {
    period: 'October – November',
    label: 'Northeast monsoon',
    note: 'Extra rain in north Kerala — same caution as southwest monsoon.',
  },
];

export const TYPE_IDENTIFY_QUESTIONS = [
  {
    id: 'q1',
    question: 'Roof: Mangalore clay tiles (sloped) or flat concrete?',
    options: [
      { answer: 'Sloped tiles', types: 'Type 1, 2, or 3' },
      { answer: 'Flat concrete', types: 'Type 4' },
    ],
  },
  {
    id: 'q2',
    question: 'Walls: laterite (reddish) or grey hollow concrete blocks?',
    options: [
      { answer: 'Laterite', types: 'Type 2 or 3 (cladding)' },
      { answer: 'Hollow concrete', types: 'Type 3 or 4' },
    ],
  },
  {
    id: 'q3',
    question: 'Load path: thick walls carry roof, or separate RCC columns + infill?',
    options: [
      { answer: 'Thick walls carry roof', types: 'Type 1 or 2 (load bearing)' },
      { answer: 'Separate columns', types: 'Type 3 or 4 (RCC frame)' },
    ],
  },
];

export function getConstructionType(id) {
  return KERALA_CONSTRUCTION_TYPES.find((t) => t.id === id) || null;
}

export function getStageGuide(stageId) {
  return SITEVERIFY_STAGE_GUIDE.find((s) => s.id === stageId) || null;
}
