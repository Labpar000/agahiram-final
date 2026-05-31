'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  IconButton,
  IgArrowBack,
  Input,
  Label,
  LoadingState,
  Switch,
  toast,
} from '@agahiram/ui';
import { S3_FOLDERS } from '@agahiram/shared/constants';
import { cn } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { uploadToMinio } from '@/lib/upload-media';
import { useAuthStore } from '@/lib/auth-store';
import { StoryArchivePicker } from '@/features/stories/story-archive-picker';

interface HighlightMeta {
  id: string;
  title: string;
  coverUrl: string | null;
  pinnedOrder: number | null;
}

interface HighlightStory {
  id: string;
  mediaUrl: string;
}

export default function EditHighlightPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const username = useAuthStore((s) => s.user?.username);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [coverArchiveId, setCoverArchiveId] = useState<string | null>(null);
  const [customCoverUrl, setCustomCoverUrl] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<Set<string>>(new Set());
  const [showArchivePicker, setShowArchivePicker] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['highlight-edit', id, username],
    queryFn: async () => {
      if (!username) throw new Error('وارد شوید');
      const [highlightsRes, storiesRes] = await Promise.all([
        apiClient.get<HighlightMeta[]>(`/users/${username}/highlights`),
        apiClient.get<HighlightStory[]>(`/highlights/${id}/stories`),
      ]);
      const meta = (highlightsRes.data ?? []).find((h) => h.id === id);
      if (!meta) throw new Error('هایلایت یافت نشد');
      const stories = storiesRes.data ?? [];
      const cover = stories.find((s) => s.mediaUrl === meta.coverUrl)?.id ?? stories[0]?.id ?? null;
      return {
        meta,
        stories,
        coverArchiveId: cover,
        storyIds: stories.map((s) => s.id),
      };
    },
    enabled: !!username,
  });

  useEffect(() => {
    if (!data) return;
    setTitle(data.meta.title);
    setCoverArchiveId(data.coverArchiveId);
    setPinned(data.meta.pinnedOrder != null);
    setSelectedArchive(new Set(data.storyIds));
    setCustomCoverUrl(
      data.meta.coverUrl && !data.stories.some((s) => s.mediaUrl === data.meta.coverUrl)
        ? data.meta.coverUrl
        : null,
    );
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const storyArchiveIds = Array.from(selectedArchive);
      const r = await apiClient.patch(`/highlights/${id}`, {
        title: title.trim(),
        storyArchiveIds: storyArchiveIds.length > 0 ? storyArchiveIds : undefined,
        ...(customCoverUrl
          ? { coverUrl: customCoverUrl }
          : coverArchiveId
            ? { coverStoryArchiveId: coverArchiveId }
            : {}),
        pinnedOrder: pinned ? 0 : null,
      });
      if (!r.success) throw new Error(r.error ?? 'خطا');
      return r.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['highlights'] });
      toast.success('هایلایت به‌روز شد');
      router.replace(`/highlights/${id}`);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteHighlight = useMutation({
    mutationFn: async () => {
      const r = await apiClient.delete(`/highlights/${id}`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['highlights'] });
      toast.success('هایلایت حذف شد');
      router.replace(username ? `/profile/${username}` : '/');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const uploadCustomCover = async (file: File) => {
    setCoverUploading(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const presign = await apiClient.post<{ uploadUrl: string; key: string; publicUrl: string }>(
        '/media/presign',
        { folder: S3_FOLDERS.STORIES, contentType: file.type, extension },
      );
      if (!presign.success || !presign.data) throw new Error(presign.error ?? 'خطا در آپلود');
      const ok = await uploadToMinio(presign.data.uploadUrl, file, file.type);
      if (!ok) throw new Error('آپلود ناموفق');
      await apiClient.post('/media/confirm', { key: presign.data.key });
      setCustomCoverUrl(presign.data.publicUrl);
      setCoverArchiveId(null);
      toast.success('کاور سفارشی انتخاب شد');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCoverUploading(false);
    }
  };

  const toggleArchive = (archiveId: string) => {
    setSelectedArchive((prev) => {
      const next = new Set(prev);
      if (next.has(archiveId)) {
        next.delete(archiveId);
        if (coverArchiveId === archiveId) setCoverArchiveId(null);
      } else {
        next.add(archiveId);
        if (!coverArchiveId) setCoverArchiveId(archiveId);
      }
      return next;
    });
  };

  if (isLoading || !data) return <LoadingState label="در حال بارگذاری…" />;

  const coverPreview =
    customCoverUrl ??
    data.stories.find((s) => s.id === coverArchiveId)?.mediaUrl ??
    data.stories[0]?.mediaUrl ??
    data.meta.coverUrl;

  return (
    <div className="bg-background p-4 pb-24">
      <div className="mb-4 flex items-center gap-2">
        <IconButton
          aria-label="بازگشت"
          icon={<IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} aria-hidden />}
          variant="ghost"
          onClick={() => router.back()}
        />
        <h1 className="text-lg font-bold">ویرایش هایلایت</h1>
      </div>

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="title">عنوان</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={15}
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-semibold">سنجاق در پروفایل</p>
            <p className="text-xs text-muted-foreground">
              هایلایت در ابتدای ردیف نمایش داده می‌شود
            </p>
          </div>
          <Switch checked={pinned} onCheckedChange={setPinned} />
        </div>

        <div className="space-y-2">
          <Label>کاور</Label>
          <div className="flex items-center gap-3">
            {coverPreview ? (
              <span className="relative size-20 overflow-hidden rounded-full ring-2 ring-primary">
                <Image src={coverPreview} alt="" fill className="object-cover" sizes="80px" />
              </span>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {data.stories.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={cn(
                    'relative size-14 overflow-hidden rounded-full ring-2',
                    !customCoverUrl && coverArchiveId === s.id ? 'ring-primary' : 'ring-border',
                  )}
                  onClick={() => {
                    setCustomCoverUrl(null);
                    setCoverArchiveId(s.id);
                  }}
                >
                  <Image src={s.mediaUrl} alt="" fill className="object-cover" sizes="56px" />
                </button>
              ))}
            </div>
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadCustomCover(f);
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={coverUploading}
            onClick={() => coverInputRef.current?.click()}
          >
            {coverUploading ? 'در حال آپلود…' : 'آپلود کاور سفارشی'}
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>استوری‌های هایلایت ({selectedArchive.size})</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowArchivePicker((v) => !v)}
            >
              {showArchivePicker ? 'بستن' : 'افزودن از آرشیو'}
            </Button>
          </div>
          {showArchivePicker ? (
            <StoryArchivePicker
              selected={selectedArchive}
              coverId={coverArchiveId}
              onToggle={toggleArchive}
              onSetCover={(cid) => {
                setCustomCoverUrl(null);
                setCoverArchiveId(cid);
              }}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.stories
                .filter((s) => selectedArchive.has(s.id))
                .map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="relative size-16 overflow-hidden rounded-lg ring-1 ring-border"
                    onClick={() => toggleArchive(s.id)}
                  >
                    <Image src={s.mediaUrl} alt="" fill className="object-cover" sizes="64px" />
                  </button>
                ))}
            </div>
          )}
        </div>

        <Button type="submit" variant="brand" disabled={save.isPending || !title.trim()}>
          ذخیره
        </Button>
      </form>

      <Button
        type="button"
        variant="destructive"
        className="mt-6 w-full"
        disabled={deleteHighlight.isPending}
        onClick={() => {
          if (window.confirm('این هایلایت حذف شود؟')) deleteHighlight.mutate();
        }}
      >
        حذف هایلایت
      </Button>
    </div>
  );
}
