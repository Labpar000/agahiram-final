'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPersianNumber } from '@agahiram/shared';
import {
  Button,
  Card,
  CardContent,
  IgCheck,
  IgUser,
  Input,
  Label,
  Textarea,
  toast,
} from '@agahiram/ui';
import { useAuth } from '@/hooks/useAuth';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading, completeProfile } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (!isLoading && user?.username) {
      router.replace(`/profile/${user.username}`);
    }
  }, [user, isLoading, router]);

  const usernameValid = /^[a-z0-9_.]{3,20}$/.test(username);
  const nameValid = name.trim().length >= 2;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameValid) return toast.error('نام را وارد کنید');
    if (!usernameValid) return toast.error('نام کاربری نامعتبر است');
    try {
      await completeProfile.mutateAsync({
        name: name.trim(),
        username,
        bio: bio.trim() || undefined,
      });
      toast.success('پروفایل ذخیره شد');
      router.push('/feed');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <Card className="overflow-hidden rounded-sm border border-border shadow-none">
      <CardContent className="!p-4 space-y-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">تکمیل پروفایل</h1>
          <p className="mt-1 text-xs text-muted-foreground">برای شروع، اطلاعات زیر را پر کنید.</p>
        </div>

        <form onSubmit={submit} className="space-y-3" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name" required>
              نام نمایشی
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً علی محمدی"
              leadingIcon={<IgUser className="size-4" strokeWidth={1.75} aria-hidden />}
              minLength={2}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" required>
              نام کاربری
            </Label>
            <Input
              id="username"
              type="text"
              dir="ltr"
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value
                    .replace(/[^a-zA-Z0-9_.]/g, '')
                    .toLowerCase()
                    .slice(0, 20),
                )
              }
              placeholder="ali_m"
              leadingIcon={<span className="text-sm font-semibold text-muted-foreground">@</span>}
              trailingIcon={
                usernameValid ? (
                  <span className="grid size-5 place-items-center rounded-full bg-success/15 text-success">
                    <IgCheck className="size-3.5" strokeWidth={2} aria-hidden />
                  </span>
                ) : null
              }
              minLength={3}
              invalid={username.length >= 3 && !usernameValid}
              required
            />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              ۳ تا ۲۰ کاراکتر — فقط حروف انگلیسی، اعداد، نقطه و زیرخط.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bio">بیو</Label>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {formatPersianNumber(bio.length)}/{formatPersianNumber(150)}
              </span>
            </div>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="درباره خودتان بنویسید…"
              rows={3}
              maxLength={150}
              autoGrow
            />
          </div>

          <Button
            type="submit"
            size="sm"
            fullWidth
            className="btn-ig-link h-8 rounded-lg text-sm font-semibold"
            isLoading={completeProfile.isPending}
            disabled={!nameValid || !usernameValid}
          >
            شروع کنید
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
