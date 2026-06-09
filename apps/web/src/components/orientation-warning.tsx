'use client';

import { useEffect, useState } from 'react';
import { IgPhone } from '@agahiram/ui';

export function OrientationWarning() {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(orientation: landscape)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsLandscape(e.matches);
    handler(mql);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  if (!isLandscape) return null;

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
