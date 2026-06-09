'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Spinner, toast } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { patchAuthUser } from '@/lib/query-cache-profile';
import { SettingsHeader } from '@/features/settings/components/settings-header';
import { SettingsSection } from '@/features/settings/components/settings-section';
import { SettingsToggleRow } from '@/features/settings/components/settings-toggle-row';
import { UserListItem } from '@/features/settings/components/user-list-item';
import { useBlockedUsers } from '@/features/settings/hooks/useBlockedUsers';
import { useStoryPrivacy } from '@/features/settings/hooks/useStoryPrivacy';

export default function PrivacySettingsPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (user) setIsPrivate(user.isPrivate ?? false);
  }, [user]);

  const { data: blocked, isLoading: blockedLoading, unblock } = useBlockedUsers();
  const { mutesQuery, hiddenQuery, unmute, unhide } = useStoryPrivacy();

  const privateMutation = useMutation({
    mutationFn: async (value: boolean) => {
      const res = await apiClient.patch('/users/me', { isPrivate: value });
      if (!res.success) throw new Error(res.error ?? 'خطا');
      return value;
    },
    onSuccess: (value) => {
      patchAuthUser(qc, { isPrivate: value });
      toast.success(value ? 'حساب خصوصی شد' : 'حساب عمومی شد');
    },
    onError: () => toast.error('خطا در ذخیره تنظیمات'),
  });

  const handlePrivateToggle = (value: boolean) => {
    setIsPrivate(value);
    privateMutation.mutate(value, {
      onError: () => setIsPrivate(!value),
    });
  };

  return (
    <div className="bg-background min-h-svh pb-8">
      <SettingsHeader title="حریم خصوصی" />

      <div className="mx-auto max-w-2xl space-y-6 p-4">
        <SettingsSection label="حساب">
          <SettingsToggleRow
            label="حساب خصوصی"
            description="فقط فالوورهای تأییدشده پست‌های شما را می‌بینند"
            checked={isPrivate}
            disabled={privateMutation.isPending}
            onCheckedChange={handlePrivateToggle}
          />
        </SettingsSection>

        <SettingsSection label="کاربران مسدود">
          {blockedLoading ? (
            <div className="flex justify-center py-6">
              <Spinner className="size-6" />
            </div>
          ) : blocked && blocked.length > 0 ? (
            blocked.map((u) => (
              <UserListItem
                key={u.id}
                user={u}
                actionLabel="رفع مسدودیت"
                isLoading={unblock.isPending}
                onAction={() =>
                  u.username &&
                  unblock.mutate(u.username, {
                    onSuccess: () => toast.success('مسدودیت برداشته شد'),
                    onError: () => toast.error('خطا'),
                  })
                }
              />
            ))
          ) : (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              کاربر مسدودی ندارید
            </p>
          )}
        </SettingsSection>

        <SettingsSection label="استوری‌های بی‌صدا">
          {mutesQuery.isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner className="size-6" />
            </div>
          ) : mutesQuery.data && mutesQuery.data.length > 0 ? (
            mutesQuery.data.map((u) => (
              <UserListItem
                key={u.id}
                user={u}
                actionLabel="رفع بی‌صدا"
                isLoading={unmute.isPending}
                onAction={() =>
                  unmute.mutate(u.id, {
                    onSuccess: () => toast.success('بی‌صدا برداشته شد'),
                    onError: () => toast.error('خطا'),
                  })
                }
              />
            ))
          ) : (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              استوری بی‌صدایی ندارید
            </p>
          )}
        </SettingsSection>

        <SettingsSection label="مخفی از" description="کاربرانی که استوری شما از آن‌ها مخفی است">
          {hiddenQuery.isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner className="size-6" />
            </div>
          ) : hiddenQuery.data && hiddenQuery.data.length > 0 ? (
            hiddenQuery.data.map((u) => (
              <UserListItem
                key={u.id}
                user={u}
                actionLabel="نمایش مجدد"
                isLoading={unhide.isPending}
                onAction={() =>
                  unhide.mutate(u.id, {
                    onSuccess: () => toast.success('استوری دوباره نمایش داده می‌شود'),
                    onError: () => toast.error('خطا'),
                  })
                }
              />
            ))
          ) : (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              کاربری در لیست مخفی نیست
            </p>
          )}
        </SettingsSection>
      </div>
    </div>
  );
}
