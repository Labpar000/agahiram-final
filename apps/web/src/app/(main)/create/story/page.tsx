'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ImagePlus, X } from 'lucide-react';
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
} from '@agahiram/shared';
import { Button, IconButton, Spinner, toast } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { useUploadManager } from '@/lib/upload-manager';
import { StoryOverlayEditor, type StoryOverlayDocument } from '@/components/story-overlay-editor';

export default function CreateStoryPage() {
  const router = useRouter();
  const { uploadFile } = useUploadManager();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [mediaKey, setMediaKey] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [videoDurationMs, setVideoDurationMs] = useState<number | undefined>();
  const [editMode, setEditMode] = useState(false);

  const publish = useMutation({
    mutationFn: async (overlay?: StoryOverlayDocument) => {
      if (!mediaKey) throw new Error('ابتدا یک عکس یا ویدیو انتخاب کنید');
      const r = await apiClient.post('/stories', {
        mediaKey,
        type: mediaType,
        overlayJson: overlay,
        durationMs: videoDurationMs,
      });
      if (!r.success) throw new Error(r.error ?? 'خطا در انتشار استوری');
      return r.data;
    },
    onSuccess: () => {
      toast.success('استوری شما منتشر شد');
      router.push('/feed');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const handleFile = async (file: File) => {
    const contentType = file.type || 'application/octet-stream';
    const isVideo = contentType.startsWith('video/');
    const allowed = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
    if (!(allowed as readonly string[]).includes(contentType)) {
      toast.error('فرمت فایل پشتیبانی نمی‌شود');
      return;
    }
    const maxBytes = isVideo ? MAX_VIDEO_UPLOAD_BYTES : MAX_IMAGE_UPLOAD_BYTES;
    if (file.size > maxBytes) {
      toast.error('حجم فایل بیش از حد مجاز است');
      return;
    }

    if (isVideo) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      const url = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          const dur = Math.round(video.duration * 1000);
          if (dur > 60_000) {
            reject(new Error('ویدیو باید حداکثر ۶۰ ثانیه باشد'));
          } else {
            setVideoDurationMs(dur);
            resolve();
          }
          URL.revokeObjectURL(url);
        };
        video.onerror = () => reject(new Error('خواندن ویدیو ناموفق بود'));
        video.src = url;
      }).catch((e) => {
        toast.error((e as Error).message);
        return;
      });
    }

    setUploading(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
      const presign = await apiClient.post<{ uploadUrl: string; key: string }>('/media/presign', {
        folder: 'stories',
        fileName: file.name,
        contentType,
        extension,
      });
      if (!presign.success || !presign.data) {
        throw new Error('خطا در دریافت لینک آپلود');
      }

      const ok = await uploadFile({
        label: isVideo ? 'آپلود ویدیو استوری' : 'آپلود تصویر استوری',
        url: presign.data.uploadUrl,
        file,
        contentType,
      });
      if (!ok) throw new Error('آپلود ناموفق بود');

      const confirmRes = await apiClient.post('/media/confirm', { key: presign.data.key });
      if (!confirmRes.success) throw new Error(confirmRes.error ?? 'تأیید فایل ناموفق بود');

      setMediaKey(presign.data.key);
      setMediaType(isVideo ? 'video' : 'image');
      setPreview({ url: URL.createObjectURL(file), type: isVideo ? 'video' : 'image' });
      setEditMode(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-background pb-12">
      <div className="sticky top-[var(--header-height)] z-20 flex items-center gap-2 border-b border-border bg-background/95 px-3 py-2 backdrop-blur-md">
        <IconButton
          aria-label="بازگشت"
          icon={<ArrowLeft className="size-5 rtl:rotate-180" aria-hidden />}
          variant="ghost"
          onClick={() => router.back()}
        />
        <h1 className="text-sm font-semibold">افزودن استوری</h1>
      </div>

      <div className="mx-auto max-w-md space-y-4 p-4">
        {!editMode ? (
          <>
            <p className="text-sm text-muted-foreground">
              ۱۰۸۰×۱۹۲۰ بهترین اندازه برای استوری. یک عکس یا ویدیو (حداکثر ۶۰ ثانیه) از گالری انتخاب
              کنید.
            </p>
            <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-border bg-muted">
              <label className="grid size-full cursor-pointer place-items-center">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                  }}
                />
                {uploading ? (
                  <Spinner size="lg" />
                ) : (
                  <span className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImagePlus className="size-10" aria-hidden />
                    <span className="text-sm">انتخاب از گالری</span>
                  </span>
                )}
              </label>
            </div>
          </>
        ) : preview ? (
          <StoryOverlayEditor
            previewUrl={preview.url}
            mediaType={preview.type}
            isPublishing={publish.isPending}
            onCancel={() => {
              setEditMode(false);
              setPreview(null);
              setMediaKey(null);
            }}
            onPublish={(overlay) => publish.mutate(overlay)}
          />
        ) : null}
      </div>
    </div>
  );
}
