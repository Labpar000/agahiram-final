'use client';

import { Button } from '@agahiram/ui';
import { useAuth } from '@/hooks/useAuth';
import { SettingsHeader } from '@/features/settings/components/settings-header';
import { SettingsSection } from '@/features/settings/components/settings-section';

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  const last4 = digits.slice(-4);
  return `09** ***${last4}`;
}

export default function SecuritySettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="bg-background min-h-svh pb-8">
      <SettingsHeader title="امنیت" />

      <div className="mx-auto max-w-2xl space-y-6 p-4">
        <SettingsSection label="اطلاعات ورود">
          <div className="space-y-3 px-4 py-3.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">شماره موبایل</span>
              <span dir="ltr" className="font-medium">
                {user?.phone ? maskPhone(user.phone) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">روش ورود</span>
              <span className="font-medium">کد یکبار مصرف (OTP)</span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              برای تغییر شماره موبایل با پشتیبانی تماس بگیرید:{' '}
              <a href="mailto:support@agahiram.ir" className="text-primary hover:underline">
                support@agahiram.ir
              </a>
            </p>
          </div>
        </SettingsSection>

        <SettingsSection label="نشست‌ها">
          <div className="px-4 py-3.5">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void logout()}
            >
              خروج از حساب
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection label="حذف حساب">
          <div className="space-y-3 px-4 py-3.5">
            <p className="text-sm text-muted-foreground">
              با حذف حساب، تمام اطلاعات شما به‌طور دائمی پاک می‌شود.
            </p>
            <Button type="button" variant="destructive" className="w-full" disabled>
              حذف حساب — به‌زودی
            </Button>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
