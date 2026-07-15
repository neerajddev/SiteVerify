import React, { useState, useEffect } from 'react';
import FileDropZone from './FileDropZone';
import SiteLocationPicker from './SiteLocationPicker';
import HomeownerHomeCore from './HomeownerHomeCore';
import HomeownerTestDetail from './HomeownerTestDetail';
import ProjectChatScreen from './ProjectChat';
import {
  getVisitHomeownerStatus,
  isVisitLockedForHomeowner,
} from '../data/homeownerHome';
import {
  STATUS_ENUMS,
  getBlankStages,
  getBlankChecklist,
  isPublishedToHomeowner,
  getHomeownerStatusLabel,
  getHomeownerStatusDescription,
  getSubStagesForStage,
  getStageIndex,
  getHomeownerTestStatus,
  isTestApprovedForHomeowner,
  getHomeownerWorkflowStatus,
  getIssueBanner,
  OVERALL_RESULT_LABELS,
} from '../data/mockData';

const CONSTRUCTION_STAGES = [
  { value: 'not_started', label: 'Not started yet', mapsTo: null },
  { value: 'foundation', label: 'Foundation', mapsTo: 'Foundation' },
  { value: 'upto_ground', label: 'Up to Ground floor', mapsTo: 'Structure' },
  { value: 'upto_1', label: 'Up to 1st floor', mapsTo: 'Structure' },
  { value: 'upto_2', label: 'Up to 2nd floor', mapsTo: 'Structure' },
  { value: 'upto_3', label: 'Up to 3rd floor', mapsTo: 'Structure' },
  { value: 'upto_4', label: 'Up to 4th floor', mapsTo: 'Structure' },
  { value: 'upto_5', label: 'Up to 5th floor', mapsTo: 'Structure' },
  { value: 'slab', label: 'Slab work', mapsTo: 'Slab' },
  { value: 'plastering', label: 'Plastering', mapsTo: 'Plastering' },
  { value: 'finishing', label: 'Finishing work', mapsTo: 'Plastering' },
];

const DEFAULT_SPECS = {
  soilType: 'To be reviewed from drawing',
  detectedFoundation: 'From structural drawing',
  minTrenchDepthMeters: 1.5,
  maxPlumbDeviationMM: 3,
  mortarThicknessMMMin: 8,
  mortarThicknessMMMax: 12,
};

// ── STATUS STYLING HELPER ──────────────────────────────────────────────────────
// ... (omitting helper for targetContent match cleanliness) ...

function getStatusBadgeConfig(status) {
  switch (status) {
    case STATUS_ENUMS.PASS:
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        icon: (
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.06l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
        )
      };
    case STATUS_ENUMS.IGNORED:
      return {
        bg: 'bg-slate-100 text-slate-500 border-slate-200',
        dot: 'bg-slate-400',
        icon: (
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
          </svg>
        )
      };
    case STATUS_ENUMS.ATTENTION:
      return {
        bg: 'bg-safety-50 text-safety-700 border-safety-200',
        dot: 'bg-safety-500',
        icon: (
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        )
      };
    case STATUS_ENUMS.CRITICAL:
      return {
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
        icon: (
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
        )
      };
    default:
      return {
        bg: 'bg-slate-50 text-slate-600 border-slate-200',
        dot: 'bg-slate-400',
        icon: null
      };
  }
}

function formatTimestamp(isoString) {
  if (!isoString) return 'Not yet inspected';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function BackButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
      aria-label={label || 'Go back'}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
}

function Breadcrumb({ parts }) {
  return (
    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
      {parts.map((part, i) => (
        <span key={part}>
          {i > 0 && <span className="mx-1.5 text-slate-300">›</span>}
          <span className={i === parts.length - 1 ? 'text-slate-600 font-semibold' : ''}>{part}</span>
        </span>
      ))}
    </p>
  );
}

// ── MAIN CONSUMER REPORT DASHBOARD ─────────────────────────────────────────────
export default function HomeownerDashboard({ 
  projectReport, 
  onAddProject,
  onUpdateProjects,
  projects,
  userProfile,
  activeProjectId,
  onSelectProject,
  onLogout,
}) {
  // Derive display fields from both old and new schema field names
  const stages = Array.isArray(projectReport?.stages) && projectReport.stages.length > 0
    ? projectReport.stages
    : getBlankStages();

  const foundationType   = projectReport?.foundationType || 'rr';
  const location         = projectReport?.location || 'Unknown';
  const pinCode          = projectReport?.pinCode || '';
  const projectName      = projectReport?.projectName || projectReport?.name || '';
  const blueprintName    = projectReport?.blueprintFile || projectReport?.blueprintName || 'N/A';
  const projectStatus    = projectReport?.projectStatus || projectReport?.status || 'Pending Assignment';
  const aiSpecs          = projectReport?.aiCalibratedSpecs || null;
  const reportPublished  = isPublishedToHomeowner(projectStatus);
  const statusLabel      = getHomeownerStatusLabel(projectStatus);
  const statusDescription = getHomeownerStatusDescription(projectStatus);

  const [view, setView] = useState('home'); // home | stage_detail | sub_stage_detail | test_detail | settings | chat
  const [activeStageId, setActiveStageId] = useState(stages[0]?.id || 'stage_1');
  const [activeSubStageId, setActiveSubStageId] = useState(null);
  const [activeTestId, setActiveTestId] = useState(null);

  useEffect(() => {
    setView('home');
    setActiveSubStageId(null);
    setActiveTestId(null);
    if (stages.length) {
      setActiveStageId(stages[0].id);
    }
  }, [projectReport?.id, stages.length]);

  const navigateToSettings = () => {
    setView('settings');
    window.scrollTo(0, 0);
  };
  const [lightbox, setLightbox] = useState(null); // { url, testName, date }
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // ── New Site Submittal state ────────────────────────────────────────────────
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState('');
  const [newLoc, setNewLoc]               = useState('');
  const [pinCodeInput, setPinCodeInput]   = useState('');
  const [mapsUrlInput, setMapsUrlInput]   = useState('');
  const [siteCoordinates, setSiteCoordinates] = useState(null);
  const [constructionStage, setConstructionStage] = useState('not_started');
  const [newImages, setNewImages]         = useState([]);
  const [blueprintFiles, setBlueprintFiles] = useState([]);
  const [submittingProject, setSubmittingProject] = useState(false);
  const [submitScanStep, setSubmitScanStep]       = useState('');

  const resetSubmitForm = () => {
    setProjectNameInput('');
    setNewLoc('');
    setPinCodeInput('');
    setMapsUrlInput('');
    setSiteCoordinates(null);
    setConstructionStage('not_started');
    setBlueprintFiles([]);
    setNewImages([]);
    setSubmitScanStep('');
  };

  const siteLocationReady = newLoc.trim().length > 0 && pinCodeInput.length === 6;

  const registeredHomeownerName = userProfile?.full_name?.trim() || 'Homeowner';

  const selectedStageMeta = CONSTRUCTION_STAGES.find((s) => s.value === constructionStage) || CONSTRUCTION_STAGES[0];
  const hasStarted = constructionStage !== 'not_started';

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    if (!blueprintFiles.length || !projectNameInput.trim() || !siteLocationReady) return;
    setSubmittingProject(true);

    const uploadedBlueprint = blueprintFiles[0];
    const drawingBlueprint = uploadedBlueprint.name;
    const stageLabel = selectedStageMeta.label;
    const aiCalibratedSpecs = { ...DEFAULT_SPECS };

    setSubmitScanStep('Saving your site...');
    await new Promise((r) => setTimeout(r, 1200));

    const generatedId = 'proj_' + Math.floor(100000 + Math.random() * 900000);
    const blankStages = getBlankStages('rr');
    const blankChecklist = getBlankChecklist(aiCalibratedSpecs, 'rr');

    const newProj = {
      id: generatedId,
      projectName: projectNameInput.trim(),
      name: projectNameInput.trim(),
      homeowner: registeredHomeownerName,
      inspector: 'Pending Assignment',
      blueprintName: drawingBlueprint,
      blueprintUrl: uploadedBlueprint.url,
      blueprintStoragePath: uploadedBlueprint.storagePath || null,
      blueprintType: uploadedBlueprint.type,
      status: 'Pending Assignment',
      homeownerName: registeredHomeownerName,
      assignedInspector: 'Pending Assignment',
      blueprintFile: drawingBlueprint,
      projectStatus: 'Pending Assignment',
      location: newLoc.trim(),
      pinCode: pinCodeInput,
      mapsUrl: mapsUrlInput.trim() || null,
      coordinates: siteCoordinates,
      foundationType: 'rr',
      contractor: '',
      architect: '',
      totalProgress: 0,
      currentPhase: stageLabel,
      constructionStage,
      rectificationNotes: '',
      aiCalibratedSpecs,
      aiFeedback: '',
      historyLogs: [],
      inspectionChecklist: blankChecklist,
      stages: blankStages,
    };

    if (hasStarted && selectedStageMeta.mapsTo) {
      const stageName = selectedStageMeta.mapsTo.toLowerCase();
      const stageIdx = newProj.stages.findIndex(
        (s) => s.name.toLowerCase().includes(stageName) || stageName.includes(s.name.toLowerCase())
      );
      if (stageIdx !== -1) {
        newProj.stages[stageIdx].status = 'In Progress';
        for (let i = 0; i < stageIdx; i++) {
          newProj.stages[i].status = 'Complete';
          newProj.stages[i].progress = 100;
          const subKey = 'subStages';
          newProj.stages[i][subKey] = (newProj.stages[i][subKey] || []).map((sub) => ({
            ...sub,
            progress: 100,
            tests: sub.tests.map((t) => ({
              ...t,
              status: STATUS_ENUMS.PASS,
              remarks: 'Marked complete based on homeowner submittal.',
            })),
          }));
        }
        if (newImages.length > 0) {
          const subKey = 'subStages';
          const updatedSubStages = (newProj.stages[stageIdx][subKey] || []).map((sub, i) => {
            if (i === 0 && sub.tests.length > 0) {
              return {
                ...sub,
                tests: sub.tests.map((t, ti) =>
                  ti === 0
                    ? {
                        ...t,
                        photos: newImages,
                        remarks: 'Homeowner uploaded photos of current site work.',
                      }
                    : t
                ),
              };
            }
            return sub;
          });
          newProj.stages[stageIdx][subKey] = updatedSubStages;
        }
      }
    }

    setSubmitScanStep('Done! Submitting your site...');
    await new Promise((r) => setTimeout(r, 600));
    onAddProject(newProj);
    setSubmittingProject(false);
    setShowSubmitModal(false);
    resetSubmitForm();
  };

  // Quality support contact modal
  const [contactSubject, setContactSubject] = useState(null);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // PWA installation states
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(true);

  // Monitor PWA installation
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      setIsInstalled(true);
      alert('📱 Thank you! SiteVerify has been added to your Home Screen.');
    }
  };

  const handleDownloadPDF = () => {
    setPdfGenerating(true);
    setTimeout(() => {
      setPdfGenerating(false);
      window.print();
    }, 1500);
  };

  const navigateToStageDetail = (stageId) => {
    setActiveStageId(stageId);
    setActiveSubStageId(null);
    setActiveTestId(null);
    setView('stage_detail');
    window.scrollTo(0, 0);
  };

  const navigateToSubStageDetail = (subStageId) => {
    setActiveSubStageId(subStageId);
    setActiveTestId(null);
    setView('sub_stage_detail');
    window.scrollTo(0, 0);
  };

  const navigateToTestDetail = (testId) => {
    setActiveTestId(testId);
    setView('test_detail');
    window.scrollTo(0, 0);
  };

  const handleStageDetailBack = () => {
    setView('home');
    setActiveSubStageId(null);
    setActiveTestId(null);
    window.scrollTo(0, 0);
  };

  const handleSubStageDetailBack = () => {
    setView('stage_detail');
    setActiveTestId(null);
    window.scrollTo(0, 0);
  };

  const handleTestDetailBack = () => {
    setView('sub_stage_detail');
    setActiveTestId(null);
    window.scrollTo(0, 0);
  };

  // Helper to extract the list of sub-stages for a stage
  // Helper to compute summary details for each stage card
  const getStageCardSummary = (stage) => {
    const subStages = getSubStagesForStage(stage);
    const totalTests = subStages.reduce((acc, sub) => acc + sub.tests.length, 0);
    const passedTests = subStages.reduce((acc, sub) => acc + sub.tests.filter(t => t.status === STATUS_ENUMS.PASS).length, 0);
    const attentionTests = subStages.reduce((acc, sub) => acc + sub.tests.filter(t => t.status === STATUS_ENUMS.ATTENTION).length, 0);
    
    if (stage.status === 'Pending') {
      return 'Verification pending';
    }
    if (stage.status === 'Complete') {
      return `All ${totalTests} checks passed successfully`;
    }
    
    // In Progress stage
    let text = `${passedTests} of ${totalTests} checks verified`;
    if (attentionTests > 0) {
      text += ` (${attentionTests} need attention)`;
    }
    return text;
  };

  const getHomeStageSummary = (stage) => {
    if (stage.status === 'Complete') return 'Completed';
    if (stage.status === 'In Progress') return 'In progress';
    return 'Not started yet';
  };

  const handleOpenContactModal = (subject) => {
    setContactSubject(subject);
    setContactSubmitted(false);
    setContactMessage('');
    setClientPhone('');
  };

  const handleSendContactQuery = async (e) => {
    e.preventDefault();
    setContactSubmitted(true);
    if (onUpdateProjects && projects?.length) {
      const updated = projects.map((p) => {
        if (p.id !== projectReport?.id) return p;
        return {
          ...p,
          historyLogs: [
            ...(p.historyLogs || []),
            {
              action: contactSubject,
              by: userProfile?.full_name || 'Homeowner',
              timestamp: new Date().toISOString(),
              phone: clientPhone,
              message: contactMessage,
            },
          ],
        };
      });
      await onUpdateProjects(updated);
    }
  };

  const activeStage = stages.find(s => s.id === activeStageId) || stages[0];
  const activeSubStages = getSubStagesForStage(activeStage);
  const activeSubStage = activeSubStages.find((s) => s.id === activeSubStageId) || null;
  const activeTest = activeSubStage?.tests?.find((t) => t.id === activeTestId) || null;
  const activeStageNum = getStageIndex(activeStage?.id);

  // Dynamic stats calculation for verification summary
  let totalTestsCount = 0;
  let passedTestsCount = 0;
  stages.forEach(stage => {
    const subStages = getSubStagesForStage(stage);
    subStages.forEach(subStage => {
      if (subStage.tests) {
        totalTestsCount += subStage.tests.length;
        passedTestsCount += subStage.tests.filter(t => t.status === STATUS_ENUMS.PASS).length;
      }
    });
  });

  return (
    <div className="min-h-screen blueprint-grid py-4 px-4 md:px-6 relative">
      <div className="max-w-md mx-auto pb-12">
        {/* ── HOME VIEW ──────────────────────────────────────────────────────── */}
        {view === 'home' && (
          <div className="space-y-5 animate-fadeIn">

            {/* Top bar with Settings icon */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SiteVerify</p>
              <div className="flex items-center gap-2">
                {!projectReport && (
                  <button
                    type="button"
                    onClick={() => {
                      resetSubmitForm();
                      setShowSubmitModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#1D9E75] text-white text-[11px] font-bold"
                  >
                    Add site
                  </button>
                )}
              <button
                type="button"
                onClick={navigateToSettings}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 active:scale-95 transition-all cursor-pointer relative"
                title="Settings & Projects"
              >
                <svg className="w-4.5 h-4.5 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {projects.length > 1 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 text-white text-[8px] font-black rounded-full flex items-center justify-center leading-none">
                    {projects.length}
                  </span>
                )}
              </button>
              </div>
            </div>

            {/* PWA Banner */}
            {showInstallBanner && !isInstalled && (
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-4 shadow-lg border border-slate-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-safety-500/20 text-safety-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-100 leading-tight">Add to Home Screen</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Quick access & offline reports.</p>
                  </div>
                </div>
                <button 
                  onClick={handleInstallApp}
                  className="bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-[11px] font-black px-3.5 py-2 rounded-xl transition-all shadow-md shadow-brand-500/20 whitespace-nowrap cursor-pointer"
                >
                  Install App
                </button>
              </div>
            )}

            {projectReport ? (
              <>
                <HomeownerHomeCore
                  project={projectReport}
                  onOpenStage={(stageId) => navigateToStageDetail(stageId)}
                  onOpenIssue={(issue) => {
                    setActiveStageId(issue.stageId);
                    setActiveSubStageId(issue.subStageId);
                    setActiveTestId(issue.testId);
                    setView('test_detail');
                    window.scrollTo(0, 0);
                  }}
                  onOpenChat={() => {
                    setView('chat');
                    window.scrollTo(0, 0);
                  }}
                />

                <button
                  type="button"
                  onClick={() => { resetSubmitForm(); setShowSubmitModal(true); }}
                  className="w-full py-3 bg-white border border-dashed border-slate-300 text-[#085041] text-[14px] font-medium rounded-2xl cursor-pointer"
                >
                  + Add another site
                </button>

                {projectStatus === 'Rectification Required' && projectReport.rectificationNotes && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-rose-600 text-base">🔧</span>
                      <span className="text-[12px] font-bold text-rose-700 uppercase tracking-wider">What needs fixing</span>
                    </div>
                    <p className="text-[14px] text-rose-800 leading-[1.6] font-medium">
                      {projectReport.rectificationNotes}
                    </p>
                  </div>
                )}

                {/* Quick Stats & PDF Download Button */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-bold uppercase text-[10px] tracking-wider text-slate-400">Report Summary</span>
                    <span>
                      {reportPublished
                        ? <>Checks passed: <strong className="text-slate-700">{passedTestsCount} of {totalTestsCount}</strong></>
                        : <strong className="text-slate-500">Available after approval</strong>}
                    </span>
                  </div>
              
              <button
                onClick={handleDownloadPDF}
                disabled={pdfGenerating || !reportPublished}
                className={`w-full text-xs font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 border shadow-sm ${
                  !reportPublished
                    ? 'bg-slate-50 text-slate-450 border-slate-200 cursor-not-allowed'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 active:scale-95 cursor-pointer'
                }`}
              >
                {pdfGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-slate-650" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating PDF...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF Report
                  </>
                )}
              </button>
            </div>
              </>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#E8F8F2] text-[#1D9E75] flex items-center justify-center mx-auto text-2xl">
                  🏠
                </div>
                <div>
                  <p className="text-[12px] font-medium text-[#1D9E75] uppercase tracking-wider">
                    Welcome{userProfile?.full_name ? `, ${userProfile.full_name.split(' ')[0]}` : ''}
                  </p>
                  <h2 className="text-[22px] font-medium text-[#085041] mt-2 leading-tight">
                    Add your construction site
                  </h2>
                  <p className="text-[14px] text-slate-500 mt-2 leading-[1.6] max-w-sm mx-auto">
                    Upload your structural drawing and site details. SiteVerify will then assign an independent engineer for stage-wise checks.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetSubmitForm();
                    setShowSubmitModal(true);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-[#1D9E75] hover:bg-[#177e5e] text-white text-[15px] font-medium transition-all active:scale-[0.99]"
                >
                  Add your site
                </button>
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  Takes about 2 minutes · Drawing PDF or image needed
                </p>
              </div>
            )}
            
          </div>
        )}

        {view === 'chat' && projectReport && (
          <div className="animate-fadeIn -mx-4 md:-mx-6 -mt-1">
            <ProjectChatScreen
              project={projectReport}
              currentUser={{
                id: userProfile?.id || null,
                role: 'homeowner',
                full_name: userProfile?.full_name || registeredHomeownerName,
              }}
              onBack={() => {
                setView('home');
                window.scrollTo(0, 0);
              }}
            />
          </div>
        )}

        {/* ── STAGE DETAIL VIEW (Sub-stage list) ───────────────────────────────── */}
        {view === 'stage_detail' && projectReport && (
          <div className="space-y-4 animate-fadeIn max-w-[390px] mx-auto">
            <div className="flex items-center gap-3 pt-1">
              <BackButton onClick={handleStageDetailBack} label="Back to home" />
              <div className="min-w-0 flex-1">
                <Breadcrumb parts={['Home', `Stage ${activeStageNum}: ${activeStage.name}`]} />
                <h2 className="text-[22px] font-medium text-[#085041] mt-0.5">{activeStage.name}</h2>
              </div>
            </div>

            {!reportPublished && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-[13px] text-amber-900">
                <p className="font-bold">Inspection report not ready yet</p>
                <p className="mt-1 text-amber-800 leading-relaxed">
                  You can browse stages and checks below. Full results appear when your report is ready.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleOpenContactModal(`Quality check: ${activeStage.name}`)}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-black rounded-xl active:scale-[0.98] transition-all cursor-pointer"
            >
              Request quality check for {activeStage.name}
            </button>

            <div className="space-y-2">
              <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wider px-1">Visits</p>
              {activeSubStages.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-[14px]">
                  No visits set up for this stage yet.
                </div>
              ) : (
                activeSubStages.map((subStage) => {
                  const visitStatus = getVisitHomeownerStatus(projectReport, subStage.code);
                  const locked = isVisitLockedForHomeowner(projectReport, subStage.code);
                  return (
                    <button
                      key={subStage.id}
                      type="button"
                      disabled={locked}
                      onClick={() => !locked && navigateToSubStageDetail(subStage.id)}
                      className={`w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-4 text-left transition-all ${
                        locked
                          ? 'bg-slate-50 border border-slate-100 cursor-not-allowed opacity-80'
                          : 'bg-white border border-slate-200 hover:border-brand-300 active:scale-[0.99] cursor-pointer'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-[#1D9E75]">Visit {subStage.code}</p>
                        <p className="text-[16px] font-medium text-[#085041] mt-0.5">{subStage.name}</p>
                        <p className="text-[14px] text-slate-500 mt-0.5">
                          {locked
                            ? 'Inspection not yet assigned'
                            : visitStatus.label}
                        </p>
                      </div>
                      {locked ? (
                        <span className="text-[12px] text-slate-400 flex-shrink-0">🔒</span>
                      ) : (
                        <svg className="w-5 h-5 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── SUB-STAGE DETAIL VIEW (Test list) ────────────────────────────────── */}
        {view === 'sub_stage_detail' && projectReport && activeSubStage && (
          <div className="space-y-4 animate-fadeIn max-w-[390px] mx-auto">
            <div className="flex items-center gap-3 pt-1">
              <BackButton onClick={handleSubStageDetailBack} label="Back to stage" />
              <div className="min-w-0 flex-1">
                <Breadcrumb
                  parts={[
                    `Stage ${activeStageNum}`,
                    `Visit ${activeSubStage.code}`,
                    activeSubStage.name,
                  ]}
                />
                <h2 className="font-extrabold text-slate-800 text-base mt-0.5">{activeSubStage.name}</h2>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">Tests</p>
              {activeSubStage.tests.map((test) => {
                const statusConfig = getHomeownerWorkflowStatus(test);
                return (
                  <button
                    key={test.id}
                    type="button"
                    onClick={() => navigateToTestDetail(test.id)}
                    className="w-full flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-4 text-left hover:border-brand-300 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-slate-400">Test {test.testNumber}</p>
                      <p className="text-[15px] font-semibold text-slate-800 mt-0.5 leading-snug">{test.name}</p>
                    </div>
                    <span className={`flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusConfig.className}`}>
                      {statusConfig.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TEST DETAIL VIEW ───────────────────────────────────────────────────── */}
        {view === 'test_detail' && projectReport && activeTest && activeSubStage && (
          <HomeownerTestDetail
            test={activeTest}
            stage={activeStage}
            subStage={activeSubStage}
            project={projectReport}
            onBack={handleTestDetailBack}
          />
        )}

      </div>

      {/* ── LIGHTBOX/MODAL VIEW ────────────────────────────────────────────────── */}
      {lightbox && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div 
            className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 animate-fadeInUp"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="aspect-[4/3] w-full bg-slate-950">
              <img 
                src={lightbox.url} 
                alt="Enlarged evidence" 
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-5 bg-slate-900 border-t border-slate-800">
              <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">
                VERIFIED INSPECTION SITE PHOTO
              </span>
              <h3 className="font-extrabold text-white text-base md:text-lg mt-1">
                {lightbox.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Timestamp: {lightbox.date}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTACT MODAL ──────────────────────────────────────────────────────── */}
      {contactSubject && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setContactSubject(null)}
        >
          <div 
            className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 overflow-hidden animate-fadeInUp"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setContactSubject(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center"
            >
              ✕
            </button>

            {!contactSubmitted ? (
              <form onSubmit={handleSendContactQuery} className="space-y-4">
                <div className="text-center pb-2 border-b border-slate-50">
                  <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-base leading-tight">Request a quality check</h3>
                  <p className="text-xs text-slate-400 mt-1">Our team will call you back</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Inquiry Topic / Reference
                    </label>
                    <input 
                      type="text" 
                      readOnly 
                      value={contactSubject}
                      className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-xs text-slate-600 font-bold focus:outline-none cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Your Phone Number
                    </label>
                    <input 
                      type="tel" 
                      required
                      placeholder="+91 98765 43210"
                      value={clientPhone}
                      onChange={e => setClientPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Your Question / Message
                    </label>
                    <textarea 
                      rows="3"
                      required
                      placeholder="Ask about measurements, deviations, or recommendations..."
                      value={contactMessage}
                      onChange={e => setContactMessage(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all resize-none"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-brand-500/20 flex items-center justify-center gap-1.5"
                >
                  Submit Callback Request
                </button>
              </form>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base leading-tight">Request Received</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mt-2">
                    We have successfully queued your quality query regarding <strong className="text-slate-800 font-extrabold">"{contactSubject}"</strong>.
                  </p>
                  <p className="text-xs text-teal-600 leading-relaxed font-bold mt-2.5">
                    📞 A SiteVerify specialist will call you back within 2 hours.
                  </p>
                </div>
                <button 
                  onClick={() => setContactSubject(null)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  Close Window
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SETTINGS VIEW ──────────────────────────────────────────────────────── */}
      {view === 'settings' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setView('home')}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm text-slate-600 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            >
              <svg className="w-4.5 h-4.5 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="text-base font-black text-slate-800 leading-none">Settings</h2>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Account &amp; Projects</p>
            </div>
          </div>

          {/* Account Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-1">
            <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wider">Profile</p>
            <p className="text-[16px] font-medium text-[#085041]">{userProfile?.full_name || 'Homeowner'}</p>
            {userProfile?.phone && (
              <p className="text-[14px] text-slate-500 font-normal">{userProfile.phone}</p>
            )}
            {location && (
              <p className="text-[14px] text-slate-500 mt-2 leading-[1.6]">
                {location}{pinCode ? ` · PIN ${pinCode}` : ''}
              </p>
            )}
          </div>

          <a
            href="https://wa.me/919876543210?text=Hi%20SiteVerify%20—%20I%20need%20help%20with%20my%20home%20inspection"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#1D9E75] hover:bg-[#177e5e] text-white text-[14px] font-medium rounded-xl cursor-pointer"
          >
            Contact SiteVerify on WhatsApp
          </a>

          {/* Projects Card */}
          {projects.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">My Projects</p>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full">
                  {projects.length} project{projects.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-2">
                {projects.map((p) => {
                  const isActive = p.id === (activeProjectId || projectReport.id);
                  const label = p.projectName || p.location?.split(',')[0] || 'Site';
                  const loc = p.location || '';
                  const pin = p.pinCode || '';
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onSelectProject?.(p.id);
                        setView('home');
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                        isActive
                          ? 'bg-brand-50 border-brand-400 text-brand-800 ring-1 ring-brand-200'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="block text-xs font-extrabold truncate">{label}</span>
                        <span className="block text-[9px] text-slate-400 mt-0.5 truncate">
                          {loc}{pin ? ` · PIN ${pin}` : ''}
                        </span>
                      </div>
                      {isActive && (
                        <span className="flex-shrink-0 ml-2 text-brand-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Add new site shortcut */}
              <button
                type="button"
                onClick={() => {
                  resetSubmitForm();
                  setShowSubmitModal(true);
                  setView('home');
                }}
                className="w-full py-3 border border-dashed border-brand-300 text-brand-600 text-xs font-bold rounded-xl hover:bg-brand-50 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
              >
                ➕ Add New Site
              </button>
            </div>
          )}

          {/* Sign out */}
          {onLogout && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-3 text-rose-600 text-xs font-bold rounded-xl hover:bg-rose-50 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── SUBMIT NEW SITE VERIFICATION MODAL ────────────────────────────────── */}
      {showSubmitModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => !submittingProject && setShowSubmitModal(false)}
        >
          <div 
            className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 overflow-hidden animate-fadeInUp my-8"
            onClick={e => e.stopPropagation()}
          >
            {!submittingProject && (
              <button 
                onClick={() => setShowSubmitModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 transition-colors w-7 h-7 bg-slate-50 flex items-center justify-center font-bold rounded-full border border-slate-100"
              >
                ✕
              </button>
            )}

            {submittingProject ? (
              <div className="space-y-4 text-center py-6">
                <div className="w-14 h-14 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin mx-auto" />
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Submitting your site</h3>
                  <p className="text-[11px] text-brand-600 font-bold mt-2 animate-pulse">{submitScanStep}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitProject} className="space-y-4">
                <div className="text-center pb-2 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-650 flex items-center justify-center mx-auto mb-3 text-xl">🏠</div>
                  <h3 className="font-extrabold text-slate-800 text-base leading-tight">Add New Site</h3>
                  <p className="text-xs text-slate-400 mt-1">Enter your site details and upload your structural drawing.</p>
                </div>

                <div className="space-y-3.5 max-h-[60vh] overflow-y-auto px-1">

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Project name</label>
                    <input type="text" required placeholder="e.g. Nair Residence" value={projectNameInput} onChange={e => setProjectNameInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all" />
                  </div>

                  <SiteLocationPicker
                    address={newLoc}
                    pinCode={pinCodeInput}
                    mapsUrl={mapsUrlInput}
                    coordinates={siteCoordinates}
                    onChange={({ address, pinCode, mapsUrl, coordinates }) => {
                      if (address !== undefined) setNewLoc(address);
                      if (pinCode !== undefined) setPinCodeInput(pinCode);
                      if (mapsUrl !== undefined) setMapsUrlInput(mapsUrl);
                      if (coordinates !== undefined) setSiteCoordinates(coordinates);
                    }}
                  />

                  <FileDropZone
                    label="Structural drawing (PDF, DWG, or image)"
                    hint="Upload your approved building drawing. PDF, DWG, JPG, or PNG — up to 8 MB."
                    accept=".pdf,.dwg,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                    uploadFolder="blueprints"
                    files={blueprintFiles}
                    onChange={setBlueprintFiles}
                    emptyText="Drop your building drawing here"
                    browseText="or tap to choose a file"
                  />

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Current stage of construction</label>
                    <select value={constructionStage} onChange={e => setConstructionStage(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none bg-white">
                      {CONSTRUCTION_STAGES.map((stage) => (
                        <option key={stage.value} value={stage.value}>{stage.label}</option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-400 mt-1">Pick where your build is today — e.g. not started, up to 3rd floor, plastering.</p>
                  </div>

                  {hasStarted && (
                    <div className="bg-slate-50 p-3 rounded-2xl border border-dashed border-slate-200 animate-fadeIn">
                      <FileDropZone
                        label="Site photos (optional)"
                        hint="Photos of your current construction. JPG or PNG — up to 8 MB each."
                        accept="image/*,.jpg,.jpeg,.png,.webp"
                        uploadFolder="site-photos"
                        multiple
                        maxFiles={6}
                        files={newImages.map((url, i) => ({
                          name: `site_photo_${i + 1}.jpg`,
                          url,
                          type: 'image/jpeg',
                        }))}
                        onChange={(uploaded) => setNewImages(uploaded.map((f) => f.url))}
                        emptyText="Drop site photos here"
                        browseText="or tap to add photos"
                        variant="compact"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2.5 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setShowSubmitModal(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 rounded-xl text-center">Cancel</button>
                  <button type="submit" disabled={!blueprintFiles.length || !projectNameInput.trim() || !siteLocationReady}
                    className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl text-center shadow-md shadow-brand-500/25 flex items-center justify-center gap-1 cursor-pointer">
                    Submit Site
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
