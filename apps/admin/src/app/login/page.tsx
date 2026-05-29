'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, KeyRound, Loader2, Shield } from 'lucide-react';
import { formatPhoneFa } from '@agahiram/shared';
import { Button, Card, CardContent, Input, Label, toast } from '@agahiram/ui';
import { apiClient } from '@/lib/api';

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const rawNext = search.get('next') ?? '/';
  const next = rawNext.startsWith('/admin') ? rawNext.slice('/admin'.length) || '/' : rawNext;

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [expiresIn, setExpiresIn] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== 'code' || expiresIn <= 0) return;
    const id = setInterval(() => setExpiresIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [step, expiresIn]);

  const handleSendOtp = async () => {
    if (!/^09\d{9}$/.test(phone)) {
      toast.error('شماره معتبر نیست');
      return;
    }
    setSending(true);
    const r = await apiClient.post<{ expiresIn: number }>('/auth/otp/send', { phone });
    setSending(false);
    if (!r.success) {
      toast.error(r.error ?? 'خطا در ارسال کد');
      return;
    }
    setExpiresIn(r.data?.expiresIn ?? 120);
    setStep('code');
    setTimeout(() => codeRef.current?.focus(), 50);
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error('کد ۶ رقمی است');
      return;
    }
    setVerifying(true);
    const r = await apiClient.post<{ user: { role: string; name?: string | null } }>(
      '/auth/otp/verify',
      { phone, code },
      { silent401: true },
    );
    setVerifying(false);
    if (!r.success || !r.data) {
      toast.error(r.error ?? 'کد نادرست است');
      return;
    }
    const role = r.data.user?.role;
    if (role !== 'admin' && role !== 'moderator') {
      toast.error('این حساب اجازه‌ی دسترسی به پنل ادمین را ندارد.');
      /* clear the just-set cookies so the unauthorized user can't sit on the
       * shell behind the role gate. */
      await apiClient.post('/auth/logout');
      return;
    }
    toast.success(`خوش آمدید ${r.data.user.name ?? ''}`.trim());
    router.replace(next.startsWith('/') ? next : '/');
  };

  return (
    <div className="grid min-h-svh place-items-center bg-chrome p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="!p-7 space-y-6">
          <div className="space-y-2">
            <div className="inline-flex size-12 items-center justify-center rounded-xl gradient-brand text-white">
              <Shield className="size-6" aria-hidden />
            </div>
            <h1 className="text-h2 font-extrabold">ورود ادمین</h1>
            <p className="text-sm text-muted-foreground">
              برای ورود، شماره‌ی ادمین/ناظر را وارد کنید. کد یک‌بارمصرف از طریق پیامک ارسال می‌شود.
            </p>
          </div>

          {step === 'phone' ? (
            <div className="space-y-3">
              <Label htmlFor="phone" required>
                شماره موبایل
              </Label>
              <Input
                id="phone"
                dir="ltr"
                inputMode="tel"
                placeholder="09xxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                disabled={sending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendOtp();
                }}
              />
              <Button
                variant="brand"
                size="lg"
                className="w-full"
                onClick={handleSendOtp}
                disabled={sending || phone.length !== 11}
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <KeyRound className="size-4" />
                )}
                ارسال کد
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  کد برای {formatPhoneFa(phone)} ارسال شد
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                  onClick={() => {
                    setStep('phone');
                    setCode('');
                  }}
                >
                  <ArrowLeft className="size-3.5 rtl:rotate-180" aria-hidden />
                  ویرایش
                </button>
              </div>
              <Label htmlFor="code" required>
                کد ۶ رقمی
              </Label>
              <Input
                id="code"
                ref={codeRef}
                dir="ltr"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={verifying}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVerify();
                }}
                className="text-center text-2xl tracking-widest tabular-nums"
              />
              {expiresIn > 0 ? (
                <p className="text-xs text-muted-foreground tabular-nums">
                  کد تا {Math.floor(expiresIn / 60)}:{(expiresIn % 60).toString().padStart(2, '0')}{' '}
                  معتبر است
                </p>
              ) : (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={handleSendOtp}
                  disabled={sending}
                >
                  ارسال مجدد کد
                </button>
              )}
              <Button
                variant="brand"
                size="lg"
                className="w-full"
                onClick={handleVerify}
                disabled={verifying || code.length !== 6}
              >
                {verifying ? <Loader2 className="size-4 animate-spin" /> : null}
                تأیید و ورود
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
