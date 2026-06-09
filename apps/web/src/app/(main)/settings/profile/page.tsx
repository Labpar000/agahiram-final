'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  IgGallery,
  Input,
  Label,
  Textarea,
  toast,
} from '@agahiram/ui';
import { usernameSchema } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { uploadToMinio } from '@/lib/upload-media';
import { useAuthStore } from '@/lib/auth-store';
import { useUserPreferences } from '@/lib/user-preferences.store';
import { patchAuthUser, patchProfileQuery } from '@/lib/query-cache-profile';
import { CityLocationPicker } from '@/components/search-filters';
import { SettingsHeader } from '@/features/settings/components/settings-header';
import { SettingsSection } from '@/features/settings/components/settings-section';
import { SettingsToggleRow } from '@/features/settings/components/settings-toggle-row';

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setDefaultCity = useUserPreferences((s) => s.setDefaultCity);
  const clearDefaultCity = useUserPreferences((s) => s.clearDefaultCity);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [cityId, setCityId] = useState<string | null>(null);
  const [provinceId, setProvinceId] = useState<string | null>(null);
  const [storyArchiveEnabled, setStoryArchiveEnabled] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (user && !initialized) {
      setName(user.name ?? '');
      setUsername(user.username ?? '');
      setBio(user.bio ?? '');
      setWebsite(user.website ?? '');
      setCityId(user.defaultCityId ?? null);
      setStoryArchiveEnabled(user.storyArchiveEnabled ?? true);
      setInitialized(true);
    }
  }, [user, initialized]);

  const debouncedUsername = useDebouncedValue(username, 400);

  const usernameAvailability = useQuery({
    queryKey: ['username-availability', debouncedUsername],
    queryFn: async () => {
      const res = await apiClient.get<{ available: boolean }>('/users/username/availability', {
        username: debouncedUsername,
      });
      return res.data?.available ?? false;
    },
    enabled:
      debouncedUsername.length >= 3 &&
      debouncedUsername !== user?.username &&
      usernameSchema.safeParse(debouncedUsername).success,
  });

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      setAvatarUploading(true);
      const presign = await apiClient.post<{ uploadUrl: string; key: string }>('/media/presign', {
        folder: 'avatars',
        contentType: file.type,
        extension: file.name.split('.').pop(),
      });
      if (!presign.success || !presign.data) throw new Error('خطا در دریافت لینک آپلود');
      const put = await uploadToMinio(presign.data.uploadUrl, file, file.type);
      if (!put.ok) throw new Error('آپلود ناموفق');
      await apiClient.post('/media/confirm', { key: presign.data.key });
      const update = await apiClient.patch('/users/me', { avatarKey: presign.data.key });
      if (!update.success) throw new Error(update.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('آواتار با موفقیت به‌روزرسانی شد');
      void qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (e) => toast.error((e as Error).message),
    onSettled: () => setAvatarUploading(false),
  });

  const profileMutation = useMutation({
    mutationFn: async () => {
      const r = await apiClient.patch('/users/me', {
        name,
        username,
        bio,
        website: website.trim() || '',
        defaultCityId: cityId,
        storyArchiveEnabled,
      });
      if (!r.success) throw new Error(r.error ?? 'خطا');
      return r.data;
    },
    onSuccess: () => {
      toast.success('پروفایل به‌روزرسانی شد');
      patchAuthUser(qc, {
        name,
        username,
        bio,
        website: website.trim() || null,
        defaultCityId: cityId,
        storyArchiveEnabled,
      });
      if (user?.username) {
        patchProfileQuery(qc, user.username, { name, username });
      }
      if (cityId && provinceId) {
        setDefaultCity(cityId, provinceId);
      } else if (!cityId) {
        clearDefaultCity();
      }
      router.back();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const usernameParse = usernameSchema.safeParse(username);
  const usernameTaken =
    debouncedUsername !== user?.username &&
    usernameAvailability.data === false &&
    !usernameAvailability.isLoading;

  const isDirty = useMemo(() => {
    if (!user) return false;
    return (
      name !== (user.name ?? '') ||
      username !== (user.username ?? '') ||
      bio !== (user.bio ?? '') ||
      website !== (user.website ?? '') ||
      cityId !== (user.defaultCityId ?? null) ||
      storyArchiveEnabled !== (user.storyArchiveEnabled ?? true)
    );
  }, [user, name, username, bio, website, cityId, storyArchiveEnabled]);

  const canSave =
    usernameParse.success &&
    !usernameTaken &&
    name.trim().length >= 2 &&
    isDirty &&
    !profileMutation.isPending;

  return (
    <div className="bg-background min-h-svh pb-8">
      <SettingsHeader title="ویرایش پروفایل" />

      <div className="mx-auto max-w-2xl space-y-5 p-4">
        <Card>
          <CardContent className="!p-5">
            <div className="flex items-center gap-4">
              <label className="relative inline-flex cursor-pointer">
                <Avatar size="lg" ring="brand" verified={user?.isVerified ?? false}>
                  {user?.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
                  <AvatarFallback>{(user?.username ?? '?').slice(0, 2)}</AvatarFallback>
                </Avatar>
                <span className="pointer-events-none absolute -bottom-1 -end-1 grid size-7 place-items-center rounded-full bg-foreground text-background shadow-md">
                  <IgGallery className="size-4" strokeWidth={1.75} aria-hidden />
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 z-10 cursor-pointer opacity-0"
                  disabled={avatarUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void avatarMutation.mutate(file);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{user?.name ?? user?.username ?? 'مهمان'}</p>
                <p className="text-xs text-muted-foreground">@{user?.username ?? '—'}</p>
                {avatarUploading ? (
                  <p className="mt-1 text-[11px] text-primary">در حال آپلود…</p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="!p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">نام نمایشی</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">نام کاربری</Label>
              <Input
                id="username"
                dir="ltr"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              {!usernameParse.success ? (
                <p className="text-xs text-destructive">{usernameParse.error.issues[0]?.message}</p>
              ) : null}
              {usernameTaken ? (
                <p className="text-xs text-destructive">این نام کاربری قبلاً ثبت شده است</p>
              ) : null}
              {usernameAvailability.isLoading && debouncedUsername !== user?.username ? (
                <p className="text-xs text-muted-foreground">در حال بررسی…</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bio">بیوگرافی</Label>
                <span className="text-[11px] text-muted-foreground">{bio.length}/150</span>
              </div>
              <Textarea
                id="bio"
                rows={3}
                maxLength={150}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="درباره خودت بنویس…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">وب‌سایت</Label>
              <Input
                id="website"
                dir="ltr"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://"
              />
            </div>
          </CardContent>
        </Card>

        <SettingsSection label="شهر پیش‌فرض" description="برای ثبت آگهی و جستجو استفاده می‌شود">
          <div className="p-4">
            <CityLocationPicker
              embedded
              currentCityId={cityId ?? undefined}
              currentProvinceId={provinceId ?? undefined}
              onPickProvince={(p) => setProvinceId(p.id)}
              onPickCity={(c, p) => {
                setCityId(c.id);
                setProvinceId(p.id);
              }}
              onPickProvinceOnly={(p) => {
                setProvinceId(p.id);
                setCityId(null);
              }}
              onClear={() => {
                setCityId(null);
                setProvinceId(null);
              }}
            />
          </div>
        </SettingsSection>

        <SettingsSection label="تنظیمات استوری">
          <SettingsToggleRow
            label="آرشیو استوری"
            description="استوری‌های منقضی‌شده در آرشیو پروفایل ذخیره شوند"
            checked={storyArchiveEnabled}
            onCheckedChange={setStoryArchiveEnabled}
          />
        </SettingsSection>

        <Button
          variant="brand"
          className="w-full"
          isLoading={profileMutation.isPending}
          disabled={!canSave}
          onClick={() => profileMutation.mutate()}
        >
          ذخیره تغییرات
        </Button>
      </div>
    </div>
  );
}
