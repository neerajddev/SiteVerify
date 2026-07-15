import React, { useState } from 'react';
import { formatVisitDate } from '../data/projectAnalytics';
import { isVisit3BItem, parseDistrict } from '../data/adminVisits';
import AdminTestReviewScreen from './AdminTestReviewScreen';
import { findTestInProject } from '../data/testWorkflow';

export default function AdminReviewQueue({
  queue,
  projects,
  onApprove,
  onSendBack,
  constructionTypeLabel,
}) {
  const [selectedKey, setSelectedKey] = useState(queue[0] ? itemKey(queue[0]) : null);

  const selected =
    queue.find((item) => itemKey(item) === selectedKey) || queue[0] || null;
  const reviewProject = selected
    ? projects.find((p) => p.id === selected.project.id) || selected.project
    : null;
  const liveTest =
    selected && reviewProject
      ? findTestInProject(
          reviewProject,
          selected.stage.id,
          selected.subStage.id,
          selected.test.id
        )
      : null;

  if (queue.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
        <p className="text-[16px] font-medium text-[#085041]">Queue is clear</p>
        <p className="text-[14px] text-slate-500 mt-1">No submitted tests waiting for review.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 min-h-[520px]">
      <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-[16px] font-medium text-[#085041]">QA review queue</h3>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Critical issues first · Visit 3B pinned · then oldest
          </p>
        </div>
        <div className="overflow-y-auto divide-y divide-slate-50 flex-1 max-h-[70vh]">
          {queue.map((item) => {
            const key = itemKey(item);
            const active = selected && itemKey(selected) === key;
            const critical3b = isVisit3BItem(item);
            const isCriticalIssue = item.test.severity === 'critical';
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedKey(key)}
                className={`w-full text-left px-4 py-3.5 cursor-pointer transition-colors ${
                  active ? 'bg-[#E1F5EE]/80' : 'hover:bg-slate-50'
                } ${critical3b ? 'border-l-4 border-l-rose-500' : ''}`}
              >
                {critical3b && (
                  <p className="text-[11px] font-medium text-rose-700 mb-1">
                    ⚡ Approve today — pour cannot wait
                  </p>
                )}
                {isCriticalIssue && !critical3b && (
                  <p className="text-[11px] font-medium text-rose-700 mb-1">Critical issue flagged</p>
                )}
                <p className="text-[15px] font-medium text-slate-800">
                  <span className="text-amber-800">T{item.test.testNumber}</span> {item.test.name}
                </p>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  {item.project.projectName || item.project.homeownerName} ·{' '}
                  {parseDistrict(item.project) || item.project.location}
                </p>
                <p className="text-[12px] text-slate-400 mt-1">
                  {item.subStage?.code ? `Visit ${item.subStage.code}` : item.stage?.name}
                  {item.submittedAt ? ` · ${formatVisitDate(item.submittedAt)}` : ''}
                  {constructionTypeLabel?.(item.project.constructionType)
                    ? ` · ${constructionTypeLabel(item.project.constructionType)}`
                    : ''}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {liveTest?.test && reviewProject && selected ? (
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            <AdminTestReviewScreen
              key={`${reviewProject.id}-${liveTest.test.id}-${liveTest.test.workflowStatus}`}
              test={liveTest.test}
              stage={liveTest.stage || selected.stage}
              subStage={liveTest.subStage || selected.subStage}
              project={reviewProject}
              onBack={() => {}}
              hideBack
              onApprove={(updates) =>
                onApprove(
                  reviewProject.id,
                  selected.stage.id,
                  selected.subStage.id,
                  liveTest.test.id,
                  updates
                )
              }
              onSendBack={(updates) =>
                onSendBack(
                  reviewProject.id,
                  selected.stage.id,
                  selected.subStage.id,
                  liveTest.test.id,
                  updates
                )
              }
            />
          </div>
        ) : (
          <p className="p-10 text-center text-slate-400 text-[14px]">Select a test from the queue</p>
        )}
      </div>
    </div>
  );
}

function itemKey(item) {
  return `${item.project.id}-${item.test.id}`;
}
