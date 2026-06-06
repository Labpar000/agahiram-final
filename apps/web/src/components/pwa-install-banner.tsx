'use client';

import { useEffect, useState } from 'react';
import { Button } from '@agahiram/ui';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa_install_dismissed';
const VISIT_KEY = 'pwa_visit_count';

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
}

function isPwaStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  return 'standalone' in navigator && (navigator as Record<string, unknown>).standalone === true;
}

export function PwaInstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosMode, setIosMode] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (isPwaStandalone()) return;

    const ios = isIOS();
    setIosMode(ios);

    const visits = Number(localStorage.getItem(VISIT_KEY) ?? '0') + 1;
    localStorage.setItem(VISIT_KEY, String(visits));

    // iOS shows guidance immediately (no deferred prompt); Chromium waits for BIP
    if (ios && visits >= 3) {
      const timer = window.setTimeout(() => setVisible(true), 120_000);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      if (visits >= 3) setVisible(true);
    }, 120_000);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (visits >= 3) setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onBip);
    };
  }, []);

  // Chromium: only show when deferred prompt is available
  // iOS: show whenever visible (deferred is always null on iOS)
  if (!visible || (!iosMode && !deferred)) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-3 z-30 mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-floating"
      style={{
        bottom: 'calc(var(--bottom-nav) + var(--safe-bottom) + 1rem)',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <img src="/icons/icon-192.png" alt="" className="pointer-events-auto size-12 rounded-xl" />
      <div className="pointer-events-auto min-w-0 flex-1">
        <p className="text-sm font-semibold">افزودن به صفحه اصلی</p>
        {iosMode ? (
          <p className="text-xs text-muted-foreground">
            دکمه Share و سپس Add to Home Screen را بزنید
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">دسترسی سریع‌تر به آگهیرام</p>
        )}
      </div>
      {iosMode ? (
        <Button
          size="sm"
          variant="ghost"
          className="pointer-events-auto shrink-0"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, '1');
            setVisible(false);
          }}
        >
          بستن
        </Button>
      ) : (
        <>
          <Button
            size="sm"
            variant="brand"
            className="pointer-events-auto shrink-0"
            onClick={async () => {
              await deferred!.prompt();
              setVisible(false);
            }}
          >
            نصب
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="pointer-events-auto shrink-0"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, '1');
              setVisible(false);
            }}
          >
            بعداً
          </Button>
        </>
      )}
    </div>
  );
}
