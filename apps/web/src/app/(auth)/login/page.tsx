'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Camera, ChevronLeft } from 'lucide-react';
import {
  formatPersianNumber,
  formatPhoneFa,
  toLatinDigits,
  toPersianDigits,
} from '@agahiram/shared';
import { Button, Card, CardContent, Input, Label, toast } from '@agahiram/ui';
import { useAuth } from '@/hooks/useAuth';
import { OtpInput } from '@/components/otp-input';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const { sendOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = (seconds: number) => {
    setSecondsLeft(seconds);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const phoneIsValid = /^09\d{9}$/.test(phone);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneIsValid) {
      toast.error('شماره موبایل نامعتبر است');
      return;
    }
    try {
      await sendOtp.mutateAsync({ phone });
      setStep('otp');
      startCountdown(120);
      toast.success('کد تأیید ارسال شد');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0) return;
    try {
      await sendOtp.mutateAsync({ phone });
      startCountdown(120);
      toast.success('کد جدید ارسال شد');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleVerify = async (codeOverride?: string) => {
    if (isVerifying || verifyOtp.isPending) return;
    const finalCode = codeOverride ?? code;
    if (finalCode.length !== 6) {
      toast.error('کد ۶ رقمی را وارد کنید');
      return;
    }
    setIsVerifying(true);
    try {
      const res = await verifyOtp.mutateAsync({ phone, code: finalCode });
      const data = res?.data as { isNewUser?: boolean } | undefined;
      const redirect = params.get('redirect') ?? '/feed';
      const target = data?.isNewUser ? '/onboarding' : redirect;
      // Full reload guarantees: fresh JS bundle (in case of stale SW),
      // clean React state, and that the new accessToken cookie is read by
      // the middleware on the next request. router.push has occasionally
      // appeared to "hang" when the SW served stale assets.
      if (typeof window !== 'undefined') {
        window.location.assign(target);
      } else {
        router.replace(target);
      }
    } catch (err) {
      toast.error((err as Error).message);
      setCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timerLabel = `${toPersianDigits(mins.toString().padStart(2, '0'))}:${toPersianDigits(secs.toString().padStart(2, '0'))}`;

  return (
    <Card className="overflow-hidden border-border/60 shadow-floating">
      <CardContent className="!p-7 sm:!p-8">
        <div className="flex flex-col items-center gap-3 pb-6 text-center">
          <div className="grid size-16 place-items-center rounded-2xl gradient-brand shadow-glow">
            <Camera className="size-9 text-white" strokeWidth={2.4} aria-hidden />
          </div>
          <h1 className="text-h2 font-extrabold tracking-tight">آگهی‌گرام</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            به جامعه‌ای از کاربران و فروشندگان بپیوندید
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="phone">شماره موبایل</Label>
              <Input
                id="phone"
                type="tel"
                dir="ltr"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="0912 345 6789"
                value={phone}
                onChange={(e) =>
                  setPhone(toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, 11))
                }
                className="h-12 text-center text-lg tracking-wider tabular-nums"
                aria-invalid={phone.length === 11 && !phoneIsValid ? true : undefined}
                required
              />
            </div>
            <Button
              type="submit"
              variant="brand"
              size="lg"
              fullWidth
              isLoading={sendOtp.isPending}
              disabled={!phoneIsValid}
              rightIcon={<ArrowRight className="size-5" aria-hidden />}
            >
              ارسال کد تأیید
            </Button>
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              با ورود،{' '}
              <Link
                href="/terms"
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                شرایط استفاده
              </Link>{' '}
              و{' '}
              <Link
                href="/privacy"
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                سیاست حریم خصوصی
              </Link>{' '}
              آگهی‌گرام را می‌پذیرید.
            </p>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleVerify();
            }}
            className="space-y-5"
            noValidate
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label>کد تأیید</Label>
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setCode('');
                  }}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronLeft className="size-3.5" aria-hidden /> تغییر شماره
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                کد ۶ رقمی ارسال‌شده به{' '}
                <span className="font-medium text-foreground" dir="ltr">
                  {formatPhoneFa(phone)}
                </span>{' '}
                را وارد کنید.
              </p>
              <OtpInput
                value={code}
                onChange={setCode}
                onComplete={(v) => {
                  if (!isVerifying) void handleVerify(v);
                }}
                autoFocus
                invalid={code.length === 6 && verifyOtp.isError}
              />
            </div>

            <Button
              type="submit"
              variant="brand"
              size="lg"
              fullWidth
              isLoading={isVerifying || verifyOtp.isPending}
              disabled={code.length !== 6 || isVerifying || verifyOtp.isPending}
            >
              تأیید و ورود
            </Button>

            <div className="flex items-center justify-between text-xs">
              {secondsLeft > 0 ? (
                <span className="text-muted-foreground tabular-nums">
                  ارسال مجدد در {timerLabel}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleResend()}
                  className="rounded-full px-2 py-1 font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  ارسال مجدد کد
                </button>
              )}
              <span className="text-muted-foreground">
                {formatPersianNumber(code.length)} از {formatPersianNumber(6)}
              </span>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
