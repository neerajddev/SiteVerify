/**
 * SiteVerify design system — single source for colors, type, status badges.
 * Use across homeowner / inspector / admin so the same state always looks the same.
 */

export const COLORS = {
  brand: '#1D9E75',
  brandDeep: '#085041',
  brandSoft: '#E1F5EE',
  amber: '#F59E0B',
  danger: '#EF4444',
  bg: '#F8F8F6',
  text: '#1A1A1A',
  muted: '#64748B',
  purple: '#7C3AED',
};

/** Shared workflow status badges — identical on all three portals */
export const STATUS_BADGES = {
  not_started: {
    key: 'not_started',
    label: 'Not Started',
    className: 'bg-slate-100 text-slate-500 border-slate-200',
  },
  in_progress: {
    key: 'in_progress',
    label: 'In Progress',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  submitted: {
    key: 'submitted',
    label: 'Submitted',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  waiting_review: {
    key: 'waiting_review',
    label: 'Waiting for Admin Review',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  revision_requested: {
    key: 'revision_requested',
    label: 'Sent Back for Correction',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  approved: {
    key: 'approved',
    label: 'Approved',
    className: 'bg-[#E1F5EE] text-[#085041] border-[#1D9E75]/30',
  },
  issue_flagged: {
    key: 'issue_flagged',
    label: 'Issue Flagged',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  not_applicable: {
    key: 'not_applicable',
    label: 'Not applicable for this build type',
    className: 'bg-slate-100 text-slate-500 border-slate-200',
  },
};

export function getStatusBadge(statusKey) {
  return STATUS_BADGES[statusKey] || STATUS_BADGES.not_started;
}

export const TYPE = {
  pageTitle: 'text-[22px] font-medium text-[#085041]',
  cardTitle: 'text-[16px] font-medium text-[#085041]',
  body: 'text-[14px] font-normal text-[#1A1A1A] leading-[1.6]',
  label: 'text-[12px] font-normal text-slate-500',
  eyebrow: 'text-[12px] font-medium text-[#1D9E75] uppercase tracking-wider',
};

export const SURFACES = {
  page: 'bg-[#F8F8F6]',
  card: 'bg-white rounded-2xl border border-slate-100 shadow-sm',
  success: 'bg-[#E1F5EE] border border-[#1D9E75]/30',
  danger: 'bg-rose-50 border border-rose-200',
  warn: 'bg-amber-50 border border-amber-200',
};

export const BUTTONS = {
  primary:
    'bg-[#1D9E75] hover:bg-[#177e5e] text-white font-medium rounded-xl active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium rounded-xl cursor-pointer',
  danger:
    'bg-[#EF4444] hover:bg-rose-600 text-white font-medium rounded-xl cursor-pointer',
};
