import React, { useState, useRef, useEffect } from 'react';
import {
  signIn,
  sendPhoneOtp,
  verifyPhoneOtp,
  formatPhoneIndian,
} from '../services/authService';
import { DEMO_ACCOUNTS, getDemoAccount, isDemoMode } from '../data/demoAccounts';
import { canUseDemoBypass } from '../services/demoAuthService';

const PORTAL_CONFIG = {
  homeowner: {
    title: 'Homeowner',
    icon: '🏠',
    accent: 'teal',
    useOtp: true,
    role: 'homeowner',
  },
  inspector: {
    title: 'Inspector',
    icon: '🔍',
    accent: 'amber',
    useOtp: true,
    role: 'inspector',
  },
  admin: {
    title: 'Admin',
    icon: '👑',
    accent: 'indigo',
    useOtp: false,
    role: 'admin',
  },
};

const accentClasses = {
  teal: {
    bg: 'bg-teal-500',
    hover: 'hover:bg-teal-400',
    ring: 'focus:ring-teal-500',
  },
  amber: {
    bg: 'bg-amber-500',
    hover: 'hover:bg-amber-400',
    ring: 'focus:ring-amber-500',
  },
  indigo: {
    bg: 'bg-indigo-500',
    hover: 'hover:bg-indigo-400',
    ring: 'focus:ring-indigo-500',
  },
};

function OtpInput({ value, onChange, accent }) {
  const inputs = useRef([]);
  const digits = value.padEnd(6, ' ').split('').slice(0, 6);

  const setDigit = (index, char) => {
    const d = char.replace(/\D/g, '').slice(-1);
    const arr = value.split('');
    arr[index] = d;
    const next = arr.join('').slice(0, 6);
    onChange(next);
    if (d && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index]?.trim() && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`w-11 h-12 text-center text-lg font-black bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 ${accent.ring}`}
        />
      ))}
    </div>
  );
}

function DemoHint({ portal, onUseDemo, instant, compact }) {
  const demo = getDemoAccount(portal);
  if (!demo) return null;

  if (portal === 'admin') {
    return (
      <div className={`mb-5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-2 ${compact ? 'mb-4' : ''}`}>
        <p className="font-bold text-slate-300">Demo testing</p>
        {!compact && <p>Email: <span className="text-slate-200">{demo.email}</span></p>}
        <button
          type="button"
          onClick={onUseDemo}
          className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-black"
        >
          Enter demo
        </button>
      </div>
    );
  }

  return (
    <div className={`mb-5 p-4 rounded-xl bg-teal-950/40 border border-teal-500/30 text-xs text-slate-300 space-y-2 ${compact ? 'mb-4' : ''}`}>
      <p className="font-black text-teal-300 text-sm">Test without OTP</p>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        OTP not working? Tap below to open the {portal === 'homeowner' ? 'homeowner' : 'inspector'} portal instantly.
      </p>
      {!compact && (
        <p className="text-[10px] text-slate-500">
          Demo account: <span className="text-slate-300">{demo.fullName}</span> · +91 {demo.phone}
        </p>
      )}
      <button
        type="button"
        onClick={onUseDemo}
        className={`w-full py-3 rounded-xl font-black text-slate-900 transition-all ${
          portal === 'homeowner'
            ? 'bg-teal-400 hover:bg-teal-300'
            : 'bg-amber-400 hover:bg-amber-300'
        }`}
      >
        {instant ? 'Enter demo' : 'Use demo login'}
      </button>
    </div>
  );
}

function PhoneOtpAuth({ config, accent, onAuthenticated, onDemoLogin, portal }) {
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const e164 = formatPhoneIndian(phone);

  async function handleSendOtp(e) {
    e?.preventDefault();
    setError('');
    if (!e164) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    if (!fullName.trim()) {
      setError('Enter your name');
      return;
    }
    setLoading(true);
    try {
      await sendPhoneOtp({
        phone: e164,
        fullName: fullName.trim(),
        role: config.role,
      });
      setStep('otp');
      setOtp('');
      setResendIn(30);
    } catch (err) {
      setError(err.message || 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');
    if (!e164) return;
    if (otp.replace(/\D/g, '').length !== 6) {
      setError('Enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      await verifyPhoneOtp({ phone: e164, token: otp });
      await onAuthenticated?.();
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  const demo = getDemoAccount(portal);

  function applyDemo() {
    if (!demo) return;
    setPhone(demo.phone);
    setFullName(demo.fullName);
    setOtp(demo.otp);
    setError('');
    setStep('phone');
  }

  async function applyDemoAndSend() {
    applyDemo();
    setLoading(true);
    setError('');
    try {
      const e164Phone = formatPhoneIndian(demo.phone);
      await sendPhoneOtp({
        phone: e164Phone,
        fullName: demo.fullName,
        role: config.role,
      });
      setStep('otp');
      setOtp(demo.otp);
      setResendIn(30);
    } catch (err) {
      setError(err.message || 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  }

  const instantDemo = canUseDemoBypass();
  const light = portal === 'homeowner';
  const fieldClass = light
    ? `w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]`
    : `w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 ${accent.ring}`;
  const prefixClass = light
    ? 'px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 font-bold'
    : 'px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-300 font-bold';
  const btnClass = light
    ? 'w-full py-3 rounded-xl text-sm font-bold text-white bg-[#1D9E75] hover:bg-[#177e5e] disabled:opacity-50 transition-all'
    : `w-full py-3 rounded-xl text-sm font-black text-slate-900 transition-all ${accent.bg} ${accent.hover} disabled:opacity-50`;

  async function handleDemoLogin() {
    if (!instantDemo || !onDemoLogin) return;
    setLoading(true);
    setError('');
    try {
      onDemoLogin(portal);
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {isDemoMode() && (
        <DemoHint
          portal={portal}
          instant={instantDemo}
          compact={step === 'otp'}
          onUseDemo={instantDemo ? handleDemoLogin : applyDemoAndSend}
        />
      )}

      {step === 'phone' && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <p className="text-xs text-slate-500 text-center -mt-2 mb-2">
            OTP only needed once. You stay logged in after that.
          </p>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Full name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={fieldClass}
              placeholder="Your name"
            />
          </div>

          <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Mobile number
              </label>
              <div className="flex gap-2">
                <span className={prefixClass}>
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className={fieldClass.replace('w-full ', 'flex-1 ')}
                  placeholder="9876543210"
                />
              </div>
            </div>

            {error && (
              <p className={`text-xs rounded-lg px-3 py-2 ${light ? 'text-rose-700 bg-rose-50 border border-rose-100' : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'}`}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={btnClass}
            >
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <p className={`text-center text-xs ${light ? 'text-slate-500' : 'text-slate-400'}`}>
            OTP sent to <span className={`font-bold ${light ? 'text-[#085041]' : 'text-slate-200'}`}>+91 {phone}</span>
          </p>
          {isDemoMode() && instantDemo && (
            <p className="text-center text-[10px] text-teal-400/90 font-medium">
              OTP not working? Use <strong>Enter demo</strong> above.
            </p>
          )}

          <OtpInput value={otp} onChange={setOtp} accent={accent} />

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || otp.replace(/\D/g, '').length !== 6}
            className={btnClass}
          >
            {loading ? 'Verifying…' : 'Verify & continue'}
          </button>

          <div className="flex justify-between text-xs">
            <button
              type="button"
              onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
              className="text-slate-500 hover:text-slate-300"
            >
              Change number
            </button>
            <button
              type="button"
              disabled={resendIn > 0 || loading}
              onClick={handleSendOtp}
              className="text-slate-500 hover:text-slate-300 disabled:opacity-40"
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP'}
            </button>
          </div>
        </form>
      )}
    </>
  );
}

function AdminPasswordAuth({ accent, onAuthenticated, onDemoLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function applyDemo() {
    if (canUseDemoBypass() && onDemoLogin) {
      onDemoLogin('admin');
      return;
    }
    const demo = DEMO_ACCOUNTS.admin;
    setEmail(demo.email);
    setPassword(demo.password);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn({ email: email.trim(), password });
      await onAuthenticated?.();
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {isDemoMode() && (
        <DemoHint portal="admin" instant={canUseDemoBypass()} onUseDemo={applyDemo} />
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 ${accent.ring}`}
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 ${accent.ring}`}
        />
      </div>
      {error && (
        <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className={`w-full py-3 rounded-xl text-sm font-black text-slate-900 transition-all ${accent.bg} ${accent.hover} disabled:opacity-50`}
      >
        {loading ? 'Please wait…' : 'Log in'}
      </button>
    </form>
    </>
  );
}

export default function PortalAuth({ portal, onAuthenticated, onDemoLogin, userRole, onSignOut }) {
  const config = PORTAL_CONFIG[portal];
  const accent = accentClasses[config.accent];

  if (userRole && userRole !== config.role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-sm w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <h1 className="text-lg font-black text-white">Wrong account</h1>
          <button
            onClick={onSignOut}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 ${
        portal === 'homeowner' ? 'bg-[#F8F8F6]' : 'bg-slate-950'
      }`}
    >
      <div
        className={`max-w-md w-full rounded-2xl p-8 ${
          portal === 'homeowner'
            ? 'bg-white border border-slate-200 shadow-sm'
            : 'bg-slate-900 border border-slate-800'
        }`}
      >
        <div className="text-center mb-8">
          {portal === 'homeowner' ? (
            <>
              <p className="text-[12px] font-medium text-[#1D9E75] uppercase tracking-widest">SiteVerify</p>
              <h1 className="text-[22px] font-medium text-[#085041] mt-2">Your home. Verified.</h1>
              <p className="text-[14px] text-slate-500 mt-2 leading-[1.6]">
                Sign in with your phone. No password to remember.
              </p>
            </>
          ) : (
            <>
              <span className="text-4xl">{config.icon}</span>
              <h1 className="text-xl font-black text-white mt-3">{config.title}</h1>
            </>
          )}
        </div>

        {config.useOtp ? (
          <PhoneOtpAuth
            portal={portal}
            config={config}
            accent={accent}
            onAuthenticated={onAuthenticated}
            onDemoLogin={onDemoLogin}
          />
        ) : (
          <AdminPasswordAuth
            accent={accent}
            onAuthenticated={onAuthenticated}
            onDemoLogin={onDemoLogin}
          />
        )}

        {portal === 'homeowner' && (
          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
            {[
              'Certified engineers',
              'Bank-grade reports',
              'Independent — no contractor ties',
            ].map((line) => (
              <p key={line} className="text-[11px] text-slate-500 leading-snug font-medium">
                {line}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
