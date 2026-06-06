'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ALLOWED_VIDEO_TYPES, MAX_VIDEO_UPLOAD_BYTES } from '@agahiram/shared';
import {
  Button,
  IconButton,
  IgArrowBack,
  IgGallery,
  Input,
  Label,
  Spinner,
  toast,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { useUploadManager } from '@/lib/upload-manager';
import {
  isVideoFile,
  resolveFileExtension,
  resolveVideoUploadType,
} from '@/lib/normalize-image-file';

export default function CreateReelPage() {
  const router = useRouter();
  const { uploadFile } = useUploadManager();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [_file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaKey, setMediaKey] = useState<string | null>(null);
  const [duration, setDuration] = useState(30);
  const [title, setTitle] = useState('');
  const [coverTime, setCoverTime] = useState(0);
  const [uploading, setUploading] = useState(false);

  const onPick = async (f: File) => {
    const contentType = resolveVideoUploadType(f);
    const extension = resolveFileExtension(f);
    if (!isVideoFile(f)) {
      toast.error('فرمت ویدیو پشتیبانی نمی‌شود');
      return;
    }
    if (f.size > MAX_VIDEO_UPLOAD_BYTES) {
      toast.error('حجم ویدیو بیش از حد مجاز است');
      return;
    }
    const url = URL.createObjectURL(f);
    const video = document.createElement('video');
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        const d = Math.min(60, Math.max(1, Math.round(video.duration)));
        setDuration(d);
        setFile(f);
        setPreview(url);
        resolve();
      };
      video.onerror = () => reject(new Error('خطا در خواندن ویدیو'));
    }).catch((e) => toast.error((e as Error).message));

    setUploading(true);
    try {
      const presign = await apiClient.post<{ uploadUrl: string; key: string }>('/media/presign', {
        folder: 'reels',
        fileName: f.name,
        contentType,
        extension,
      });
      if (!presign.success || !presign.data) throw new Error('خطا در آپلود');
      const ok = await uploadFile({
        label: 'آپلود ریل',
        url: presign.data.uploadUrl,
        file: f,
        contentType,
      });
      if (!ok) throw new Error('آپلود ناموفق');
      const confirm = await apiClient.post('/media/confirm', { key: presign.data.key });
      if (!confirm.success) throw new Error('تأیید فایل ناموفق');
      setMediaKey(presign.data.key);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const publish = useMutation({
    mutationFn: async () => {
      if (!mediaKey || title.length < 3) throw new Error('عنوان و ویدیو الزامی است');
      type CatNode = { id: string; children?: CatNode[] };
      const cats = await apiClient.get<CatNode[]>('/categories/tree');
      // Reels skip the category wizard, so pick the first leaf as a sensible default.
      const firstLeaf = (nodes: CatNode[] | undefined): string | undefined => {
        for (const n of nodes ?? []) {
          if (!n.children?.length) return n.id;
          const leaf = firstLeaf(n.children);
          if (leaf) return leaf;
        }
        return undefined;
      };
      const categoryId = firstLeaf(cats.data);
      if (!categoryId) throw new Error('دسته‌بندی یافت نشد');
      const cities = await apiClient.get<{ data: Array<{ id: string }> }>(
        '/locations/cities?limit=1',
      );
      const cityId = cities.data?.data?.[0]?.id;
      if (!cityId) throw new Error('شهر یافت نشد');
      const r = await apiClient.post('/posts/reels', {
        title,
        categoryId,
        cityId,
        mediaKey,
        duration,
        priceType: 'negotiable',
      });
      if (!r.success) throw new Error(r.error ?? 'خطا در انتشار');
      return r.data;
    },
    onSuccess: () => {
      toast.success('ریل منتشر شد');
      router.push('/reels');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="bg-background pb-12">
      <div className="glass sticky top-[var(--header-height)] z-20 mb-4 flex items-center gap-2 border-b border-border-subtle px-3 py-2">
        <IconButton
          aria-label="بازگشت"
          icon={<IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} aria-hidden />}
          variant="ghost"
          onClick={() => router.back()}
        />
        <h1 className="text-sm font-semibold">ایجاد ریل</h1>
      </div>
      <div className="p-4">
        {!preview ? (
          <label className="relative grid aspect-[9/16] max-w-xs cursor-pointer place-items-center rounded-2xl border border-dashed border-border bg-muted">
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              className="absolute inset-0 z-10 cursor-pointer opacity-0 [font-size:0]"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onPick(f);
                e.target.value = '';
              }}
            />
            <div className="pointer-events-none flex flex-col items-center gap-2 text-muted-foreground">
              {uploading ? (
                <Spinner />
              ) : (
                <>
                  <IgGallery className="size-10" strokeWidth={1.5} aria-hidden />
                  <span className="text-sm">انتخاب ویدیو از گالری</span>
                </>
              )}
            </div>
          </label>
        ) : (
          <div className="space-y-4">
            <video
              ref={videoRef}
              src={preview}
              className="aspect-[9/16] max-h-[50vh] w-full rounded-2xl bg-black object-cover"
              muted
              playsInline
              onLoadedMetadata={() => {
                if (videoRef.current) videoRef.current.currentTime = coverTime;
              }}
            />
            <div className="space-y-2">
              <Label>کاور (فریم)</Label>
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={coverTime}
                onChange={(e) => {
                  const t = Number(e.target.value);
                  setCoverTime(t);
                  if (videoRef.current) videoRef.current.currentTime = t;
                }}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reel-title" required>
                عنوان
              </Label>
              <Input
                id="reel-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                minLength={3}
              />
            </div>
            <Button
              variant="brand"
              fullWidth
              disabled={!mediaKey}
              isLoading={publish.isPending}
              onClick={() => publish.mutate()}
            >
              انتشار ریل
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
