'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_STORY_SLIDES_PER_BATCH,
  MAX_STORY_DURATION,
  MAX_VIDEO_UPLOAD_BYTES,
} from '@agahiram/shared';
import type { StoryOverlayDocument } from '@agahiram/shared';
import {
  Button,
  IconButton,
  IgArrowBack,
  IgClose,
  IgImagePlus,
  IgText,
  Spinner,
  toast,
} from '@agahiram/ui';
import { StoryBatchPublishPreview } from '@/features/stories/story-batch-publish-preview';
import { apiClient } from '@/lib/api';
import { useUploadManager } from '@/lib/upload-manager';
import {
  StoryComposer,
  type PublishSticker,
  type StoryComposerPayload,
} from '@/features/stories/story-composer';
import { buildStoryPublishRequest } from '@/features/stories/story-publish-request';
import { parseStoryTextDraft } from '@/features/stories/story-text-draft';
import { StoryCamera, type CapturedMedia } from '@/features/stories/camera/story-camera';
import { StoryLayoutCollage } from '@/features/stories/camera/story-layout-collage';
import {
  isVideoFile,
  resolveContentType,
  resolveFileExtension,
  resolveVideoUploadType,
} from '@/lib/normalize-image-file';
type Step = 'pick' | 'camera' | 'layout' | 'edit' | 'previewBatch';

type SessionPrefs = {
  audience: 'PUBLIC' | 'CLOSE_FRIENDS';
  allowReplies: string;
  linkedPostId?: string;
};

type PendingSlide = {
  mediaKey: string;
  previewUrl: string;
  mediaType: 'image' | 'video';
  videoDurationMs?: number;
  overlay?: StoryOverlayDocument;
  audience: 'PUBLIC' | 'CLOSE_FRIENDS';
  allowReplies: string;
  linkedPostId?: string;
  hashtag?: string;
  cityId?: string;
  stickers: PublishSticker[];
  altText?: string;
  scheduledAt?: string;
  repost?: { type: 'post' | 'story'; id: string };
};

export default function CreateStoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [repostMeta, setRepostMeta] = useState<{
    type: 'post' | 'story';
    id: string;
    overlay?: StoryOverlayDocument;
    linkedPostId?: string;
  } | null>(null);
  const { uploadFile } = useUploadManager();
  const [step, setStep] = useState<Step>('pick');
  const [uploading, setUploading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [sessionPrefs, setSessionPrefs] = useState<SessionPrefs | null>(null);
  const [slides, setSlides] = useState<PendingSlide[]>([]);
  const [current, setCurrent] = useState<PendingSlide | null>(null);
  const draftOverlayRef = useRef<StoryOverlayDocument | null>(null);

  const uploadBlob = async (file: File | Blob, fileName: string, contentType: string) => {
    const isVideo = contentType.startsWith('video/');
    const allowed = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    const allowedVideoByExt = isVideo && ['mp4', 'mov', 'webm', 'quicktime'].includes(ext);
    if (!(allowed as readonly string[]).includes(contentType) && !allowedVideoByExt) {
      throw new Error('فرمت فایل پشتیبانی نمی‌شود');
    }
    const extension = resolveFileExtension(
      file instanceof File ? file : new File([file], fileName, { type: contentType }),
    );
    const presign = await apiClient.post<{ uploadUrl: string; key: string }>('/media/presign', {
      folder: 'stories',
      fileName,
      contentType,
      extension,
    });
    if (!presign.success || !presign.data) throw new Error('خطا در آپلود');
    const ok = await uploadFile({
      label: isVideo ? 'آپلود ویدیو' : 'آپلود تصویر',
      url: presign.data.uploadUrl,
      file: file instanceof File ? file : new File([file], fileName, { type: contentType }),
      contentType,
    });
    if (!ok) throw new Error('آپلود ناموفق');
    const confirmRes = await apiClient.post('/media/confirm', { key: presign.data.key });
    if (!confirmRes.success) throw new Error(confirmRes.error ?? 'تأیید فایل ناموفق');
    return presign.data.key;
  };

  const beginEdit = useCallback(
    (
      data: {
        mediaKey: string;
        previewUrl: string;
        mediaType: 'image' | 'video';
        videoDurationMs?: number;
      },
      repost?: {
        type: 'post' | 'story';
        id: string;
        overlay?: StoryOverlayDocument;
        linkedPostId?: string;
      },
    ) => {
      const initialOverlay = repost?.overlay ?? draftOverlayRef.current ?? undefined;
      setCurrent({
        ...data,
        audience: sessionPrefs?.audience ?? 'PUBLIC',
        allowReplies: sessionPrefs?.allowReplies ?? 'EVERYONE',
        linkedPostId: repost?.linkedPostId ?? sessionPrefs?.linkedPostId,
        overlay: initialOverlay,
        repost: repost ? { type: repost.type, id: repost.id } : undefined,
        stickers: [],
      });
      if (draftOverlayRef.current) draftOverlayRef.current = null;
      setStep('edit');
    },
    [sessionPrefs],
  );

  useEffect(() => {
    if (current || slides.length > 0) return;
    const draft = searchParams.get('draftText');
    if (draft !== '1') return;
    if (typeof window === 'undefined') return;
    const raw = window.sessionStorage.getItem('story-text-draft');
    const parsed = parseStoryTextDraft(raw);
    if (!parsed) {
      window.sessionStorage.removeItem('story-text-draft');
      return;
    }
    const file = dataUrlToFile(parsed.dataUrl, 'story-text.jpg');
    if (!file) {
      window.sessionStorage.removeItem('story-text-draft');
      return;
    }
    if (parsed.overlay?.layers?.length) draftOverlayRef.current = parsed.overlay;
    void handleFile(file);
    window.sessionStorage.removeItem('story-text-draft');
    router.replace('/create/story');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reads URL payload once
  }, [searchParams, current, slides.length]);

  useEffect(() => {
    const repostPost = searchParams.get('repostPost');
    const repostStory = searchParams.get('repostStory');
    const linkedPostId = searchParams.get('linkedPostId');
    const type: 'post' | 'story' | null = repostPost ? 'post' : repostStory ? 'story' : null;
    const id = repostPost ?? repostStory;
    if (!type || !id) {
      if (linkedPostId) {
        setSessionPrefs((p) => ({
          audience: p?.audience ?? 'PUBLIC',
          allowReplies: p?.allowReplies ?? 'EVERYONE',
          linkedPostId,
        }));
      }
      return;
    }
    void (async () => {
      const r = await apiClient.get<{
        mediaKey: string;
        mediaUrl: string;
        type: 'image' | 'video';
        linkedPostId?: string;
        overlayJson?: StoryOverlayDocument;
      }>(`/stories/repost-preview?type=${type}&id=${id}`);
      if (!r.success || !r.data) {
        toast.error(r.error ?? 'امکان بارگذاری اشتراک نیست');
        return;
      }
      const meta = {
        type,
        id,
        overlay: r.data.overlayJson,
        linkedPostId: r.data.linkedPostId,
      };
      setRepostMeta(meta);
      beginEdit(
        {
          mediaKey: r.data.mediaKey,
          previewUrl: r.data.mediaUrl,
          mediaType: r.data.type,
        },
        meta,
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount params
  }, []);

  const publish = useMutation({
    mutationFn: async (queue: PendingSlide[]) => {
      const request = buildStoryPublishRequest(queue, sessionId);
      const r = await apiClient.post(request.endpoint, request.body);
      if (!r.success) throw new Error(r.error ?? 'خطا در انتشار استوری');
      return r.data;
    },
    onSuccess: (data, queue) => {
      for (const s of queue) revokePreviewUrl(s.previewUrl);
      qc.removeQueries({ queryKey: ['stories', 'feed'] });
      const scheduled =
        data &&
        typeof data === 'object' &&
        'scheduled' in data &&
        (data as { scheduled?: boolean }).scheduled;
      toast.success(scheduled ? 'استوری زمان‌بندی شد' : 'استوری شما منتشر شد');
      router.push('/feed');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const handleFile = async (file: File) => {
    const isVideo = isVideoFile(file);
    const contentType = isVideo ? resolveVideoUploadType(file) : resolveContentType(file);
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
    let videoDurationMs: number | undefined;
    if (isVideo) {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      try {
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => {
            const dur = Math.round(video.duration * 1000);
            if (dur > MAX_STORY_DURATION * 1000) {
              reject(new Error(`ویدیو باید حداکثر ${MAX_STORY_DURATION} ثانیه باشد`));
            } else {
              videoDurationMs = dur;
              resolve();
            }
          };
          video.onerror = () => reject(new Error('خواندن ویدیو ناموفق بود'));
          video.src = url;
        });
      } catch (e) {
        toast.error((e as Error).message);
        return;
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    setUploading(true);
    try {
      const key = await uploadBlob(file, file.name, contentType);
      beginEdit({
        mediaKey: key,
        previewUrl: URL.createObjectURL(file),
        mediaType: isVideo ? 'video' : 'image',
        videoDurationMs,
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleCapture = async (cap: CapturedMedia) => {
    setUploading(true);
    try {
      const contentType = cap.type === 'video' ? 'video/webm' : 'image/jpeg';
      const key = await uploadBlob(
        cap.blob,
        cap.type === 'video' ? 'story.webm' : 'story.jpg',
        contentType,
      );
      beginEdit({
        mediaKey: key,
        previewUrl: cap.url,
        mediaType: cap.type,
        videoDurationMs: cap.durationMs,
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const revokePreviewUrl = (url: string) => {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  };

  const dataUrlToFile = (dataUrl: string, fileName: string): File | null => {
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) return null;
    const mime = match[1] ?? 'image/jpeg';
    const b64 = match[2] ?? '';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], fileName, { type: mime });
  };

  const finalizeSlide = (payload: StoryComposerPayload) => {
    if (!current) return null;
    return {
      ...current,
      ...payload,
    } satisfies PendingSlide;
  };

  const rememberSessionPrefs = (payload: {
    audience: 'PUBLIC' | 'CLOSE_FRIENDS';
    allowReplies: string;
    linkedPostId?: string;
  }) => {
    setSessionPrefs({
      audience: payload.audience,
      allowReplies: payload.allowReplies,
      linkedPostId: payload.linkedPostId,
    });
  };

  const totalSlides = slides.length + (current ? 1 : 0);

  if (step === 'camera') {
    return (
      <StoryCamera
        fullscreen
        onClose={() => setStep('pick')}
        onCapture={(c) => void handleCapture(c)}
        onGallery={() => setStep('pick')}
        onLayout={() => setStep('layout')}
      />
    );
  }

  return (
    <div className="bg-background pb-12">
      <div className="glass sticky top-[var(--header-height)] z-[var(--z-raised)] flex items-center justify-between gap-2 border-b border-border-subtle px-3 py-2">
        <div className="flex items-center gap-2">
          <IconButton
            aria-label="بازگشت"
            icon={<IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} aria-hidden />}
            variant="ghost"
            onClick={() => router.back()}
          />
          <h1 className="text-sm font-semibold">افزودن استوری</h1>
        </div>
        <Link href="/create/story/text" className="flex items-center gap-1 text-xs text-ig-link">
          <IgText className="size-4" strokeWidth={1.75} aria-hidden /> متنی
        </Link>
      </div>

      <div className="mx-auto max-w-md space-y-4 p-4">
        {step === 'pick' ? (
          <>
            <p className="text-sm text-muted-foreground">
              نسبت ۹:۱۶ — حداکثر {MAX_STORY_SLIDES_PER_BATCH} اسلاید در هر انتشار. ویدیو تا{' '}
              {MAX_STORY_DURATION} ثانیه.
            </p>
            {slides.length > 0 ? (
              <>
                <p className="text-xs font-medium text-ig-link">
                  {slides.length} اسلاید در صف — رسانه بعدی را انتخاب کنید.
                </p>
                <ul className="flex gap-2 overflow-x-auto pb-1">
                  {slides.map((s, i) => (
                    <li
                      key={`${s.mediaKey}-${i}`}
                      className="relative h-20 w-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-border"
                    >
                      <Image
                        src={s.previewUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                        unoptimized
                      />
                      <button
                        type="button"
                        aria-label="حذف اسلاید"
                        onClick={() => {
                          revokePreviewUrl(s.previewUrl);
                          setSlides((prev) => prev.filter((_, j) => j !== i));
                        }}
                        className="absolute end-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-black/70 text-white tap-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
                      >
                        <IgClose className="size-3" strokeWidth={2} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" fullWidth onClick={() => setStep('camera')}>
                دوربین
              </Button>
              <Button variant="outline" fullWidth onClick={() => setStep('layout')}>
                کلاژ
              </Button>
              <label className="relative flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg border border-border py-2 text-sm font-medium">
                <input
                  type="file"
                  accept="image/*,video/mp4,video/quicktime,video/webm"
                  className="absolute inset-0 z-10 cursor-pointer opacity-0 [font-size:0]"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                    e.target.value = '';
                  }}
                />
                <span className="pointer-events-none">
                  {uploading ? <Spinner size="sm" /> : 'گالری'}
                </span>
              </label>
            </div>
            {slides.length >= MAX_STORY_SLIDES_PER_BATCH ? (
              <Button variant="brand" fullWidth onClick={() => setStep('previewBatch')}>
                انتشار {slides.length} اسلاید
              </Button>
            ) : slides.length > 0 ? (
              <Button variant="outline" fullWidth onClick={() => setStep('previewBatch')}>
                پیش‌نمایش صف ({slides.length})
              </Button>
            ) : null}
            <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-dashed border-border bg-muted">
              <span className="absolute inset-0 grid place-items-center text-muted-foreground">
                <IgImagePlus className="size-10" strokeWidth={1.75} aria-hidden />
              </span>
            </div>
          </>
        ) : null}

        {step === 'layout' ? (
          <StoryLayoutCollage
            onDone={(c) => void handleCapture(c)}
            onCancel={() => setStep('pick')}
          />
        ) : null}

        {step === 'previewBatch' && slides.length > 0 ? (
          <StoryBatchPublishPreview
            slides={slides.map((s) => ({
              previewUrl: s.previewUrl,
              mediaType: s.mediaType,
              overlay: s.overlay,
              stickers: s.stickers,
            }))}
            isPublishing={publish.isPending}
            onBack={() => setStep('pick')}
            onPublish={() => publish.mutate(slides)}
          />
        ) : null}

        {step === 'edit' && current ? (
          <StoryComposer
            previewUrl={current.previewUrl}
            mediaType={current.mediaType}
            mediaKey={current.mediaKey}
            videoDurationMs={current.videoDurationMs}
            isPublishing={publish.isPending}
            slideIndex={slides.length}
            slideTotal={totalSlides}
            defaultAudience={sessionPrefs?.audience}
            defaultAllowReplies={sessionPrefs?.allowReplies}
            defaultLinkedPostId={repostMeta?.linkedPostId ?? sessionPrefs?.linkedPostId}
            defaultRepost={
              repostMeta && slides.length === 0
                ? { type: repostMeta.type, id: repostMeta.id }
                : undefined
            }
            defaultOverlay={current.overlay ?? repostMeta?.overlay}
            onCancel={() => {
              if (current) revokePreviewUrl(current.previewUrl);
              setCurrent(null);
              setStep('pick');
            }}
            onAddSlide={
              slides.length + 1 < MAX_STORY_SLIDES_PER_BATCH
                ? (payload) => {
                    const slide = finalizeSlide(payload);
                    if (!slide) return;
                    rememberSessionPrefs(payload);
                    setSlides((q) => [...q, slide]);
                    setRepostMeta(null);
                    if (current) revokePreviewUrl(current.previewUrl);
                    setCurrent(null);
                    setStep('pick');
                    toast.success('اسلاید به صف اضافه شد');
                  }
                : undefined
            }
            onPublish={(payload) => {
              const slide = finalizeSlide(payload);
              if (!slide) return;
              rememberSessionPrefs(payload);
              const queue = [...slides, slide];
              publish.mutate(queue);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
