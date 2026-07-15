import React, { useState, useEffect } from 'react';
import { getVerificationMeta, VERIFICATION_STATUS } from '../data/inspectorProfile';
import { submitInspectorProfileForReview } from '../services/inspectorProfileService';
import {
  formatVisitDate,
  getAssignmentScopeLabel,
  getDutyProgressLabel,
  getDutyProgress,
} from '../data/projectAnalytics';

function uid() {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function InspectorSettings({
  authProfile,
  inspectorProfile,
  onSave,
  onBack,
  onSignOut,
  pastDuties = [],
  onOpenPastDuty,
}) {
  const [form, setForm] = useState(inspectorProfile);
  const [saved, setSaved] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setForm(inspectorProfile);
  }, [inspectorProfile]);

  const verification = getVerificationMeta(form.verificationStatus);
  const canEdit = form.verificationStatus !== VERIFICATION_STATUS.PENDING;
  const canSubmitForReview =
    canEdit &&
    form.qualifications.length > 0 &&
    form.experience.length > 0 &&
    form.city.trim();

  const handleSave = () => {
    const updated = onSave(form);
    setForm(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSubmitForReview = () => {
    const updated = submitInspectorProfileForReview(form);
    setForm(updated);
    onSave(updated);
    setSubmitted(true);
  };

  const addQualification = () => {
    setForm((f) => ({
      ...f,
      qualifications: [...f.qualifications, { id: uid(), degree: '', institution: '', year: '' }],
    }));
  };

  const updateQualification = (id, field, value) => {
    setForm((f) => ({
      ...f,
      qualifications: f.qualifications.map((q) => (q.id === id ? { ...q, [field]: value } : q)),
    }));
  };

  const removeQualification = (id) => {
    setForm((f) => ({ ...f, qualifications: f.qualifications.filter((q) => q.id !== id) }));
  };

  const addExperience = () => {
    setForm((f) => ({
      ...f,
      experience: [...f.experience, { id: uid(), role: '', company: '', years: '', sites: '' }],
    }));
  };

  const updateExperience = (id, field, value) => {
    setForm((f) => ({
      ...f,
      experience: f.experience.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    }));
  };

  const removeExperience = (id) => {
    setForm((f) => ({ ...f, experience: f.experience.filter((e) => e.id !== id) }));
  };

  const inputClass =
    'w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400';

  return (
    <div className="space-y-5 animate-fadeIn pb-8">
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-base font-black text-slate-800">Settings</h2>
          <p className="text-[10px] text-slate-400 font-medium">Profile &amp; past sites</p>
        </div>
      </div>

      <div className={`rounded-2xl border p-4 ${verification.className}`}>
        <p className="text-xs font-black uppercase tracking-wider">{verification.icon} {verification.label}</p>
        <p className="text-xs mt-1.5 leading-relaxed opacity-90">{verification.description}</p>
        {form.adminNote && form.verificationStatus === VERIFICATION_STATUS.REJECTED && (
          <p className="text-xs mt-2 font-bold">Note: {form.adminNote}</p>
        )}
      </div>

      {/* Past duties — history of sites worked */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Previous sites</p>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            {pastDuties.length}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Sites you already completed. Home shows current visits only.
        </p>
        {pastDuties.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">No completed duties yet.</p>
        ) : (
          <div className="space-y-2">
            {pastDuties.map((proj) => {
              const progress = getDutyProgress(proj);
              return (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => onOpenPastDuty?.(proj)}
                  className="w-full text-left bg-slate-50 border border-slate-100 hover:border-emerald-300 rounded-xl px-3 py-3 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-800 truncate">
                        {(proj.homeownerName || proj.homeowner)}'s House
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">📍 {proj.location}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {getAssignmentScopeLabel(proj.assignment)} · {getDutyProgressLabel(proj)}
                      </p>
                      {proj.assignment?.completedAt && (
                        <p className="text-[10px] text-emerald-600 font-bold mt-1">
                          ✓ {formatVisitDate(proj.assignment.completedAt)}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] font-black text-emerald-700 flex-shrink-0">{progress}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Account</p>
        <p className="text-sm font-extrabold text-slate-800">{authProfile?.full_name || form.fullName}</p>
        {authProfile?.phone && <p className="text-xs text-slate-500">{authProfile.phone}</p>}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Basic details</p>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">City / service area</label>
          <input
            type="text"
            disabled={!canEdit}
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            placeholder="e.g. Thrissur, Kerala"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Short bio</label>
          <textarea
            rows={2}
            disabled={!canEdit}
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            placeholder="Your inspection specialties..."
            className={`${inputClass} resize-none`}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Certifications &amp; skills</label>
          <textarea
            rows={2}
            disabled={!canEdit}
            value={form.certifications}
            onChange={(e) => setForm((f) => ({ ...f, certifications: e.target.value }))}
            placeholder="e.g. IS codes, structural drawing review..."
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Qualifications</p>
          {canEdit && (
            <button type="button" onClick={addQualification} className="text-[10px] font-black text-amber-600 cursor-pointer">
              + Add
            </button>
          )}
        </div>
        {form.qualifications.length === 0 && (
          <p className="text-xs text-slate-400">Add your degrees, diplomas, or training certificates.</p>
        )}
        {form.qualifications.map((q) => (
          <div key={q.id} className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <input
              disabled={!canEdit}
              value={q.degree}
              onChange={(e) => updateQualification(q.id, 'degree', e.target.value)}
              placeholder="Degree / certificate"
              className={inputClass}
            />
            <input
              disabled={!canEdit}
              value={q.institution}
              onChange={(e) => updateQualification(q.id, 'institution', e.target.value)}
              placeholder="Institution"
              className={inputClass}
            />
            <div className="flex gap-2">
              <input
                disabled={!canEdit}
                value={q.year}
                onChange={(e) => updateQualification(q.id, 'year', e.target.value)}
                placeholder="Year"
                className={`${inputClass} flex-1`}
              />
              {canEdit && (
                <button type="button" onClick={() => removeQualification(q.id)} className="text-xs text-rose-500 font-bold px-2 cursor-pointer">
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Previous experience</p>
          {canEdit && (
            <button type="button" onClick={addExperience} className="text-[10px] font-black text-amber-600 cursor-pointer">
              + Add
            </button>
          )}
        </div>
        {form.experience.length === 0 && (
          <p className="text-xs text-slate-400">Add past roles so we can confirm your background.</p>
        )}
        {form.experience.map((exp) => (
          <div key={exp.id} className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <input
              disabled={!canEdit}
              value={exp.role}
              onChange={(e) => updateExperience(exp.id, 'role', e.target.value)}
              placeholder="Role (e.g. Site Quality Inspector)"
              className={inputClass}
            />
            <input
              disabled={!canEdit}
              value={exp.company}
              onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
              placeholder="Company / contractor"
              className={inputClass}
            />
            <input
              disabled={!canEdit}
              value={exp.years}
              onChange={(e) => updateExperience(exp.id, 'years', e.target.value)}
              placeholder="Years (e.g. 2020–2023)"
              className={inputClass}
            />
            <div className="flex gap-2">
              <input
                disabled={!canEdit}
                value={exp.sites}
                onChange={(e) => updateExperience(exp.id, 'sites', e.target.value)}
                placeholder="Sites inspected (optional)"
                className={`${inputClass} flex-1`}
              />
              {canEdit && (
                <button type="button" onClick={() => removeExperience(exp.id)} className="text-xs text-rose-500 font-bold px-2 cursor-pointer">
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3 bg-white border-2 border-slate-200 text-slate-800 text-sm font-black rounded-xl hover:bg-slate-50 cursor-pointer"
          >
            {saved ? '✓ Saved' : 'Save draft'}
          </button>
          <button
            type="button"
            onClick={handleSubmitForReview}
            disabled={!canSubmitForReview}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-slate-900 text-sm font-black rounded-xl shadow-md cursor-pointer disabled:cursor-not-allowed"
          >
            Submit profile
          </button>
          <p className="text-[10px] text-slate-400 text-center leading-relaxed">
            After submission, we will confirm your profile before you receive new sites.
          </p>
        </div>
      )}

      {submitted && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-800 font-medium text-center">
          Profile submitted. We will get back to you soon.
        </div>
      )}

      {onSignOut && (
        <button
          type="button"
          onClick={onSignOut}
          className="w-full py-3 text-rose-600 text-xs font-black border border-rose-200 rounded-xl hover:bg-rose-50 cursor-pointer"
        >
          Sign out
        </button>
      )}
    </div>
  );
}
