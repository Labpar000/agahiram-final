'use client';

import { useEffect } from 'react';
import { ErrorState } from '@agahiram/ui/components/error-state';
import './globals.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      void fetch('/api/v1/_clientlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: String(error?.message ?? error),
          stack: String(error?.stack ?? ''),
          digest: error?.digest ?? null,
          url: typeof window !== 'undefined' ? window.location.href : '',
          ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        }),
        keepalive: true,
      });
    } catch {
      // ignore
    }
  }, [error]);

  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-svh bg-background font-[family-name:var(--font-vazir)] text-foreground antialiased">
        <div className="flex min-h-svh items-center justify-center px-4">
          <ErrorState
            title="یک خطای غیرمنتظره رخ داد"
            description={
              error?.digest
                ? `شناسه خطا: ${error.digest}`
                : 'مشکلی در بارگذاری صفحه پیش آمد. لطفاً دوباره تلاش کنید.'
            }
            onRetry={reset}
          />
        </div>
      </body>
    </html>
  );
}
