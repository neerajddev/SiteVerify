import React, { useState, useMemo } from 'react';
import { getSubStagesForStage } from '../data/stageStructure';
import { DEFAULT_PREP_CHECKLIST } from '../data/projectAnalytics';
import { KERALA_CONSTRUCTION_TYPES } from '../data/keralaConstructionTypes';
import {
  VISIT_MAP,
  VISIT_TYPE_LABELS,
  getVisitByCode,
  getRrNaTestNumbers,
  isRrFoundationProject,
} from '../data/visitStructure';
import {
  getNextEligibleVisitCode,
  isVisitAssignable,
  constructionTypeLocked,
  parseDistrict,
} from '../data/adminVisits';

/** Flat list of the 17 finalized SiteVerify tests from project stages */
function getCanonicalTests(project) {
  const list = [];
  (project.stages || []).forEach((stage) => {
    getSubStagesForStage(stage).forEach((sub) => {
      (sub.tests || []).forEach((test) => {
        if (test.testNumber >= 1 && test.testNumber <= 17) {
          list.push({ stage, subStage: sub, test });
        }
      });
    });
  });
  return list.sort((a, b) => a.test.testNumber - b.test.testNumber);
}

function inspectorDistricts(inspector, allProjects = []) {
  if (inspector.district) return [inspector.district];
  const set = new Set();
  allProjects.forEach((p) => {
    if (p.inspectorId === inspector.id || p.assignedInspector === inspector.full_name) {
      const d = parseDistrict(p);
      if (d) set.add(d);
    }
  });
  return [...set];
}

export default function AdminAssignTaskModal({
  project,
  inspectors,
  projects = [],
  onClose,
  onAssign,
}) {
  const current = project.assignment || {};
  const canonicalTests = getCanonicalTests(project);
  const typeLocked = constructionTypeLocked(project);
  const nextEligible = getNextEligibleVisitCode(project);
  const projectDistrict = parseDistrict(project);

  const [inspectorId, setInspectorId] = useState(
    project.inspectorId || current.inspectorId || ''
  );
  const [districtFilter, setDistrictFilter] = useState(projectDistrict || 'all');
  const defaultVisit = current.visitCodes?.[0] || nextEligible || '1A';
  const [scope, setScope] = useState('visit');
  const [visitCodes, setVisitCodes] = useState(
    current.visitCodes?.length ? current.visitCodes : defaultVisit ? [defaultVisit] : ['1A']
  );
  const [testIds, setTestIds] = useState(current.testIds || []);
  const [visitDate, setVisitDate] = useState(
    current.scheduledVisitAt
      ? new Date(current.scheduledVisitAt).toISOString().slice(0, 16)
      : ''
  );
  const [preparationNotes, setPreparationNotes] = useState(
    current.preparationNotes || ''
  );
  const [constructionType, setConstructionType] = useState(
    project.constructionType || current.constructionType || ''
  );
  const [plinthBeamType, setPlinthBeamType] = useState(
    project.plinthBeamType || 'rr'
  );
  const [pourDateConfirmed, setPourDateConfirmed] = useState(
    Boolean(current.pourDateConfirmedAt || current.scheduledVisitAt)
  );
  const [saving, setSaving] = useState(false);

  const filteredInspectors = useMemo(() => {
    if (districtFilter === 'all') return inspectors;
    const match = [];
    const other = [];
    inspectors.forEach((ins) => {
      const districts = inspectorDistricts(ins, projects);
      if (
        districts.length === 0 ||
        districts.some((d) => d.toLowerCase() === districtFilter.toLowerCase())
      ) {
        match.push(ins);
      } else {
        other.push(ins);
      }
    });
    // Always keep others available — district is a preference, not a hard lock
    return [...match, ...other];
  }, [inspectors, projects, districtFilter]);

  const inspectorsInDistrict = useMemo(() => {
    if (districtFilter === 'all') return inspectors;
    return inspectors.filter((ins) => {
      const districts = inspectorDistricts(ins, projects);
      return (
        districts.length === 0 ||
        districts.some((d) => d.toLowerCase() === districtFilter.toLowerCase())
      );
    });
  }, [inspectors, projects, districtFilter]);

  const districtOptions = useMemo(() => {
    const set = new Set();
    if (projectDistrict) set.add(projectDistrict);
    inspectors.forEach((ins) => {
      inspectorDistricts(ins, projects).forEach((d) => set.add(d));
    });
    projects.forEach((p) => {
      const d = parseDistrict(p);
      if (d) set.add(d);
    });
    return [...set].sort();
  }, [inspectors, projects, projectDistrict]);

  const selectVisit = (code) => {
    if (!isVisitAssignable(project, code) && !visitCodes.includes(code)) return;
    setVisitCodes((prev) => (prev.includes(code) ? [] : [code]));
  };

  const toggleTest = (id) => {
    setTestIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const selectedVisit = visitCodes.length === 1 ? getVisitByCode(visitCodes[0]) : null;
  const needsPourDate = selectedVisit?.requiresPourDate === true;
  const previewProject = {
    ...project,
    constructionType: constructionType || project.constructionType,
    foundationType:
      constructionType === 'rr_load_bearing' || constructionType === 'laterite'
        ? 'rr'
        : constructionType
          ? 'cf'
          : project.foundationType,
    plinthBeamType,
  };
  const rrNaTests = getRrNaTestNumbers(previewProject);

  const visitOk =
    scope !== 'visit' ||
    (visitCodes.length === 1 && isVisitAssignable(project, visitCodes[0]));

  const typeRequired = !typeLocked;
  const canSubmit =
    inspectorId &&
    (!typeRequired || Boolean(constructionType)) &&
    visitOk &&
    ((scope === 'visit' && visitCodes.length > 0) || (scope === 'tests' && testIds.length > 0)) &&
    (!needsPourDate || (visitDate && pourDateConfirmed));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    const inspector = inspectors.find((i) => i.id === inspectorId);
    const isRr =
      constructionType === 'rr_load_bearing' ||
      constructionType === 'laterite' ||
      project.foundationType === 'rr';
    setSaving(true);
    await onAssign({
      inspectorId,
      inspectorName: inspector?.full_name || 'Inspector',
      scope,
      visitCodes: scope === 'visit' ? visitCodes : [],
      stageIds: [],
      testIds: scope === 'tests' ? testIds : [],
      scheduledVisitAt: visitDate ? new Date(visitDate).toISOString() : null,
      pourDateConfirmedAt: needsPourDate ? new Date().toISOString() : null,
      preparationNotes: preparationNotes.trim(),
      constructionType: constructionType || null,
      foundationType: isRr ? 'rr' : project.foundationType || 'cf',
      plinthBeamType: isRr ? plinthBeamType : null,
      applyRrNa: isRr,
    });
    setSaving(false);
    onClose();
  };

  const siteLabel = project.projectName || project.homeownerName || project.homeowner;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-5 rounded-t-3xl z-10">
          <p className="text-[12px] font-medium text-[#1D9E75] uppercase tracking-wider">Assign visit</p>
          <h2 className="text-[18px] font-medium text-[#085041] mt-1">{siteLabel}</h2>
          <p className="text-[14px] text-slate-500 mt-0.5">{project.location}</p>
          <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-[13px] text-amber-900 leading-[1.6]">
            <strong>Sequence lock:</strong> only the next open visit can be assigned
            {nextEligible ? ` (next: Visit ${nextEligible})` : ' — all visits approved'}.
            One visit per site day.
          </div>
          {selectedVisit && scope === 'visit' && (
            <div className="mt-2 bg-[#E1F5EE] border border-[#1D9E75]/30 rounded-lg px-3 py-2 text-[13px] text-[#085041] leading-[1.6]">
              <strong>{selectedVisit.visitLabel}</strong> · {selectedVisit.name} · Stage:{' '}
              {selectedVisit.stageName} · Tests T{selectedVisit.testNumbers.join(', T')}
              <span className="block text-[12px] mt-1 text-[#085041]/80">{selectedVisit.timing}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                District filter
              </label>
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
              >
                <option value="all">All districts</option>
                {districtOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                Inspector *
              </label>
              <select
                value={inspectorId}
                onChange={(e) => setInspectorId(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
              >
                <option value="">Select inspector</option>
                {filteredInspectors.map((ins) => {
                  const districts = inspectorDistricts(ins, projects);
                  const inDistrict =
                    districtFilter === 'all' ||
                    districts.length === 0 ||
                    districts.some((d) => d.toLowerCase() === districtFilter.toLowerCase());
                  return (
                    <option key={ins.id} value={ins.id}>
                      {ins.full_name}
                      {districts.length ? ` · ${districts.join('/')}` : ''}
                      {!inDistrict && districtFilter !== 'all' ? ' (other district)' : ''}
                    </option>
                  );
                })}
              </select>
              {districtFilter !== 'all' && inspectorsInDistrict.length === 0 && (
                <p className="text-[12px] text-amber-800 mt-1.5">
                  No inspector tagged for {districtFilter} yet — other inspectors are still listed. Assign whoever can travel, or set district to All.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Kerala construction type {typeRequired ? '*' : '(locked)'}
            </label>
            <select
              value={constructionType}
              onChange={(e) => setConstructionType(e.target.value)}
              disabled={typeLocked}
              required={typeRequired}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="">Select build type…</option>
              {KERALA_CONSTRUCTION_TYPES.map((t, i) => (
                <option key={t.id} value={t.id}>Type {i + 1}: {t.shortName}</option>
              ))}
            </select>
            {!typeLocked && (
              <p className="text-[12px] text-slate-500 mt-1 leading-[1.5]">
                Set once at first visit. RR / Laterite auto-marks steel tests N/A. RCC / modern square keeps all tests.
              </p>
            )}
            {typeLocked && (
              <p className="text-[12px] text-slate-400 mt-1">Cannot change after first visit assignment.</p>
            )}
          </div>

          {isRrFoundationProject(previewProject) && !typeLocked && (
            <div className="space-y-2">
              <label className="block text-[12px] font-medium text-slate-400 uppercase tracking-wider">
                Plinth on RR base
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'rr', label: 'Pure Rubble Masonry (RR) plinth', hint: 'T2, T3, T4 → not applicable' },
                  { value: 'rcc', label: 'RR + RCC plinth beam (hybrid)', hint: 'Only T2 → not applicable' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPlinthBeamType(opt.value)}
                    className={`text-left px-3 py-2.5 rounded-xl border text-xs cursor-pointer ${
                      plinthBeamType === opt.value
                        ? 'border-[#1D9E75] bg-[#E1F5EE]'
                        : 'border-slate-200'
                    }`}
                  >
                    <span className="font-medium text-slate-800 block">{opt.label}</span>
                    <span className="text-[11px] text-slate-500">{opt.hint}</span>
                  </button>
                ))}
              </div>
              {rrNaTests.length > 0 && (
                <p className="text-[13px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-[1.6]">
                  Will mark Test{rrNaTests.length > 1 ? 's' : ''} {rrNaTests.join(', ')} as{' '}
                  <strong>not applicable for this build type</strong> before the inspector opens the visit.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              {needsPourDate ? 'Confirmed pour date & time *' : 'Site visit date & time'}
            </label>
            <input
              type="datetime-local"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              required={needsPourDate}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
            />
            {needsPourDate && (
              <div className="mt-2 space-y-2">
                <p className="text-[12px] text-rose-700 leading-[1.6]">
                  {selectedVisit.schedulingRule}
                </p>
                <label className="flex items-start gap-2 text-[13px] text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pourDateConfirmed}
                    onChange={(e) => setPourDateConfirmed(e.target.checked)}
                    className="accent-[#1D9E75] mt-0.5"
                  />
                  <span>
                    I confirmed this pour date with the contractor at least 24 hours ahead (WhatsApp or phone).
                  </span>
                </label>
              </div>
            )}
            {selectedVisit?.unannounced && (
              <p className="text-[12px] text-rose-700 font-medium mt-2 leading-[1.6]">
                {selectedVisit.schedulingRule}
              </p>
            )}
            {selectedVisit?.alertNote && (
              <p className="text-[12px] text-rose-700 font-medium mt-2 leading-[1.6]">
                {selectedVisit.alertNote}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-400 uppercase tracking-wider mb-2">
              What to assign *
            </label>
            <div className="space-y-2">
              {[
                { value: 'visit', label: 'One visit (required)', hint: '1A–4B — sequence locked · one visit per day' },
                { value: 'tests', label: 'Specific tests only', hint: 'Exception: send-back re-check only' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-start gap-3 px-4 py-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="scope"
                    value={opt.value}
                    checked={scope === opt.value}
                    onChange={() => setScope(opt.value)}
                    className="accent-[#1D9E75] mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-700">{opt.label}</span>
                    <span className="block text-[12px] text-slate-400 mt-0.5">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {scope === 'visit' && (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wider">Select visit for this day</p>
              {VISIT_MAP.map((v) => {
                const selected = visitCodes.includes(v.code);
                const assignable = isVisitAssignable(project, v.code);
                const isNext = v.code === nextEligible;
                return (
                  <label
                    key={v.code}
                    className={`flex items-start gap-3 p-3 rounded-xl border ${
                      !assignable
                        ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                        : selected
                          ? v.adminPriority === 'critical'
                            ? 'border-rose-400 bg-rose-50 cursor-pointer'
                            : 'border-[#1D9E75] bg-[#E1F5EE] cursor-pointer'
                          : 'border-slate-200 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={!assignable}
                      onChange={() => selectVisit(v.code)}
                      className="accent-[#1D9E75] rounded mt-1"
                    />
                    <span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium text-slate-800">{v.visitLabel}</span>
                        <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {VISIT_TYPE_LABELS[v.type]}
                        </span>
                        {isNext && (
                          <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            Next eligible
                          </span>
                        )}
                        {!assignable && (
                          <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">
                            Locked
                          </span>
                        )}
                        {v.adminPriority === 'critical' && (
                          <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                            Critical window
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-slate-700 mt-0.5">{v.name} · {v.stageName}</span>
                      <span className="block text-[12px] text-slate-500 mt-0.5">
                        Tests {v.testNumbers.join(', ')} · {v.timing}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {scope === 'tests' && (
            <div className="space-y-2 max-h-52 overflow-y-auto border border-slate-100 rounded-xl p-3">
              <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                Select tests ({testIds.length}/17)
              </p>
              {canonicalTests.map(({ stage, test }) => (
                <label key={test.id} className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={testIds.includes(test.id)}
                    onChange={() => toggleTest(test.id)}
                    className="accent-[#1D9E75] rounded mt-0.5"
                  />
                  <span>
                    <span className="font-medium text-amber-800">T{test.testNumber}</span> {test.name}
                    <span className="text-slate-400"> · {stage.name}</span>
                  </span>
                </label>
              ))}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Prep notes for inspector
            </label>
            <textarea
              rows={3}
              value={preparationNotes}
              onChange={(e) => setPreparationNotes(e.target.value)}
              placeholder="e.g. Check north column cover blocks carefully — previous pour had issues here."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
            />
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wider mb-2">
              Standard pack list (sent to inspector)
            </p>
            <ul className="space-y-1.5">
              {DEFAULT_PREP_CHECKLIST.map((item) => (
                <li key={item.id} className="text-[13px] text-slate-600 flex gap-2">
                  <span className="text-slate-400">☐</span> {item.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-700 font-medium text-sm rounded-xl cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !canSubmit}
              className="flex-1 py-3 bg-[#1D9E75] hover:bg-[#177e5e] disabled:opacity-50 text-white font-medium text-sm rounded-xl cursor-pointer"
            >
              {saving ? 'Assigning...' : 'Assign visit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
