import React from 'react';

/**
 * Top banner: Add to Home Screen + close.
 * Hidden after install or dismiss (handled by useAddToHomeScreen).
 */
export default function AddToHomeScreenBanner({
  visible,
  onInstall,
  onDismiss,
  accent = 'teal',
}) {
  if (!visible) return null;

  const btn =
    accent === 'amber'
      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
      : 'bg-[#1D9E75] hover:bg-[#177e5e] text-white';

  return (
    <div className="sticky top-0 z-40 px-3 pt-3 pb-1">
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white shadow-sm px-3 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-base ${
              accent === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-[#E1F5EE] text-[#1D9E75]'
            }`}
            aria-hidden
          >
            📱
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-800 leading-tight truncate">
              Add to Home Screen
            </p>
            <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
              Open like an app — faster next time
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onInstall}
          className={`flex-shrink-0 rounded-xl px-3 py-2 text-[12px] font-bold active:scale-[0.98] transition-all ${btn}`}
        >
          Add
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss add to home screen"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
