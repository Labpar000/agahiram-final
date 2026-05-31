'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { StoryOverlayDocument } from '@agahiram/shared';
import { Button } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  StoryOverlayEditor,
  type StoryOverlayEditorHandle,
} from '@/components/story-overlay-editor';
import { StoryStickerEditorPanel } from '@/features/stories/stickers/story-sticker-editor-panel';
import { StoryStickerComposerPreview } from '@/features/stories/stickers/story-sticker-composer-preview';
import { StoryPublishPreview } from '@/features/stories/story-publish-preview';
import { MAX_STORY_DURATION } from '@agahiram/shared';

export type PublishSticker = {
  type: string;
  payload: Record<string, unknown>;
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
};

export type StoryComposerPayload = {
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

const STICKER_LABELS: Record<string, string> = {
  POLL: 'نظرسنجی',
  LINK: 'لینک',
  QUESTION: 'سوال',
  HASHTAG: 'هشتگ',
  COUNTDOWN: 'شمارش',
  QUIZ: 'آزمون',
  SLIDER: 'اسلایدر',
};

export function StoryComposer({
  previewUrl,
  mediaType,
  mediaKey,
  videoDurationMs,
  isPublishing,
  onCancel,
  onPublish,
  onAddSlide,
  slideIndex,
  slideTotal,
  defaultAudience = 'PUBLIC',
  defaultAllowReplies = 'EVERYONE',
  defaultLinkedPostId,
  defaultRepost,
  defaultOverlay,
}: {
  previewUrl: string;
  mediaType: 'image' | 'video';
  mediaKey: string;
  videoDurationMs?: number;
  isPublishing?: boolean;
  onCancel: () => void;
  onPublish: (data: StoryComposerPayload) => void;
  onAddSlide?: (data: StoryComposerPayload) => void;
  slideIndex?: number;
  slideTotal?: number;
  defaultAudience?: 'PUBLIC' | 'CLOSE_FRIENDS';
  defaultAllowReplies?: string;
  defaultLinkedPostId?: string;
  defaultRepost?: { type: 'post' | 'story'; id: string };
  defaultOverlay?: StoryOverlayDocument;
}) {
  const searchParams = useSearchParams();
  const linkedFromUrl = searchParams.get('linkedPostId') ?? undefined;
  const [phase, setPhase] = useState<'edit' | 'preview'>('edit');
  const [previewDraft, setPreviewDraft] = useState<StoryComposerPayload | null>(null);
  const [editedOverlay, setEditedOverlay] = useState<StoryOverlayDocument | undefined>(
    defaultOverlay,
  );
  const [audience, setAudience] = useState<'PUBLIC' | 'CLOSE_FRIENDS'>(defaultAudience);
  const [allowReplies, setAllowReplies] = useState(defaultAllowReplies);
  const [linkedPostId, setLinkedPostId] = useState(defaultLinkedPostId ?? linkedFromUrl ?? '');
  const [stickers, setStickers] = useState<PublishSticker[]>([]);
  const [showStickers, setShowStickers] = useState(false);
  const [filterId, setFilterId] = useState('none');
  const [altText, setAltText] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const editorRef = useRef<StoryOverlayEditorHandle>(null);
  const overlayRef = useRef<StoryOverlayDocument>(defaultOverlay ?? { layers: [] });

  useEffect(() => {
    if (defaultOverlay?.layers?.length) {
      overlayRef.current = defaultOverlay;
      setEditedOverlay(defaultOverlay);
    }
  }, [defaultOverlay]);

  const handleOverlayChange = useCallback((doc: StoryOverlayDocument) => {
    overlayRef.current = doc;
  }, []);

  const username = useAuthStore((s) => s.user?.username);
  const { data: myPosts } = useQuery({
    queryKey: ['my-posts-story', username],
    queryFn: async () => {
      if (!username) return [];
      const r = await apiClient.get<{ data: Array<{ id: string; title: string }> }>(
        `/posts/user/${username}?limit=20`,
      );
      return r.data?.data ?? [];
    },
    enabled: !!username,
  });

  const collectPayload = (): StoryComposerPayload => ({
    overlay: overlayRef.current,
    audience,
    allowReplies,
    linkedPostId: linkedPostId || undefined,
    hashtag: stickers.find((s) => s.type === 'HASHTAG')?.payload?.tag as string | undefined,
    cityId: stickers.find((s) => s.type === 'LOCATION')?.payload?.cityId as string | undefined,
    stickers,
    altText: altText.trim() || undefined,
    scheduledAt: scheduledAt || undefined,
    repost: defaultRepost,
  });

  const goToPreview = () => {
    const overlay = editorRef.current?.getDocument() ?? overlayRef.current;
    overlayRef.current = overlay;
    setPreviewDraft({ ...collectPayload(), overlay });
    setPhase('preview');
  };

  const removeSticker = (index: number) => {
    setStickers((prev) => prev.filter((_, i) => i !== index));
  };

  if (phase === 'preview' && previewDraft) {
    return (
      <StoryPublishPreview
        previewUrl={previewUrl}
        mediaType={mediaType}
        overlay={previewDraft.overlay}
        stickers={previewDraft.stickers}
        isPublishing={isPublishing}
        publishLabel={onAddSlide ? 'انتشار همه اسلایدها' : 'انتشار'}
        onBack={() => {
          if (previewDraft.overlay) {
            overlayRef.current = previewDraft.overlay;
            setEditedOverlay(previewDraft.overlay);
          }
          setPhase('edit');
        }}
        onPublish={() => onPublish(previewDraft)}
        onAddSlide={
          onAddSlide
            ? () => {
                onAddSlide(previewDraft);
                setPhase('edit');
                setPreviewDraft(null);
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {slideTotal && slideTotal > 1 ? (
        <p className="text-center text-xs text-muted-foreground">
          اسلاید {(slideIndex ?? 0) + 1} از {slideTotal}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 text-xs">
        <select
          className="rounded-lg border border-border bg-background px-2 py-1"
          value={audience}
          onChange={(e) => setAudience(e.target.value as 'PUBLIC' | 'CLOSE_FRIENDS')}
        >
          <option value="PUBLIC">همه</option>
          <option value="CLOSE_FRIENDS">دوستان نزدیک</option>
        </select>
        <select
          className="rounded-lg border border-border bg-background px-2 py-1"
          value={allowReplies}
          onChange={(e) => setAllowReplies(e.target.value)}
        >
          <option value="EVERYONE">پاسخ: همه</option>
          <option value="FOLLOWERS">فقط دنبال‌کنندگان</option>
          <option value="FOLLOWING">فقط دنبال‌شده</option>
          <option value="OFF">بدون پاسخ</option>
        </select>
        <select
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1"
          value={linkedPostId}
          onChange={(e) => setLinkedPostId(e.target.value)}
        >
          <option value="">بدون آگهی</option>
          {(myPosts ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <Button size="sm" variant="outline" onClick={() => setShowStickers((s) => !s)}>
          استیکر ({stickers.length})
        </Button>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground" htmlFor="alt-text">
          متن جایگزین (دسترسی‌پذیری)
        </label>
        <input
          id="alt-text"
          className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          maxLength={500}
          placeholder="توضیح کوتاه برای بینایی"
        />
        <label className="text-xs text-muted-foreground" htmlFor="schedule">
          زمان‌بندی انتشار (اختیاری)
        </label>
        <input
          id="schedule"
          type="datetime-local"
          className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
        <p className="text-[10px] text-muted-foreground">ویدیو حداکثر {MAX_STORY_DURATION} ثانیه</p>
      </div>

      {showStickers ? (
        <StoryStickerEditorPanel onAdd={(s) => setStickers((prev) => [...prev, s])} />
      ) : null}

      {stickers.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {stickers.map((s, i) => (
            <button
              key={`${s.type}-${i}`}
              type="button"
              className="rounded-full bg-muted px-2 py-0.5 text-[10px]"
              onClick={() => removeSticker(i)}
            >
              {STICKER_LABELS[s.type] ?? s.type} ×
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <StoryOverlayEditor
          ref={editorRef}
          previewUrl={previewUrl}
          mediaType={mediaType}
          embedMode
          isPublishing={isPublishing}
          stickers={stickers}
          onStickersChange={setStickers}
          filterId={filterId}
          onFilterChange={setFilterId}
          onChange={handleOverlayChange}
          defaultOverlay={editedOverlay}
        />
        <StoryStickerComposerPreview stickers={stickers} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button variant="outline" fullWidth onClick={onCancel}>
            لغو
          </Button>
          <Button variant="brand" fullWidth onClick={goToPreview}>
            پیش‌نمایش
          </Button>
        </div>
      </div>

      <input type="hidden" value={mediaKey} readOnly />
      <input type="hidden" value={videoDurationMs ?? ''} readOnly />
    </div>
  );
}
