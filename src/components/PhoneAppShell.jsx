import React from 'react';
import AddToHomeScreenBanner from './AddToHomeScreenBanner';
import { useAddToHomeScreen } from '../hooks/useAddToHomeScreen';

/**
 * Phone-first shell for homeowner & inspector portals (max ~430px).
 */
export default function PhoneAppShell({
  portal,
  accent = 'teal',
  children,
  className = '',
  bgClassName = 'bg-slate-50',
  showInstallBanner = true,
}) {
  const a2hs = useAddToHomeScreen(portal);
  const visible = showInstallBanner && a2hs.visible;

  return (
    <div className={`min-h-[100dvh] ${bgClassName} ${className}`}>
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col shadow-[0_0_0_1px_rgba(15,23,42,0.04)]">
        <AddToHomeScreenBanner
          visible={visible}
          onInstall={a2hs.install}
          onDismiss={a2hs.dismiss}
          accent={accent}
        />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
