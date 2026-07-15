import React, { useState } from 'react';
import { DEMO_ACCOUNTS, isDemoMode } from '../data/demoAccounts';
import { canUseDemoBypass } from '../services/demoAuthService';

const PORTALS = [
  { id: 'homeowner', icon: '🏠', title: 'Homeowner', path: '/homeowner.html', color: 'teal' },
  { id: 'inspector', icon: '🔍', title: 'Inspector', path: '/freelancer.html', color: 'amber' },
  { id: 'admin', icon: '👑', title: 'Admin', path: '/admin.html', color: 'indigo' },
];

const colorStyles = {
  teal: { border: 'hover:border-teal-500/30', icon: 'bg-teal-500/10 border-teal-500/20 text-teal-400', btn: 'hover:bg-teal-500 hover:text-slate-950', copy: 'text-teal-400' },
  amber: { border: 'hover:border-amber-500/30', icon: 'bg-amber-500/10 border-amber-500/20 text-amber-400', btn: 'hover:bg-amber-500 hover:text-slate-950', copy: 'text-amber-400' },
  indigo: { border: 'hover:border-indigo-500/30', icon: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400', btn: 'hover:bg-indigo-500 hover:text-slate-950', copy: 'text-indigo-400' },
};

function getShareUrl(path) {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  return path;
}

export default function HubApp() {
  const [copiedId, setCopiedId] = useState(null);

  const copyLink = async (portal) => {
    await navigator.clipboard.writeText(getShareUrl(portal.path));
    setCopiedId(portal.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-black text-white text-center">SiteVerify</h1>

        {isDemoMode() && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400 space-y-3">
            <p className="font-bold text-slate-200">Demo logins</p>
            {canUseDemoBypass() && (
              <p className="text-teal-400">Tap <strong>Enter demo</strong> on each portal — no OTP needed while testing.</p>
            )}
            <div>
              <p className="text-slate-300 font-bold">Homeowner</p>
              <p>+91 {DEMO_ACCOUNTS.homeowner.phone}</p>
            </div>
            <div>
              <p className="text-slate-300 font-bold">Inspector</p>
              <p>+91 {DEMO_ACCOUNTS.inspector.phone}</p>
            </div>
            <div>
              <p className="text-slate-300 font-bold">Admin</p>
              <p>{DEMO_ACCOUNTS.admin.email}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {PORTALS.map((portal) => {
            const styles = colorStyles[portal.color];
            const shareUrl = getShareUrl(portal.path);

            return (
              <div
                key={portal.id}
                className={`bg-slate-900/40 rounded-2xl border border-slate-800 ${styles.border} p-4 transition-colors`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg shrink-0 ${styles.icon}`}>
                    {portal.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-white">{portal.title}</h2>
                    <p className="text-[11px] font-mono text-slate-500 truncate">{shareUrl}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <a
                    href={portal.path}
                    className={`flex-1 text-center py-2 bg-slate-800 font-bold text-xs rounded-xl transition-colors ${styles.btn}`}
                  >
                    Open
                  </a>
                  <button
                    type="button"
                    onClick={() => copyLink(portal)}
                    className={`px-4 py-2 bg-slate-800 hover:bg-slate-700 font-bold text-xs rounded-xl transition-colors ${styles.copy}`}
                  >
                    {copiedId === portal.id ? 'Copied' : 'Copy link'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
