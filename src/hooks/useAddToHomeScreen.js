import { useCallback, useEffect, useState } from 'react';

function storageKey(portal, kind) {
  return `siteverify_a2hs_${kind}_${portal}`;
}

function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    // iOS Safari
    window.navigator.standalone === true
  );
}

/**
 * Add-to-home-screen state for homeowner / inspector PWAs.
 * Hidden after install, or after user taps close (persisted).
 */
export function useAddToHomeScreen(portal) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!portal) return;

    if (isStandaloneDisplay() || localStorage.getItem(storageKey(portal, 'installed')) === '1') {
      setVisible(false);
      return;
    }
    if (localStorage.getItem(storageKey(portal, 'dismissed')) === '1') {
      setVisible(false);
      return;
    }

    setVisible(true);

    const onBip = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      localStorage.setItem(storageKey(portal, 'installed'), '1');
      localStorage.removeItem(storageKey(portal, 'dismissed'));
      setDeferredPrompt(null);
      setVisible(false);
    };

    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [portal]);

  const dismiss = useCallback(() => {
    if (!portal) return;
    localStorage.setItem(storageKey(portal, 'dismissed'), '1');
    setVisible(false);
  }, [portal]);

  const install = useCallback(async () => {
    if (!portal) return;

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === 'accepted') {
        localStorage.setItem(storageKey(portal, 'installed'), '1');
        setVisible(false);
      }
      return;
    }

    // iOS / browsers without beforeinstallprompt — guide once, then treat as dismissed
    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const tip = isIOS
      ? 'On iPhone: tap Share, then “Add to Home Screen”.'
      : 'Use your browser menu → “Add to Home screen” / “Install app”.';
    window.alert(tip);
  }, [deferredPrompt, portal]);

  return { visible, install, dismiss, canPrompt: !!deferredPrompt };
}
