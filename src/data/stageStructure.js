import { getDefaultWorkflowFields, WORKFLOW_STATUS, OVERALL_RESULTS } from './testWorkflow';
import { getRrNaTestNumbers } from './visitStructure';

const STATUS = {
  PASS: 'Pass',
  IGNORED: 'Can be ignored',
  ATTENTION: 'Needs Attention',
  CRITICAL: 'Critical',
};

export const TEST_KNOWLEDGE = {
  1: {
    benefit: 'A clean trench ensures the foundation is poured on solid, stable ground, preventing long-term settlement.',
    ifSkipped: 'Loose soil, roots, or debris left at the bottom causes the foundation to shift over time, creating severe structural cracks in walls and floors.',
  },
  2: {
    benefit: 'Correct steel spacing and cover blocks ensure the foundation has maximum structural strength and the steel stays protected inside the concrete.',
    ifSkipped: 'Steel touching raw earth absorbs moisture, rusts, expands, and destroys the foundation from within. This damage is invisible until it is too late and extremely expensive to repair.',
  },
  3: {
    benefit: 'Proper lapping ensures steel bars transfer loads safely at their joints, keeping the plinth beam structurally sound.',
    ifSkipped: 'Short or improper laps create weak joints in the beam that can crack under the weight of the structure above.',
  },
  4: {
    benefit: 'Secured shuttering and cover blocks ensure the concrete pours evenly and the steel is fully protected inside the beam.',
    ifSkipped: 'Gaps in shuttering cause cement paste to leak out, leaving behind weak, honeycombed concrete with exposed steel that will corrode.',
  },
  5: {
    benefit: 'Perfectly vertical walls ensure structural balance, straight tile lines, and even plastering.',
    ifSkipped: 'Leaning walls create structural imbalances, require excessively thick and expensive plaster to correct, and cause uneven tile alignments throughout the home.',
  },
  6: {
    benefit: 'Mortar joints within the correct thickness (under 12mm) create a solid, strong bond between blocks or bricks.',
    ifSkipped: 'Joints that are too thick shrink as they dry, causing the wall to shift and develop horizontal cracking patterns across the surface.',
  },
  7: {
    benefit: 'Correct block or brick arrangement (bonding) ensures the wall acts as one interlocked unit rather than independent stacked pieces.',
    ifSkipped: 'Incorrect bonding creates continuous vertical joints that are natural failure planes, making walls vulnerable to collapse under lateral load.',
  },
  8: {
    benefit: 'A perfectly level slab formwork ensures the finished ceiling and floor are flat and structurally even.',
    ifSkipped: 'An unlevel base causes the slab to pour with uneven thickness, creating weak spots and sloping floors that cannot be corrected without breaking out the slab.',
  },
  9: {
    benefit: 'Sealed formwork joints retain the full cement paste in the pour, producing dense, strong concrete.',
    ifSkipped: 'Cement slurry leaks through gaps, leaving behind brittle, hollow, honeycombed concrete sections with exposed steel — a serious structural defect visible only after shuttering is removed.',
  },
  10: {
    benefit: 'Correct steel grid layout gives the slab its designed load-bearing capacity.',
    ifSkipped: 'Bars spaced too far apart or undersized reduce the slab\'s strength significantly, risking cracks or deflection under normal household loads.',
  },
  11: {
    benefit: 'Cover blocks elevate the steel off the formwork, ensuring it is fully encased in concrete and protected from moisture for the life of the building.',
    ifSkipped: 'Steel sitting on the formwork ends up at the very bottom surface of the slab, exposed to moisture. It rusts, expands, and causes the concrete to crack and spall from below within years.',
  },
  12: {
    benefit: 'Needle vibrators remove all trapped air from the poured concrete, giving it full density and designed strength.',
    ifSkipped: 'Concrete with 10% trapped air can lose up to 50% of its intended strength. Air pockets create weak zones and honeycombing inside columns, beams, and the slab.',
  },
  13: {
    benefit: 'Extra water makes concrete easier to pour but permanently weakens it. Checking the mix on pour day catches that shortcut.',
    ifSkipped: 'A mix with too much water can lose 30% or more of its designed strength — invisible from outside but a serious structural risk over time.',
  },
  14: {
    benefit: 'Keeping the slab or columns continuously moist for 7-14 days allows concrete to chemically cure and reach 100% of its designed strength.',
    ifSkipped: 'Concrete that dries out too quickly loses up to 50% of its potential strength and develops micro-cracks across the surface that allow water penetration throughout the life of the building.',
  },
  15: {
    benefit: 'A perfectly plumb plaster surface ensures tiles sit flat, paint looks even, and the finish is consistent throughout.',
    ifSkipped: 'Wavy or leaning plaster surfaces require costly re-plastering and cause tiles to crack at joints due to uneven bedding.',
  },
  16: {
    benefit: 'The correct cement-to-sand ratio gives plaster the right strength and adhesion to stay bonded to the wall for decades.',
    ifSkipped: 'Too much sand makes plaster weak and powdery. Too much cement makes it brittle. Either leads to plaster falling off the wall within a few years.',
  },
  17: {
    benefit: 'Fiberglass mesh nailed across concrete-to-block joints absorbs the different expansion rates of the two materials, keeping the plaster surface intact.',
    ifSkipped: 'Concrete and blockwork expand differently in Kerala\'s heat. Without mesh, hairline vertical cracks form exactly where the column meets the wall — the most visible and most common defect in Kerala homes — allowing rainwater to seep in over time.',
  },
};

function makeTest(testNumber, name, overrides = {}) {
  const knowledge = TEST_KNOWLEDGE[testNumber];
  return {
    id: `test_${testNumber}`,
    testNumber,
    name,
    status: STATUS.IGNORED,
    timestamp: null,
    photos: [],
    remarks: '',
    knowledge: knowledge
      ? { benefit: knowledge.benefit, demerit: knowledge.ifSkipped }
      : null,
    ...getDefaultWorkflowFields(),
    ...overrides,
  };
}

function makeSubStage(code, name, tests) {
  return {
    id: `sub_${code.toLowerCase().replace(/\s+/g, '_')}`,
    code,
    name,
    progress: 0,
    tests: tests.map(([num, testName]) => makeTest(num, testName)),
  };
}

export function buildBlankStages() {
  return [
    {
      id: 'stage_1',
      name: 'Foundation',
      progress: 0,
      status: 'Pending',
      subStages: [
        makeSubStage('1A', 'RR / Column Footing', [
          [1, 'Trench & Pit Verification'],
          [2, 'Footing Reinforcement & Cover Blocks'],
        ]),
        makeSubStage('1B', 'Plinth Beam', [
          [3, 'Steel Lapping & Spacing'],
          [4, 'Formwork & Concrete Cover'],
        ]),
      ],
    },
    {
      id: 'stage_2',
      name: 'Structure Till Slab',
      progress: 0,
      status: 'Pending',
      subStages: [
        makeSubStage('2A', 'Wall Construction', [
          [5, 'Plumb Check (Verticality)'],
          [6, 'Mortar Thickness'],
          [7, 'Bonding Type'],
        ]),
      ],
    },
    {
      id: 'stage_3',
      name: 'Slab',
      progress: 0,
      status: 'Pending',
      subStages: [
        makeSubStage('3A', 'Formwork', [
          [8, 'Leveling & Alignment'],
          [9, 'Gap Sealing'],
        ]),
        makeSubStage('3B', 'Reinforcement', [
          [10, 'Bar Spacing & Sizing'],
          [11, 'Cover Blocks Placement'],
        ]),
        makeSubStage('3C', 'Concrete Pouring', [
          [12, 'Vibration & Compaction'],
          [13, 'Visual Material Check'],
        ]),
        makeSubStage('3D', 'Curing', [
          [14, 'Ponding / Wet Bag Verification'],
        ]),
      ],
    },
    {
      id: 'stage_4',
      name: 'Plastering',
      progress: 0,
      status: 'Pending',
      subStages: [
        // Visit 4A: T16 first (mix), then T17 (mesh). Visit 4B: T15 after base coat.
        makeSubStage('4A', 'Pre-Plaster Prep', [
          [16, 'Mortar Mix Proportion'],
          [17, 'Joint Mesh Verification'],
        ]),
        makeSubStage('4B', 'Surface Quality', [
          [15, 'Verticality (Plumb Check)'],
        ]),
      ],
    },
  ];
}

/**
 * Admin setup: for RR (or RR+hybrid) foundations, mark steel tests N/A
 * so inspectors do not treat them as open duties. Evidence for rubble
 * packing stays under Test 1 remarks / photos.
 */
export function applyRrFoundationNa(stages, project) {
  const naNums = getRrNaTestNumbers(project);
  if (!naNums.length) return stages;

  const notes = {
    2: 'Not applicable for this build type — Rubble Masonry (RR) foundation has no steel cage.',
    3: 'Not applicable for this build type — pure RR plinth has no steel lapping. (Hybrid with RCC plinth beam: this test applies.)',
    4: 'Not applicable for this build type — pure RR plinth has no RCC formwork. (Hybrid with RCC plinth beam: this test applies.)',
  };

  return (stages || []).map((stage) => ({
    ...stage,
    subStages: (stage.subStages || []).map((sub) => ({
      ...sub,
      tests: (sub.tests || []).map((test) => {
        if (!naNums.includes(test.testNumber)) return test;
        return {
          ...test,
          overallResult: OVERALL_RESULTS.NOT_APPLICABLE,
          workflowStatus: WORKFLOW_STATUS.APPROVED,
          adminNote: notes[test.testNumber] || 'N/A for this foundation type.',
          remarks: notes[test.testNumber] || test.remarks,
          approvedAt: test.approvedAt || new Date().toISOString(),
          approvedBy: test.approvedBy || 'Admin (RR setup)',
          status: STATUS.IGNORED,
        };
      }),
    })),
  }));
}

export function buildDemoStagesThrissur() {
  let stages = buildBlankStages();

  const patch = (stageIdx, subCode, testNum, data) => {
    const sub = stages[stageIdx].subStages.find((s) => s.code === subCode);
    const test = sub.tests.find((t) => t.testNumber === testNum);
    Object.assign(test, data);
  };

  patch(0, '1A', 1, {
    status: STATUS.PASS,
    timestamp: '2026-05-08T10:00:00Z',
    photos: ['/assets/foundation_inspection.png'],
    measuredValue: 1.5,
    remarks: 'Trench width verified at 90cm and depth at 1.5m. Base cleaned of loose soil and debris.',
  });
  patch(0, '1A', 2, {
    status: STATUS.PASS,
    timestamp: '2026-05-09T09:30:00Z',
    photos: ['/assets/foundation_inspection.png'],
    remarks: 'Rebar spacing aligns with layout drawings. Cover blocks placed at 50mm on all sides.',
  });
  patch(0, '1B', 3, {
    status: STATUS.PASS,
    timestamp: '2026-05-18T11:00:00Z',
    photos: ['/assets/foundation_inspection.png'],
    remarks: 'Lapping length verified at 50D. Stirrups at 150mm spacing throughout.',
  });
  patch(0, '1B', 4, {
    status: STATUS.PASS,
    timestamp: '2026-05-18T14:30:00Z',
    photos: ['/assets/foundation_inspection.png'],
    remarks: 'Shuttering sealed and leak-proof. Cover blocks fixed on bottom and sides.',
  });

  stages[0].progress = 100;
  stages[0].status = 'Complete';

  patch(1, '2A', 5, {
    status: STATUS.PASS,
    timestamp: '2026-06-02T11:45:00Z',
    photos: ['/assets/wall_plumb_check.png'],
    measuredValue: 2,
    remarks: 'All main load-bearing walls checked. Plumb deviation within 3mm limit.',
  });
  patch(1, '2A', 6, {
    status: STATUS.PASS,
    timestamp: '2026-06-03T09:30:00Z',
    photos: ['/assets/wall_plumb_check.png'],
    measuredValue: 10,
    remarks: 'Mortar joint thickness maintained consistently between 8mm and 12mm.',
  });
  patch(1, '2A', 7, {
    status: STATUS.PASS,
    timestamp: '2026-06-04T15:00:00Z',
    photos: ['/assets/wall_plumb_check.png'],
    remarks: 'English bond pattern consistently executed at all junctions and corners.',
  });

  stages[1].progress = 100;
  stages[1].status = 'Complete';

  patch(2, '3A', 8, {
    status: STATUS.PASS,
    timestamp: '2026-06-15T08:00:00Z',
    photos: ['/assets/concrete_pouring.png'],
    remarks: 'Slab shuttering level verified using auto-level. All panels aligned.',
  });
  patch(2, '3A', 9, {
    status: STATUS.PASS,
    timestamp: '2026-06-15T09:00:00Z',
    photos: ['/assets/concrete_pouring.png'],
    remarks: 'Gaps sealed with foam tape. No visible leakage points.',
  });
  patch(2, '3B', 10, {
    status: STATUS.PASS,
    timestamp: '2026-06-18T16:20:00Z',
    photos: ['/assets/concrete_pouring.png'],
    remarks: 'Bar sizes and spacing checked against drawing. Grid layout confirmed.',
  });
  patch(2, '3B', 11, {
    status: STATUS.PASS,
    timestamp: '2026-06-18T17:00:00Z',
    photos: ['/assets/concrete_pouring.png'],
    remarks: 'Cover blocks placed uniformly at 20mm spacing across slab.',
  });
  patch(2, '3C', 12, {
    status: STATUS.PASS,
    timestamp: '2026-06-20T10:00:00Z',
    photos: ['/assets/concrete_pouring.png'],
    remarks: 'M25 ready-mix verified. Needle vibrator used at all pour points.',
  });
  patch(2, '3C', 13, {
    status: STATUS.PASS,
    timestamp: '2026-06-20T10:30:00Z',
    photos: ['/assets/concrete_pouring.png'],
    remarks: 'Concrete consistency looked normal. No water added on site.',
  });
  patch(2, '3D', 14, {
    status: STATUS.ATTENTION,
    timestamp: '2026-06-24T10:00:00Z',
    photos: ['/assets/concrete_pouring.png'],
    remarks: 'Curing ponds set up on slab, but two areas were dry under midday sun. Re-filling required.',
  });

  stages[2].progress = 60;
  stages[2].status = 'In Progress';

  stages[3].progress = 0;
  stages[3].status = 'Pending';

  return stages;
}

export function buildDemoStagesKochi() {
  let stages = buildBlankStages();

  const patch = (stageIdx, subCode, testNum, data) => {
    const sub = stages[stageIdx].subStages.find((s) => s.code === subCode);
    const test = sub.tests.find((t) => t.testNumber === testNum);
    Object.assign(test, data);
  };

  patch(0, '1A', 1, {
    status: STATUS.PASS,
    timestamp: '2026-05-08T10:00:00Z',
    photos: ['/assets/foundation_inspection.png'],
    measuredValue: 1.8,
    remarks: 'Pit depth 1.8m confirmed with plumb bob. Matches drawing spec.',
  });
  patch(0, '1A', 2, {
    status: STATUS.PASS,
    timestamp: '2026-05-10T11:00:00Z',
    photos: ['/assets/foundation_inspection.png'],
    remarks: 'Footing mesh and cover blocks verified. 50mm cover on all sides.',
  });
  patch(0, '1B', 3, {
    status: STATUS.PASS,
    timestamp: '2026-05-18T11:00:00Z',
    photos: ['/assets/foundation_inspection.png'],
    remarks: 'Lapping length verified at 50D. Column starter rods vertical and centered.',
  });
  patch(0, '1B', 4, {
    status: STATUS.PASS,
    timestamp: '2026-05-18T14:30:00Z',
    photos: ['/assets/foundation_inspection.png'],
    remarks: 'Formwork leak-proof with PVC sleeves in place.',
  });

  stages[0].progress = 100;
  stages[0].status = 'Complete';

  patch(1, '2A', 5, {
    status: STATUS.PASS,
    timestamp: '2026-06-02T11:45:00Z',
    photos: ['/assets/wall_plumb_check.png'],
    measuredValue: 1.5,
    remarks: 'Wall plumb deviations verified, maximum offset is 1.5mm.',
  });
  patch(1, '2A', 6, {
    status: STATUS.PASS,
    timestamp: '2026-06-03T09:30:00Z',
    photos: ['/assets/wall_plumb_check.png'],
    measuredValue: 9,
    remarks: 'Mortar bed thickness consistently 9mm across courses.',
  });
  patch(1, '2A', 7, {
    status: STATUS.PASS,
    timestamp: '2026-06-04T15:00:00Z',
    photos: ['/assets/wall_plumb_check.png'],
    remarks: 'English bond masonry verified at all junctions.',
  });

  stages[1].progress = 100;
  stages[1].status = 'Complete';

  patch(2, '3A', 9, {
    status: STATUS.ATTENTION,
    timestamp: '2026-06-24T10:00:00Z',
    photos: ['/assets/concrete_pouring.png'],
    remarks: 'Two formwork panels have gaps not sealed — risk of honeycomb void.',
  });

  stages[2].progress = 0;
  stages[2].status = 'Pending';
  stages[3].progress = 0;
  stages[3].status = 'Pending';

  return stages;
}

export function getSubStagesForStage(stage) {
  if (!stage) return [];
  return stage.subStages || stage.subStagesRR || stage.subStagesCF || [];
}

export function getStageIndex(stageId) {
  const match = stageId?.match(/stage_(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export function getHomeownerTestStatus(status) {
  if (status === STATUS.PASS) {
    return { label: 'Pass', className: 'bg-[#1D9E75]/10 text-[#1D9E75] border-[#1D9E75]/30' };
  }
  if (status === STATUS.ATTENTION || status === STATUS.CRITICAL) {
    return { label: 'Needs Rework', className: 'bg-rose-50 text-rose-600 border-rose-200' };
  }
  return { label: 'Pending', className: 'bg-slate-100 text-slate-500 border-slate-200' };
}
