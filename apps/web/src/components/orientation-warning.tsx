'use client';

import { useEffect, useState } from 'react';
import { IgPhone } from '@agahiram/ui';

function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent);
}

export function OrientationWarning() {
  const [isLandscape, setIsLandscape] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!isMobileDevice()) return;

    setIsMobile(true);

    const mql = window.matchMedia('(orientation: landscape)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsLandscape(e.matches);
    handler(mql);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  if (!isMobile || !isLandscape) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-background/95 backdrop-blur-sm">
      <div className="animate-pulse">
        <IgPhone className="size-16 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <p className="text-base font-semibold">لطفاً گوشی را عمودی نگه دارید</p>
      <p className="text-sm text-muted-foreground">آگهی‌گرام فقط در حالت عمودی قابل استفاده است</p>
    </div>
  );
}
