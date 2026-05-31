'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
import { Button } from '@agahiram/ui';

const DISMISS_KEY = 'pwa_install_dismissed';
const VISIT_KEY = 'pwa_visit_count';

export function PwaInstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const visits = Number(localStorage.getItem(VISIT_KEY) ?? '0') + 1;
    localStorage.setItem(VISIT_KEY, String(visits));

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

  if (!visible || !deferred) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(var(--bottom-nav)+var(--safe-bottom)+0.5rem)] z-50 flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-floating">
      <img src="/icons/icon-192.png" alt="" className="size-12 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">افزودن به صفحه اصلی</p>
        <p className="text-xs text-muted-foreground">دسترسی سریع‌تر به آگهی‌گرام</p>
      </div>
      <Button
        size="sm"
        variant="brand"
        onClick={async () => {
          await deferred.prompt();
          setVisible(false);
        }}
      >
        نصب
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, '1');
          setVisible(false);
        }}
      >
        بعداً
      </Button>
    </div>
  );
}
