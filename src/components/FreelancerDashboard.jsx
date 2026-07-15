import React, { useState, useEffect } from 'react';
import { STATUS_ENUMS } from '../data/mockData';
import { getSubStagesForStage as getStageSubStages, getStageIndex } from '../data/stageStructure';
import { WORKFLOW_STATUS, updateTestInProject, getInspectorStatusChip, OVERALL_RESULT_LABELS } from '../data/testWorkflow';
import InspectorTestFillScreen from './InspectorTestFillScreen';
import InspectorHome from './InspectorHome';
import InspectorVisitBrief from './InspectorVisitBrief';
import InspectorVisitSubmit from './InspectorVisitSubmit';
import InspectorSettings from './InspectorSettings';
import { getVerificationMeta, VERIFICATION_STATUS } from '../data/inspectorProfile';
import { loadInspectorProfile, saveInspectorProfile } from '../services/inspectorProfileService';
import {
  formatVisitDate,
  getAssignmentScopeLabel,
  filterStagesByAssignment,
  getAssignedTests,
  recalcProjectProgress,
  splitInspectorProjects,
  getDutyProgressLabel,
  groupAssignedTests,
  isInspectorDutyPast,
  isTestNotApplicable,
} from '../data/projectAnalytics';
import { getVisitCardMeta } from '../data/inspectorVisits';

function getSubStageKey(stage) {
  if (stage?.subStages) return 'subStages';
  if (stage?.id === 'stage_1') return 'subStages';
  return 'subStages';
}
import FileDropZone from './FileDropZone';
import { captureGeoMetadata } from '../services/fileUploadService';

// ── STATUS PICKER COMPONENT ───────────────────────────────────────────────────
function StatusPicker({ currentStatus, onSelectStatus, isReadOnly }) {
  const options = [
    { value: STATUS_ENUMS.PASS, label: 'Pass', color: 'bg-emerald-500 text-white' },
    { value: STATUS_ENUMS.IGNORED, label: 'Ignore', color: 'bg-slate-400 text-white' },
    { value: STATUS_ENUMS.ATTENTION, label: 'Attention', color: 'bg-amber-500 text-slate-900' },
    { value: STATUS_ENUMS.CRITICAL, label: 'Critical', color: 'bg-rose-500 text-white' }
  ];

  return (
    <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl">
      {options.map(opt => {
        const isSelected = currentStatus === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={isReadOnly}
            onClick={() => onSelectStatus(opt.value)}
            className={`text-[10px] font-black py-1.5 rounded-lg transition-all ${
              isReadOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
            } ${
              isSelected 
                ? `${opt.color} shadow-sm scale-105` 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── FREELANCER TEST CARD (EDITABLE) ────────────────────────────────────────────
function FreelancerTestCard({ test, onUpdateTest, aiSpecs, projectCoords, projectId, isReadOnly }) {
  const [remarks, setRemarks]           = useState(test.remarks || '');
  const [measuredValue, setMeasuredValue] = useState(test.measuredValue !== undefined ? test.measuredValue : '');
  const [isCapturingGeo, setIsCapturingGeo] = useState(false);
  const [geoMsg, setGeoMsg]             = useState('');

  // — Status gate helpers —
  const wasFlaggedAtSave  = test.flaggedAtSave === true;
  const needsRectPhoto    = wasFlaggedAtSave && !test.rectificationFiled;
  const isCurrentlyFlagged = test.status === STATUS_ENUMS.ATTENTION || test.status === STATUS_ENUMS.CRITICAL;
  const photosExist        = (test.photos || []).length > 0;
  // LOCK: if currently flagged and no photos — cannot save
  const photoLockActive    = isCurrentlyFlagged && !photosExist && !isReadOnly;

  const handleStatusChange = (newStatus) => {
    onUpdateTest({ ...test, status: newStatus });
  };

  const handleRemarksBlur = () => {
    onUpdateTest({ ...test, remarks });
  };

  // Live math against aiCalibratedSpecs (drawn from the project's approved drawing)
  const handleValueChange = (e) => {
    const rawVal = e.target.value;
    setMeasuredValue(rawVal);
    const numVal = parseFloat(rawVal);
    if (isNaN(numVal)) {
      onUpdateTest({ ...test, measuredValue: undefined });
      return;
    }
    let isConformant   = true;
    let suggestedStatus = test.status;
    if (test.id.includes('t1') || test.id.includes('cf_1_1')) {
      const target = aiSpecs?.trenchDepthSpec || aiSpecs?.minTrenchDepthMeters;
      if (target) { isConformant = numVal >= target; suggestedStatus = isConformant ? STATUS_ENUMS.PASS : STATUS_ENUMS.CRITICAL; }
    } else if (test.id.includes('t2') || test.id.includes('2_1_2')) {
      const range = aiSpecs?.mortarThicknessSpec || { min: aiSpecs?.mortarThicknessMMMin, max: aiSpecs?.mortarThicknessMMMax };
      if (range?.min !== undefined) { isConformant = numVal >= range.min && numVal <= range.max; suggestedStatus = isConformant ? STATUS_ENUMS.PASS : STATUS_ENUMS.ATTENTION; }
    } else if (test.id.includes('2_1_1')) {
      const limit = aiSpecs?.plumbSpec || aiSpecs?.maxPlumbDeviationMM;
      if (limit) { isConformant = numVal <= limit; suggestedStatus = isConformant ? STATUS_ENUMS.PASS : STATUS_ENUMS.ATTENTION; }
    }
    onUpdateTest({ ...test, measuredValue: numVal, status: suggestedStatus });
  };

  // Upload photo/file evidence with optional GPS tagging
  const handleUploadEvidence = async (uploadedFiles, { isRectification = false } = {}) => {
    if (!uploadedFiles?.length || isReadOnly) return;
    setIsCapturingGeo(true);
    setGeoMsg('Saving files and checking GPS...');
    const geo = await captureGeoMetadata(projectCoords);
    setIsCapturingGeo(false);

    if (geo.outsideBoundary) {
      setGeoMsg('⚠️ GPS: Outside 50m site boundary. Files saved with flag.');
    } else if (geo.gpsLat) {
      setGeoMsg(`✅ GPS: ${geo.gpsLat.toFixed(4)}, ${geo.gpsLng.toFixed(4)}`);
    } else {
      setGeoMsg('Files saved. GPS unavailable — timestamp recorded.');
    }

    const newPhotos = uploadedFiles.map((f) => f.url);
    const newMetadata = uploadedFiles.map((f) => ({
      gpsLat: geo.gpsLat,
      gpsLng: geo.gpsLng,
      timestamp: geo.timestamp || f.uploadedAt,
      outsideBoundary: geo.outsideBoundary,
      fileName: f.name,
      isRectificationPhoto: isRectification,
    }));

    const updatedPhotos = [...(test.photos || []), ...newPhotos];
    const updatedMetadata = [...(test.photoMetadata || []), ...newMetadata];
  const patch = {
      ...test,
      photos: updatedPhotos,
      photoMetadata: updatedMetadata,
      timestamp: geo.timestamp || new Date().toISOString(),
    };
    if (isRectification) patch.rectificationFiled = true;
    onUpdateTest(patch);
  };

  const handleRemovePhoto = (photoIdx) => {
    const updatedPhotos   = (test.photos   || []).filter((_, i) => i !== photoIdx);
    const updatedMetadata = (test.photoMetadata || []).filter((_, i) => i !== photoIdx);
    onUpdateTest({ ...test, photos: updatedPhotos, photoMetadata: updatedMetadata });
  };

  // Cross-verification live display using aiCalibratedSpecs-aware field mapping
  const getVerificationStatusLabel = () => {
    const val = parseFloat(measuredValue);
    if (isNaN(val)) return null;
    let targetSpecText = '';
    let isConformant = true;
    if (test.id.includes('t1') || test.id.includes('cf_1_1')) {
      const target = aiSpecs?.trenchDepthSpec || aiSpecs?.minTrenchDepthMeters;
      if (!target) return null;
      targetSpecText = `>= ${target}m`; isConformant = val >= target;
    } else if (test.id.includes('t2') || test.id.includes('2_1_2')) {
      const range = aiSpecs?.mortarThicknessSpec || { min: aiSpecs?.mortarThicknessMMMin, max: aiSpecs?.mortarThicknessMMMax };
      if (range?.min === undefined) return null;
      targetSpecText = `${range.min}-${range.max}mm`; isConformant = val >= range.min && val <= range.max;
    } else if (test.id.includes('2_1_1')) {
      const limit = aiSpecs?.plumbSpec || aiSpecs?.maxPlumbDeviationMM;
      if (!limit) return null;
      targetSpecText = `<= ${limit}mm`; isConformant = val <= limit;
    } else {
      return null;
    }
    return (
      <div className={`p-2.5 rounded-xl border text-[11px] font-bold flex items-center justify-between gap-2 ${
        isConformant ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
      }`}>
        <span>{isConformant ? '✓ Conforms to Drawing Spec' : '⚠️ Deviates from Drawing Spec'} (Target: {targetSpecText})</span>
        <span className="text-[9px] uppercase font-black">{isConformant ? 'Pass' : 'Failed'}</span>
      </div>
    );
  };

  const hasSpecs = test.id.includes('t1') || test.id.includes('cf_1_1') || 
                   test.id.includes('t2') || test.id.includes('2_1_2') || 
                   test.id.includes('2_1_1');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm mb-4 space-y-3.5">
      <div>
        <h4 className="font-extrabold text-slate-800 text-xs md:text-sm">{test.name}</h4>
      </div>

      {/* RECTIFICATION LOCK BANNER — shown when test was previously flagged & saved */}
      {needsRectPhoto && !isReadOnly && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-2">
          <p className="text-[11px] font-black text-rose-700">🔒 Rectification required — upload proof of the fix.</p>
          <p className="text-[10px] text-rose-500 font-medium">Add a photo or file showing the corrected work before you can edit this check again.</p>
          <FileDropZone
            accept="image/*,.pdf,.jpg,.jpeg,.png,.webp"
            uploadFolder="inspection-evidence"
            projectId={projectId}
            files={[]}
            onChange={(files) => handleUploadEvidence(files, { isRectification: true })}
            disabled={isCapturingGeo}
            variant="compact"
            emptyText="Drop rectification proof here"
            browseText="or tap to upload"
          />
        </div>
      )}

      {/* Dynamic measurement input — locked if rectification is unfiled */}
      {hasSpecs && (
        <div className="space-y-2">
          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
            Live Site Measurement ({test.id.includes('t1') || test.id.includes('cf_1_1') ? 'meters' : 'mm'})
          </label>
          <input
            type="number" step="0.1"
            disabled={isReadOnly || needsRectPhoto}
            value={measuredValue}
            onChange={handleValueChange}
            placeholder={test.id.includes('t1') || test.id.includes('cf_1_1') ? 'e.g., 1.5' : 'e.g., 10'}
            className={`w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all font-bold ${
              (isReadOnly || needsRectPhoto) ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-150 font-medium' : ''
            }`}
          />
          {getVerificationStatusLabel()}
        </div>
      )}

      {/* Status Picker — locked when rectification photo not yet filed */}
      <div>
        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Inspection Verification Status</label>
        <StatusPicker currentStatus={test.status} onSelectStatus={handleStatusChange} isReadOnly={isReadOnly || needsRectPhoto} />
      </div>

      {/* PHOTO LOCK warning */}
      {photoLockActive && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
          <span className="text-amber-500 text-sm leading-none mt-0.5">⚠️</span>
          <p className="text-[11px] font-bold text-amber-700">Photo evidence is required before saving a flagged check. Capture a geo-tagged photo below.</p>
        </div>
      )}

      {/* GPS feedback message */}
      {geoMsg && (
        <p className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">{geoMsg}</p>
      )}

      {/* Photo / file evidence */}
      <div>
        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
          Evidence files ({(test.photos || []).length}) {isCapturingGeo && <span className="text-amber-400 animate-pulse">⏳ Saving...</span>}
        </label>
        <div className="flex flex-wrap gap-2 items-center mb-2">
          {(test.photos || []).map((photo, pIdx) => {
            const meta = (test.photoMetadata || [])[pIdx];
            const isOutside = meta?.outsideBoundary;
            const showImage =
              photo?.startsWith('data:image') ||
              photo?.startsWith('/assets/') ||
              /\.(png|jpe?g|webp|gif)(\?|$)/i.test(photo || '');
            return (
              <div key={pIdx} className={`relative w-16 h-12 rounded-lg overflow-hidden border bg-slate-100 flex-shrink-0 ${
                isOutside ? 'border-amber-400 ring-1 ring-amber-300' : 'border-slate-200'
              }`}>
                {showImage ? (
                  <img src={photo} alt="evidence" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-lg bg-slate-100">📄</div>
                )}
                {isOutside && (
                  <div className="absolute top-0 left-0 bg-amber-500/80 text-white text-[7px] font-black px-1 leading-tight">📍 OOB</div>
                )}
                {!isReadOnly && (
                  <button type="button" onClick={() => handleRemovePhoto(pIdx)}
                    className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center text-[9px] font-bold cursor-pointer">
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {!isReadOnly && !needsRectPhoto && (
          <FileDropZone
            accept="image/*,.pdf,.jpg,.jpeg,.png,.webp"
            uploadFolder="inspection-evidence"
            projectId={projectId}
            multiple
            maxFiles={8}
            files={[]}
            onChange={(files) => handleUploadEvidence(files)}
            disabled={isCapturingGeo}
            variant="compact"
            emptyText="Drop photos or files here"
            browseText="Saved to Supabase when signed in"
          />
        )}
      </div>

      {/* Remarks editor — locked if rectification not yet filed */}
      <div>
        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Inspector Notes & Remarks</label>
        <textarea rows="2" disabled={isReadOnly || needsRectPhoto}
          value={remarks} onChange={e => setRemarks(e.target.value)} onBlur={handleRemarksBlur}
          placeholder={isReadOnly ? 'No notes recorded.' : 'Specify measurements, observations...'}
          className={`w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all resize-none ${
            (isReadOnly || needsRectPhoto) ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-150' : ''
          }`}
        />
      </div>
    </div>
  );
}

// ── FREELANCER INSPECTION CHECKLIST ───────────────────────────────────────────
function FreelancerSubStage({ subStage, onUpdateSubStage, aiSpecs, location, projectCoords, projectId, isReadOnly }) {
  const handleTestUpdate = (updatedTest) => {
    const updatedTests = subStage.tests.map(t => t.id === updatedTest.id ? updatedTest : t);
    onUpdateSubStage({ ...subStage, tests: updatedTests });
  };

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 mb-4">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
          🛠️ {subStage.name}
        </span>
        <span className="text-[10px] text-slate-400 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
          {subStage.tests.length} Checks
        </span>
      </div>
      <div>
        {subStage.tests.map(test => (
          <FreelancerTestCard 
            key={test.id} 
            test={test} 
            onUpdateTest={handleTestUpdate}
            aiSpecs={aiSpecs}
            location={location}
            projectCoords={projectCoords}
            projectId={projectId}
            isReadOnly={isReadOnly}
          />
        ))}
      </div>
    </div>
  );
}

// ── FREELANCER DASHBOARD VIEW ─────────────────────────────────────────────────
export default function FreelancerDashboard({ 
  projects,
  activeProjectId,
  onSelectActiveProject,
  onUpdateProjects,
  inspectorProfile,
  inspectorExtendedProfile,
  onSaveInspectorProfile,
  onSignOut,
}) {
  const inspectorName = inspectorProfile?.full_name || 'Inspector';
  const inspectorId = inspectorProfile?.id;
  const [view, setView] = useState('inspector_home');
  const [activeStageId, setActiveStageId] = useState('stage_1');
  const [activeSubStageId, setActiveSubStageId] = useState(null);
  const [activeTestId, setActiveTestId] = useState(null);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [submittedToast, setSubmittedToast] = useState(false);
  const [extendedProfile, setExtendedProfile] = useState(inspectorExtendedProfile);

  useEffect(() => {
    if (inspectorExtendedProfile) {
      setExtendedProfile(inspectorExtendedProfile);
    } else if (inspectorId) {
      setExtendedProfile(loadInspectorProfile(inspectorId, inspectorName));
    }
  }, [inspectorExtendedProfile, inspectorId, inspectorName]);

  const handleSaveProfile = (profile) => {
    const saved = onSaveInspectorProfile
      ? onSaveInspectorProfile(profile)
      : saveInspectorProfile(profile);
    setExtendedProfile(saved);
    return saved;
  };

  const projectReport  = projects.find(p => p.id === activeProjectId) || projects[0];
  const location       = projectReport?.location || 'Thrissur, Kerala';
  const projectCoords  = projectReport?.coordinates || null;

  // Use per-project aiCalibratedSpecs (from drawing) for all spec cross-checks
  const aiSpecs = projectReport?.aiCalibratedSpecs || null;

  // Project is read-only when it's submitted for QA or already certified
  const projectStatus = projectReport?.projectStatus || projectReport?.status || 'Inspecting';
  const isPastDuty = projectReport ? isInspectorDutyPast(projectReport) : false;
  const isReadOnly = isPastDuty || projectStatus === 'Pending QA Review' || projectStatus === 'Pending Approval' ||
                     projectStatus === 'QA Certified'       || projectStatus === 'QA Approved';
  const isRectification = !isPastDuty && projectStatus === 'Rectification Required';

  const { active: activeDuties, past: pastDuties } = splitInspectorProjects(projects, inspectorId, inspectorName);

  const assignedTestsForProject = projectReport ? getAssignedTests(projectReport) : [];
  const groupedTests = projectReport ? groupAssignedTests(projectReport) : [];
  const activeTestContext = assignedTestsForProject.find(({ test }) => test.id === activeTestId) || null;
  const activeTest = activeTestContext?.test || null;
  const activeSubStage = activeTestContext?.subStage || null;
  const activeStage = activeTestContext?.stage || (projectReport
    ? projectReport.stages.find((s) => s.id === activeStageId) || filterStagesByAssignment(projectReport)[0]
    : null);
  const activeStageNum = getStageIndex(activeStage?.id);

  // Dynamic stages helper (legacy checklist components)
  const getSubStagesForStage = (stage) => getStageSubStages(stage);

  const navigateToTestFill = (testId, stageId, subStageId) => {
    setActiveStageId(stageId);
    setActiveSubStageId(subStageId);
    setActiveTestId(testId);
    setView('test_fill');
  };

  const openDuty = (proj, mode = 'active') => {
    onSelectActiveProject(proj.id);
    setActiveTestId(null);
    setActiveSubStageId(null);
    setView(mode === 'past' ? 'duty_detail' : 'project_brief');
  };

  const verificationMeta = extendedProfile
    ? getVerificationMeta(extendedProfile.verificationStatus)
    : null;

  const handleStartInspection = async () => {
    if (!projectReport) return;
    const assignedIds = new Set(
      getAssignedTests(projectReport)
        .filter(({ test }) => !isTestNotApplicable(test))
        .map(({ test }) => test.id)
    );
    const updated = projects.map((p) => {
      if (p.id !== projectReport.id) return p;
      const stages = (p.stages || []).map((stage) => ({
        ...stage,
        subStages: (stage.subStages || []).map((sub) => ({
          ...sub,
          tests: (sub.tests || []).map((test) => {
            if (!assignedIds.has(test.id) || isTestNotApplicable(test)) return test;
            if (
              !test.workflowStatus ||
              test.workflowStatus === WORKFLOW_STATUS.NOT_STARTED
            ) {
              return { ...test, workflowStatus: WORKFLOW_STATUS.IN_PROGRESS };
            }
            return test;
          }),
        })),
      }));
      return {
        ...p,
        status: 'Inspecting',
        projectStatus: 'Inspecting',
        assignment: {
          ...(p.assignment || {}),
          inspectionStartedAt: p.assignment?.inspectionStartedAt || new Date().toISOString(),
        },
        stages,
        historyLogs: [
          ...(p.historyLogs || []),
          { action: 'Inspection started', by: inspectorName, timestamp: new Date().toISOString() },
        ],
      };
    });
    await onUpdateProjects(updated);
    setView('test_list');
  };

  const handleTestSubmit = async (updates) => {
    let updated = updateTestInProject(
      projects,
      projectReport.id,
      activeStageId,
      activeSubStageId,
      activeTestId,
      updates
    );
    updated = updated.map((p) => {
      if (p.id !== projectReport.id) return p;
      const withProgress = { ...p, totalProgress: recalcProjectProgress(p) };
      return {
        ...withProgress,
        historyLogs: [
          ...(withProgress.historyLogs || []),
          {
            action: `Test submitted`,
            by: inspectorName,
            timestamp: new Date().toISOString(),
          },
        ],
      };
    });
    await onUpdateProjects(updated);
    setView('test_list');
  };

  const handleTogglePrepItem = (prepId) => {
    if (!projectReport?.assignment?.preparationChecklist) return;
    const updatedChecklist = projectReport.assignment.preparationChecklist.map((item) =>
      item.id === prepId ? { ...item, checked: !item.checked } : item
    );
    const updatedProjects = projects.map((p) => {
      if (p.id !== projectReport.id) return p;
      return {
        ...p,
        assignment: { ...p.assignment, preparationChecklist: updatedChecklist },
      };
    });
    onUpdateProjects(updatedProjects);
  };

  const handleSubmitProjectForApproval = () => {
    const visitMeta = projectReport ? getVisitCardMeta(projectReport) : null;
    const updatedProjects = projects.map((p) => {
      if (p.id !== projectReport.id) return p;
      return {
        ...p,
        status: 'Pending QA Review',
        projectStatus: 'Pending QA Review',
        assignment: {
          ...(p.assignment || {}),
          completedAt: new Date().toISOString(),
        },
        historyLogs: [
          ...(p.historyLogs || []),
          {
            action: `Visit ${visitMeta?.visitLabel || ''} submitted for QA review`.trim(),
            by: inspectorName,
            timestamp: new Date().toISOString(),
          },
        ],
      };
    });
    onUpdateProjects(updatedProjects);
    setSubmittedToast(true);
    setTimeout(() => {
      setSubmittedToast(false);
      setView('inspector_home');
    }, 1500);
  };

  const canEditActiveTest =
    !isPastDuty &&
    (!isReadOnly ||
      isRectification ||
      activeTest?.workflowStatus === WORKFLOW_STATUS.REVISION_REQUESTED);

  return (
    <div className="min-h-[100dvh] blueprint-grid bg-slate-50 text-slate-800 py-3 px-3 relative">
      <div className="w-full mx-auto pb-10">

        {view === 'settings' && extendedProfile && (
          <InspectorSettings
            authProfile={inspectorProfile}
            inspectorProfile={extendedProfile}
            onSave={handleSaveProfile}
            onBack={() => setView('inspector_home')}
            onSignOut={onSignOut}
            pastDuties={pastDuties}
            onOpenPastDuty={(proj) => openDuty(proj, 'past')}
          />
        )}
        
        {view === 'inspector_home' && (
          <InspectorHome
            activeDuties={activeDuties}
            pastDuties={pastDuties}
            onOpenDuty={openDuty}
            onOpenSettings={() => setView('settings')}
            verificationBanner={
              verificationMeta && extendedProfile?.verificationStatus !== VERIFICATION_STATUS.VERIFIED ? (
                <button
                  type="button"
                  onClick={() => setView('settings')}
                  className={`w-full text-left rounded-2xl border p-4 ${verificationMeta.className} cursor-pointer hover:opacity-95 transition-opacity`}
                >
                  <p className="text-[13px] font-medium">
                    {verificationMeta.icon} {verificationMeta.label}
                  </p>
                  <p className="text-[13px] mt-1 leading-relaxed">{verificationMeta.description}</p>
                  <p className="text-[12px] font-medium mt-2 underline">Open Settings →</p>
                </button>
              ) : null
            }
          />
        )}

        {view === 'project_brief' && projectReport && (
          <InspectorVisitBrief
            project={projectReport}
            onBack={() => setView('inspector_home')}
            onStartInspection={handleStartInspection}
            onTogglePrepItem={handleTogglePrepItem}
            isRectification={isRectification}
          />
        )}

        {view === 'test_list' && projectReport && (
          <InspectorVisitSubmit
            project={projectReport}
            onBack={() => setView('project_brief')}
            onOpenTest={navigateToTestFill}
            onSubmitVisit={handleSubmitProjectForApproval}
          />
        )}

        {view === 'duty_detail' && projectReport && (
          <div className="space-y-5 animate-fadeIn">
            <header className="bg-white rounded-3xl p-5 border border-emerald-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setView('inspector_home')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-[12px] font-medium text-slate-600 border border-slate-200 transition-all cursor-pointer"
                >
                  ← Visits
                </button>
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-medium uppercase tracking-wider rounded-md border border-emerald-200">
                  Past visit
                </span>
              </div>
              <div className="space-y-1">
                <h1 className="text-[18px] font-medium text-[#085041]">
                  {projectReport.projectName || `${projectReport.homeownerName || projectReport.homeowner}'s House`}
                </h1>
                <p className="text-[14px] text-slate-500">📍 {location}</p>
                <p className="text-[13px] text-emerald-700 font-medium">
                  {getAssignmentScopeLabel(projectReport.assignment)}
                  {projectReport.assignment?.completedAt && (
                    <> · Done {formatVisitDate(projectReport.assignment.completedAt)}</>
                  )}
                </p>
              </div>
            </header>

            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className="text-[12px] font-medium text-slate-400 uppercase mb-2">Work you completed</p>
              <p className="text-[14px] text-slate-600">{getDutyProgressLabel(projectReport)}</p>
            </div>

            <div className="space-y-3">
              {groupedTests.map(({ stage, subStage, tests }) => (
                <div key={`${stage.id}-${subStage.id}`} className="space-y-2">
                  <p className="text-[11px] font-medium text-emerald-700 uppercase px-1">
                    {stage.name} › {subStage.name}
                  </p>
                  {tests.map((test) => {
                    const chip = getInspectorStatusChip(test.workflowStatus || WORKFLOW_STATUS.NOT_STARTED);
                    return (
                      <button
                        key={test.id}
                        type="button"
                        onClick={() => navigateToTestFill(test.id, stage.id, subStage.id)}
                        className="w-full flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-4 py-4 text-left hover:border-emerald-300 shadow-sm cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] text-slate-400">Test {test.testNumber}</p>
                          <p className="text-[15px] font-medium text-slate-800 mt-0.5 leading-snug">{test.name}</p>
                          {test.remarks && (
                            <p className="text-[12px] text-slate-400 mt-1 line-clamp-1">{test.remarks}</p>
                          )}
                        </div>
                        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ml-2 ${chip.className}`}>
                          {chip.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'test_fill' && activeTest && activeSubStage && activeStage && canEditActiveTest && (
          <InspectorTestFillScreen
            key={`${activeTestId}-${activeTest.workflowStatus}-${activeTest.submittedAt || ''}`}
            test={activeTest}
            stage={activeStage}
            subStage={activeSubStage}
            inspectorName={inspectorName}
            onBack={() => setView('test_list')}
            onSubmit={handleTestSubmit}
          />
        )}

        {view === 'test_fill' && activeTest && !canEditActiveTest && (
          <div className="space-y-4 animate-fadeIn max-w-[390px] mx-auto">
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setView(isPastDuty ? 'duty_detail' : 'test_list')}
                className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div>
                <p className="text-[12px] text-slate-400">Test {activeTest.testNumber} · {isPastDuty ? 'Duty record' : 'Submitted'}</p>
                <h2 className="font-medium text-slate-800 text-[16px] leading-snug">{activeTest.name}</h2>
              </div>
            </div>
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-400 uppercase font-medium">Status</span>
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${getInspectorStatusChip(activeTest.workflowStatus).className}`}>
                  {getInspectorStatusChip(activeTest.workflowStatus).label}
                </span>
              </div>
              {activeTest.overallResult && (
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-medium mb-1">Result</p>
                  <p className="text-[15px] text-slate-800 font-medium">{OVERALL_RESULT_LABELS[activeTest.overallResult] || activeTest.overallResult}</p>
                </div>
              )}
              {activeTest.remarks && (
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-medium mb-1">Remarks</p>
                  <p className="text-[14px] text-slate-600 leading-[1.6]">{activeTest.remarks}</p>
                </div>
              )}
              {(activeTest.photos || []).length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {activeTest.photos.map((photo, i) => (
                    <img key={i} src={photo} alt="" className="w-20 h-20 rounded-xl object-cover border border-slate-200" />
                  ))}
                </div>
              )}
              {activeTest.submittedAt && (
                <p className="text-[12px] text-slate-500">Submitted {formatVisitDate(activeTest.submittedAt)}</p>
              )}
              {activeTest.approvedAt && (
                <p className="text-[12px] text-emerald-600">Approved {formatVisitDate(activeTest.approvedAt)}</p>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── SAVING LOADER TOAST ──────────────────────────────────────────────── */}
      {showSavedToast && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 text-center max-w-xs w-full shadow-2xl animate-fadeInUp">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-extrabold text-slate-800 text-base leading-tight">Saved</h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
              Your updates are saved.
            </p>
          </div>
        </div>
      )}

      {/* ── SUBMITTED LOADER TOAST ───────────────────────────────────────────── */}
      {submittedToast && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 text-center max-w-xs w-full shadow-2xl animate-fadeInUp">
            <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <h3 className="font-extrabold text-slate-800 text-base leading-tight">Visit submitted</h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
              Your checks for this site are submitted.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
