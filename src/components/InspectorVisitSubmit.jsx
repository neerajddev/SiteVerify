import React from 'react';
import { WORKFLOW_STATUS, getInspectorStatusChip } from '../data/testWorkflow';
import {
  getVisitCardMeta,
  getVisitCompletionSummary,
  getAssignedApplicableTests,
} from '../data/inspectorVisits';

export default function InspectorVisitSubmit({
  project,
  onBack,
  onOpenTest,
  onSubmitVisit,
  submitting = false,
}) {
  const meta = getVisitCardMeta(project);
  const summary = getVisitCompletionSummary(project);
  const tests = getAssignedApplicableTests(project);

  return (
    <div className="space-y-5 animate-fadeIn pb-28">
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <p className="text-[12px] font-medium text-[#1D9E75] uppercase tracking-wider">
            {meta.visitLabel}
          </p>
          <h2 className="text-[16px] font-medium text-[#085041]">
            {summary.done}/{summary.total} tests ready
          </h2>
        </div>
      </div>

      <p className="text-[14px] text-slate-500 leading-[1.6] px-1">
        Complete every check for this visit, then submit once for QA review.
      </p>

      <div className="space-y-2">
        {tests.map(({ test, stage, subStage }) => {
          const status = test.workflowStatus || WORKFLOW_STATUS.NOT_STARTED;
          const chip = getInspectorStatusChip(status);
          const done = [
            WORKFLOW_STATUS.SUBMITTED,
            WORKFLOW_STATUS.APPROVED,
          ].includes(status);
          const needsFix = status === WORKFLOW_STATUS.REVISION_REQUESTED;

          return (
            <button
              key={test.id}
              type="button"
              onClick={() => onOpenTest(test.id, stage.id, subStage.id)}
              className={`w-full flex items-center gap-3 bg-white border rounded-2xl px-4 py-4 text-left shadow-sm cursor-pointer ${
                needsFix ? 'border-amber-300' : 'border-slate-100'
              }`}
            >
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[14px] flex-shrink-0 ${
                  done
                    ? 'bg-[#E1F5EE] text-[#085041]'
                    : needsFix
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {done ? '✓' : needsFix ? '!' : '○'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-slate-400">Test {test.testNumber}</p>
                <p className="text-[15px] font-medium text-slate-800 mt-0.5 leading-snug">{test.name}</p>
              </div>
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${chip.className}`}>
                {chip.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <button
            type="button"
            onClick={onSubmitVisit}
            disabled={!summary.allFilled || submitting}
            className="w-full py-4 bg-[#1D9E75] hover:bg-[#177e5e] disabled:bg-slate-200 disabled:text-slate-400 text-white text-[16px] font-medium rounded-2xl shadow-lg active:scale-[0.98] transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {submitting
              ? 'Submitting…'
              : summary.allFilled
                ? 'Submit for QA review'
                : `Finish ${summary.incomplete.length} more check${summary.incomplete.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
