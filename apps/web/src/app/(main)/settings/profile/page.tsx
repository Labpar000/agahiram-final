'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  IgArrowBack,
  IgGallery,
  IconButton,
  Input,
  Label,
  Textarea,
  toast,
} from '@agahiram/ui';
import { usernameSchema } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { patchAuthUser, patchProfileQuery } from '@/lib/query-cache-profile';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setUsername(user.username ?? '');
      setBio((user as any).bio ?? '');
      setWebsite((user as any).website ?? '');
    }
  }, [user]);

  if (!isAuthenticated) {
    router.replace('/login');
    return null;
  }

  const usernameParse = usernameSchema.safeParse(username);

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      setAvatarUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const presign = await apiClient.post<{ uploadUrl: string; key: string }>('/media/presign', {
        folder: 'avatars',
        contentType: file.type,
        extension: file.name.split('.').pop(),
      });
      if (!presign.success || !presign.data) throw new Error('خطا در دریافت لینک آپلود');
      await fetch(presign.data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      await apiClient.post('/media/confirm', { key: presign.data.key });
      const update = await apiClient.patch('/users/me', { avatarKey: presign.data.key });
      if (!update.success) throw new Error(update.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('آواتار با موفقیت به‌روزرسانی شد');
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (e) => toast.error((e as Error).message),
    onSettled: () => setAvatarUploading(false),
  });

  const profileMutation = useMutation({
    mutationFn: async () => {
      const r = await apiClient.patch('/users/me', { name, username, bio, website });
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('پروفایل به‌روزرسانی شد');
      patchAuthUser(qc, { name, username, bio: bio as any, website: website as any } as any);
      if (user?.username)
        patchProfileQuery(qc, user.username, { displayName: name, username } as any);
      router.back();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="bg-background min-h-svh pb-8">
      <div className="glass sticky top-[var(--header-height)] z-20 flex items-center gap-2 border-b border-border-subtle px-3 py-4">
        <IconButton
          aria-label="بازگشت"
          icon={<IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} aria-hidden />}
          variant="ghost"
          onClick={() => router.back()}
        />
        <h1 className="text-lg font-bold tracking-tight">ویرایش پروفایل</h1>
      </div>

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
                {avatarUploading && <p className="mt-1 text-[11px] text-primary">در حال آپلود…</p>}
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">بیوگرافی</Label>
              <Textarea
                id="bio"
                rows={3}
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

        <Button
          variant="brand"
          className="w-full"
          isLoading={profileMutation.isPending}
          disabled={!usernameParse.success || !name.trim()}
          onClick={() => profileMutation.mutate()}
        >
          ذخیره تغییرات
        </Button>
      </div>
    </div>
  );
}
