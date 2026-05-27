'use client';

import { useEffect } from 'react';

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
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: 16, lineHeight: 1.6 }}>
        <h1 style={{ fontSize: 18, marginBottom: 12 }}>یک خطای غیرمنتظره رخ داد</h1>
        <p style={{ marginBottom: 8 }}>
          پیام: <code>{String(error?.message ?? '')}</code>
        </p>
        {error?.digest ? (
          <p style={{ marginBottom: 8 }}>
            شناسه: <code>{error.digest}</code>
          </p>
        ) : null}
        <details style={{ marginBottom: 12 }}>
          <summary>جزئیات فنی (Stack)</summary>
          <pre
            style={{
              fontSize: 12,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              background: '#0001',
              padding: 8,
              borderRadius: 6,
            }}
          >
            {String(error?.stack ?? '')}
          </pre>
        </details>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            background: '#111',
            color: '#fff',
            border: 0,
            cursor: 'pointer',
          }}
        >
          تلاش دوباره
        </button>
      </body>
    </html>
  );
}
