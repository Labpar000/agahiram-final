'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Spinner, toast } from '@agahiram/ui';
import { alertExploreHref, alertSummaryLabel } from '@/lib/search-alert-utils';
import { registerWebPush } from '@/lib/web-push';
import { isWebPushSubscribed, unregisterWebPush } from '@/lib/web-push-unregister';
import { SettingsHeader } from '@/features/settings/components/settings-header';
import { SettingsSection } from '@/features/settings/components/settings-section';
import { SettingsToggleRow } from '@/features/settings/components/settings-toggle-row';
import { useNotificationPreferences } from '@/features/settings/hooks/useNotificationPreferences';
import { useSearchAlerts } from '@/features/settings/hooks/useSearchAlerts';

export default function NotificationSettingsPage() {
  const { data: prefs, isLoading, update } = useNotificationPreferences();
  const { data: alerts, isLoading: alertsLoading, remove } = useSearchAlerts();
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const pushDenied = typeof Notification !== 'undefined' && Notification.permission === 'denied';

  useEffect(() => {
    void isWebPushSubscribed().then(setPushEnabled);
  }, []);

  const togglePushMaster = async (enabled: boolean) => {
    setPushBusy(true);
    try {
      if (enabled) {
        const ok = await registerWebPush();
        if (!ok) {
          toast.error('فعال‌سازی اعلان push ممکن نشد');
          setPushEnabled(false);
          return;
        }
        setPushEnabled(true);
        toast.success('اعلان push فعال شد');
      } else {
        await unregisterWebPush();
        setPushEnabled(false);
        toast.success('اعلان push غیرفعال شد');
      }
    } catch {
      toast.error('خطا در تغییر وضعیت push');
    } finally {
      setPushBusy(false);
    }
  };

  const togglePref = (key: keyof NonNullable<typeof prefs>, value: boolean) => {
    update.mutate({ [key]: value }, { onError: () => toast.error('خطا در ذخیره تنظیمات') });
  };

  if (isLoading || pushEnabled === null) {
    return (
      <div className="bg-background min-h-svh">
        <SettingsHeader title="اعلان‌ها" />
        <div className="flex justify-center py-16">
          <Spinner className="size-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-svh pb-8">
      <SettingsHeader title="اعلان‌ها" />

      <div className="mx-auto max-w-2xl space-y-6 p-4">
        <SettingsSection label="اعلان push">
          <SettingsToggleRow
            label="فعال‌سازی اعلان push"
            description={
              pushDenied
                ? 'دسترسی اعلان در مرورگر مسدود شده — از تنظیمات مرورگر فعال کنید'
                : 'دریافت اعلان روی این دستگاه'
            }
            checked={pushEnabled}
            disabled={pushBusy || pushDenied}
            onCheckedChange={(v) => void togglePushMaster(v)}
          />
        </SettingsSection>

        <SettingsSection label="انواع اعلان" description="فقط وقتی push فعال باشد ارسال می‌شود">
          <SettingsToggleRow
            label="لایک‌ها"
            checked={prefs?.likesPush ?? true}
            disabled={!pushEnabled || update.isPending}
            onCheckedChange={(v) => togglePref('likesPush', v)}
          />
          <SettingsToggleRow
            label="کامنت‌ها"
            checked={prefs?.commentsPush ?? true}
            disabled={!pushEnabled || update.isPending}
            onCheckedChange={(v) => togglePref('commentsPush', v)}
          />
          <SettingsToggleRow
            label="فالو"
            checked={prefs?.followsPush ?? true}
            disabled={!pushEnabled || update.isPending}
            onCheckedChange={(v) => togglePref('followsPush', v)}
          />
          <SettingsToggleRow
            label="پیام‌ها"
            checked={prefs?.messagesPush ?? true}
            disabled={!pushEnabled || update.isPending}
            onCheckedChange={(v) => togglePref('messagesPush', v)}
          />
        </SettingsSection>

        <SettingsSection label="اعلان‌های جستجو">
          {alertsLoading ? (
            <div className="flex justify-center py-6">
              <Spinner className="size-6" />
            </div>
          ) : alerts && alerts.length > 0 ? (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0"
              >
                <Link href={alertExploreHref(alert)} className="min-w-0 flex-1 tap-none">
                  <p className="truncate text-sm font-medium">{alertSummaryLabel(alert)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(alert.createdAt).toLocaleDateString('fa-IR')} — مشاهده نتایج
                  </p>
                </Link>
                <button
                  type="button"
                  className="shrink-0 text-xs text-destructive hover:underline"
                  disabled={remove.isPending}
                  onClick={() =>
                    remove.mutate(alert.id, {
                      onSuccess: () => toast.success('اعلان حذف شد'),
                      onError: () => toast.error('خطا در حذف'),
                    })
                  }
                >
                  حذف
                </button>
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              اعلان جستجوی فعالی ندارید
            </p>
          )}
        </SettingsSection>

        <SettingsSection label="سایر اعلان‌ها">
          <div className="space-y-2 px-4 py-3.5 text-[11px] text-muted-foreground">
            <p>اعلان‌های تماس، سیستم، کیف پول و آگهی بدون تنظیم جداگانه ارسال می‌شوند.</p>
            <p>اعلان ایمیل به‌زودی اضافه می‌شود.</p>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
