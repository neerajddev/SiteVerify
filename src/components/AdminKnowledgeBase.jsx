import React, { useState } from 'react';
import {
  KERALA_CONSTRUCTION_TYPES,
  SITEVERIFY_STAGE_GUIDE,
  SITEVERIFY_VISIT_GUIDE,
  FOUNDATION_QUICK_REF,
  SEASONAL_CALENDAR,
  TYPE_IDENTIFY_QUESTIONS,
} from '../data/keralaConstructionTypes';

export default function AdminKnowledgeBase() {
  const [openType, setOpenType] = useState(KERALA_CONSTRUCTION_TYPES[2]?.id || null);
  const [tab, setTab] = useState('visits');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Admin knowledge base</p>
        <h2 className="text-lg font-black text-slate-800 mt-1">Kerala construction & SiteVerify visits</h2>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-2xl">
          Product: 4 stages · <strong>9 visits</strong> · 17 tests. Assign <strong>one visit per site day</strong>.
          “Before the work is covered” visits must happen before pour or plaster. Visit 3C is live on site during the pour.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'visits', label: '9-visit map' },
          { id: 'stages', label: 'Stages summary' },
          { id: 'types', label: 'Kerala build types' },
          { id: 'identify', label: 'Identify type' },
          { id: 'foundation', label: 'Foundations' },
          { id: 'season', label: 'Season calendar' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-[11px] font-black rounded-lg border cursor-pointer ${
              tab === t.id ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'visits' && (
        <div className="space-y-3">
          {SITEVERIFY_VISIT_GUIDE.map((v) => (
            <div
              key={v.code}
              className={`bg-white rounded-2xl border shadow-sm p-5 ${
                v.adminPriority === 'critical' ? 'border-rose-200' : 'border-slate-100'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-sm font-black text-indigo-700">{v.visitLabel}</span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {v.typeLabel}
                </span>
                <span className="text-[10px] text-slate-400">{v.stageName}</span>
                {v.adminPriority === 'critical' && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                    Critical
                  </span>
                )}
                {v.unannounced && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                    Prefer unannounced
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-slate-800 text-sm">{v.name}</h3>
              <p className="text-[11px] text-slate-500 mt-1">Tests {v.testNumbers.join(', ')}</p>
              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mt-3 leading-relaxed">
                {v.timing}
              </p>
              <p className="text-[11px] text-slate-600 mt-2">{v.gapAfter}</p>
              {v.alertNote && <p className="text-[11px] text-rose-700 font-bold mt-2">{v.alertNote}</p>}
            </div>
          ))}
        </div>
      )}

      {tab === 'stages' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SITEVERIFY_STAGE_GUIDE.map((stage, idx) => (
            <div key={stage.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black flex items-center justify-center">
                  {idx + 1}
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">{stage.name}</h3>
                  <p className="text-[10px] text-slate-400">Tests {stage.testNumbers.join(', ')}</p>
                </div>
              </div>
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 leading-relaxed">
                {stage.visitNote}
              </p>
              <ul className="space-y-1.5">
                {stage.priorities.map((p) => (
                  <li key={p} className="text-xs text-slate-600 flex gap-2">
                    <span className="text-indigo-500">•</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {tab === 'types' && (
        <div className="space-y-3">
          {KERALA_CONSTRUCTION_TYPES.map((type, i) => (
            <div key={type.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenType(openType === type.id ? null : type.id)}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 cursor-pointer"
              >
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Type {i + 1}</p>
                  <h3 className="font-extrabold text-slate-800 text-sm">{type.name}</h3>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{type.summary}</p>
                </div>
                <svg className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${openType === type.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openType === type.id && (
                <div className="px-5 pb-5 border-t border-slate-100 space-y-3 pt-3">
                  <p className="text-xs text-slate-600"><span className="font-bold text-slate-800">Where used:</span> {type.whereUsed}</p>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1.5">Inspection priorities</p>
                    <ul className="space-y-1">
                      {type.inspectionPriorities.map((p) => (
                        <li key={p} className="text-xs text-slate-600">• {p}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-rose-500 uppercase mb-1.5">Key risks</p>
                    <ul className="space-y-1">
                      {type.risks.map((r) => (
                        <li key={r} className="text-xs text-rose-800">• {r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'identify' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            When registering a project, ask the homeowner (or read drawings) these three questions, then record the type on the project.
          </p>
          {TYPE_IDENTIFY_QUESTIONS.map((q, i) => (
            <div key={q.id} className="border border-slate-100 rounded-xl p-4 space-y-2">
              <p className="text-sm font-extrabold text-slate-800">Q{i + 1}. {q.question}</p>
              {q.options.map((o) => (
                <p key={o.answer} className="text-xs text-slate-600">
                  → <strong>{o.answer}</strong> · {o.types}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'foundation' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FOUNDATION_QUICK_REF.map((f) => (
            <div key={f.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2">
              <h3 className="font-extrabold text-slate-800 text-sm">{f.name}</h3>
              <p className="text-xs text-slate-500">{f.usedFor}</p>
              <p className="text-xs text-indigo-700 font-bold bg-indigo-50 rounded-lg px-3 py-2">Key check: {f.keyCheck}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'season' && (
        <div className="space-y-3">
          {SEASONAL_CALENDAR.map((s) => (
            <div key={s.period} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex gap-4">
              <div className="min-w-[140px]">
                <p className="text-[10px] font-black text-slate-400 uppercase">{s.label}</p>
                <p className="text-xs font-extrabold text-slate-800 mt-0.5">{s.period}</p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{s.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
