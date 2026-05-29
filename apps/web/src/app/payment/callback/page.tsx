'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { Button, Card, CardContent, Spinner } from '@agahiram/ui';
import { apiClient } from '@/lib/api';

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <Spinner size="lg" label="در حال بارگذاری…" />
        </Shell>
      }
    >
      <Inner />
    </Suspense>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-svh place-items-center bg-background px-4 py-8 sm:p-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -end-32 -top-32 size-[28rem] rounded-full bg-[var(--brand-300)] opacity-20 blur-3xl" />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

function Inner() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [refId, setRefId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const auth = params.get('Authority');
    const st = params.get('Status');
    if (!auth) {
      setStatus('failed');
      setMessage('پارامترهای پرداخت نامعتبر است');
      return;
    }
    apiClient
      .get<{ success: boolean; refId?: string; message?: string }>('/payments/verify', {
        Authority: auth,
        Status: st ?? '',
      })
      .then((r) => {
        if (r.data?.success) {
          setStatus('success');
          setRefId(r.data.refId ?? null);
        } else {
          setStatus('failed');
          setMessage(r.data?.message ?? r.error ?? 'پرداخت ناموفق');
        }
      })
      .catch(() => {
        setStatus('failed');
        setMessage('ارتباط با سرویس پرداخت برقرار نشد');
      });
  }, [params]);

  return (
    <Shell>
      <Card className="border-border/60 shadow-floating">
        <CardContent className="!p-8 text-center space-y-4">
          {status === 'loading' && (
            <>
              <div className="mx-auto grid size-16 place-items-center">
                <Spinner size="xl" />
              </div>
              <h1 className="text-h3 font-bold">در حال بررسی پرداخت…</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                لطفاً چند لحظه صبر کنید.
              </p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-success/15 text-success">
                <Check className="size-8" strokeWidth={3} aria-hidden />
              </div>
              <h1 className="text-h3 font-bold text-success">پرداخت موفق</h1>
              {refId ? (
                <p
                  className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground"
                  dir="ltr"
                >
                  کد پیگیری: <span className="font-mono">{refId}</span>
                </p>
              ) : null}
              <Button variant="brand" size="lg" fullWidth onClick={() => router.push('/feed')}>
                بازگشت به آگهی‌گرام
              </Button>
            </>
          )}
          {status === 'failed' && (
            <>
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-destructive/15 text-destructive">
                <X className="size-8" strokeWidth={3} aria-hidden />
              </div>
              <h1 className="text-h3 font-bold text-destructive">پرداخت ناموفق</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="lg" fullWidth onClick={() => router.back()}>
                  تلاش مجدد
                </Button>
                <Button variant="ghost" size="lg" fullWidth onClick={() => router.push('/feed')}>
                  بازگشت
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
}
