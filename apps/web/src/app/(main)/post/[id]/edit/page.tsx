'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ChevronDown, ChevronUp, ImagePlus, X } from 'lucide-react';
import { PostStatus } from '@agahiram/shared';
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
} from '@agahiram/shared';
import { Button, IconButton, Input, Label, LoadingState, Textarea, toast } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { mediaKeyFromUrl } from '@/lib/media-key';
import { useUploadManager } from '@/lib/upload-manager';
import { patchPostDetail, patchPostInInfiniteQueries } from '@/lib/query-cache-posts';
import { updateProfilePostStatus } from '@/lib/query-cache-profile';
import { useAuthStore } from '@/lib/auth-store';
import type { PostDetail } from '../post-detail-client';

type EditMediaItem = {
  key: string;
  type: 'image' | 'video';
  preview: string;
};

const MAX_MEDIA = 10;

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const myUsername = useAuthStore((s) => s.user?.username);
  const { uploadFile } = useUploadManager();
  const { data, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const r = await apiClient.get<PostDetail>(`/posts/${id}`);
      if (!r.success || !r.data) throw new Error(r.error ?? 'آگهی یافت نشد');
      return r.data;
    },
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [media, setMedia] = useState<EditMediaItem[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!data) return;
    setTitle(String(data.title ?? ''));
    setDescription(String(data.description ?? ''));
    setPrice(data.price != null ? String(data.price) : '');
    const raw = data.media as Array<{ url: string; type: string }> | undefined;
    if (raw?.length) {
      setMedia(
        raw
          .map((m) => {
            const key = mediaKeyFromUrl(m.url);
            if (!key) return null;
            return {
              key,
              type: m.type === 'video' ? 'video' : 'image',
              preview: m.url,
            } satisfies EditMediaItem;
          })
          .filter((x): x is EditMediaItem => x !== null),
      );
    }
  }, [data]);

  const uploadNewFiles = async (files: FileList) => {
    if (media.length >= MAX_MEDIA) {
      toast.error(`حداکثر ${MAX_MEDIA} تصویر مجاز است`);
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (media.length >= MAX_MEDIA) break;
        const isVideo = file.type.startsWith('video/');
        const allowed = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
        if (!(allowed as readonly string[]).includes(file.type)) {
          toast.error(`فرمت «${file.name}» پشتیبانی نمی‌شود`);
          continue;
        }
        const max = isVideo ? MAX_VIDEO_UPLOAD_BYTES : MAX_IMAGE_UPLOAD_BYTES;
        if (file.size > max) {
          toast.error(`حجم «${file.name}» بیش از حد مجاز است`);
          continue;
        }
        const extension = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
        const presign = await apiClient.post<{ uploadUrl: string; key: string }>('/media/presign', {
          folder: 'posts',
          fileName: file.name,
          contentType: file.type,
          extension,
        });
        if (!presign.success || !presign.data?.key) throw new Error('خطا در آپلود');
        const { key, uploadUrl } = presign.data;
        const ok = await uploadFile({
          label: 'آپلود تصویر',
          url: uploadUrl,
          file,
          contentType: file.type,
        });
        if (!ok) throw new Error('آپلود ناموفق');
        const confirm = await apiClient.post('/media/confirm', { key });
        if (!confirm.success) throw new Error('تأیید فایل ناموفق');
        setMedia((arr) => [
          ...arr,
          {
            key,
            type: isVideo ? 'video' : 'image',
            preview: URL.createObjectURL(file),
          },
        ]);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const moveMedia = (index: number, dir: -1 | 1) => {
    setMedia((arr) => {
      const next = [...arr];
      const target = index + dir;
      if (target < 0 || target >= next.length) return arr;
      const tmp = next[index]!;
      next[index] = next[target]!;
      next[target] = tmp;
      return next;
    });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (media.length === 0) throw new Error('حداقل یک تصویر لازم است');
      const r = await apiClient.patch(`/posts/${id}`, {
        title,
        description: description || undefined,
        price: price ? Number(price) : null,
        mediaKeys: media.map((m, i) => ({ key: m.key, type: m.type, order: i })),
      });
      if (!r.success) throw new Error(r.error ?? 'خطا در ذخیره');
      return r.data;
    },
    onSuccess: (updated) => {
      const patch = {
        status: PostStatus.PENDING_REVIEW,
        ...(updated && typeof updated === 'object' ? updated : {}),
      };
      patchPostDetail(qc, id, patch);
      patchPostInInfiniteQueries(qc, id, patch);
      if (myUsername) updateProfilePostStatus(qc, myUsername, id, PostStatus.PENDING_REVIEW);
      void qc.invalidateQueries({ queryKey: ['post', id] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
      void qc.invalidateQueries({ queryKey: ['explore'] });
      toast.success('آگهی با موفقیت ویرایش شد. پس از ویرایش، آگهی شما مجدداً بررسی خواهد شد.');
      router.push(`/post/${id}`);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading) return <LoadingState label="در حال بارگذاری…" />;

  return (
    <div className="bg-background p-4">
      <div className="mb-4 flex items-center gap-2">
        <IconButton
          aria-label="بازگشت"
          icon={<ArrowRight className="size-5 rtl:rotate-180" aria-hidden />}
          variant="ghost"
          onClick={() => router.back()}
        />
        <h1 className="text-lg font-bold">ویرایش آگهی</h1>
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="space-y-2">
          <Label>تصاویر (اولین تصویر = کاور)</Label>
          <div className="grid grid-cols-3 gap-2">
            {media.map((m, i) => (
              <div
                key={`${m.key}-${i}`}
                className="relative aspect-square overflow-hidden rounded-lg bg-muted"
              >
                <Image src={m.preview} alt="" fill className="object-cover" sizes="120px" />
                <button
                  type="button"
                  aria-label="حذف"
                  className="absolute end-1 top-1 grid size-7 place-items-center rounded-full bg-black/60 text-white"
                  onClick={() => setMedia((arr) => arr.filter((_, j) => j !== i))}
                >
                  <X className="size-3.5" aria-hidden />
                </button>
                <div className="absolute inset-x-0 bottom-0 flex justify-center gap-0.5 bg-black/50 p-0.5">
                  <button
                    type="button"
                    aria-label="جابجایی به بالا"
                    onClick={() => moveMedia(i, -1)}
                  >
                    <ChevronUp className="size-4 text-white" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label="جابجایی به پایین"
                    onClick={() => moveMedia(i, 1)}
                  >
                    <ChevronDown className="size-4 text-white" aria-hidden />
                  </button>
                </div>
              </div>
            ))}
            {media.length < MAX_MEDIA ? (
              <label className="grid aspect-square cursor-pointer place-items-center rounded-lg border border-dashed border-border">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4"
                  multiple
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => e.target.files && void uploadNewFiles(e.target.files)}
                />
                <ImagePlus className="size-6 text-muted-foreground" aria-hidden />
              </label>
            ) : null}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="title" required>
            عنوان
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            minLength={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">توضیحات</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
          />
        </div>
        <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          پس از ویرایش، آگهی شما مجدداً بررسی خواهد شد.
        </p>
        <div className="space-y-2">
          <Label htmlFor="price">قیمت (تومان)</Label>
          <Input
            id="price"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="brand"
            disabled={save.isPending || title.length < 3 || media.length === 0}
          >
            {save.isPending ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/post/${id}`}>انصراف</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
