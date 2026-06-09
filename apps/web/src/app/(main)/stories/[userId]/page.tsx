'use client';

import { Suspense, use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StoryViewer, type User } from 'react-instagram-stories';
import 'react-instagram-stories/styles.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdSlot, formatPersianNumber, formatRelativeTimeFa } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { connectStorySocket, SOCKET_EVENTS } from '@/lib/story-socket';
import { toast } from '@agahiram/ui';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Drawer,
  DrawerContent,
  Spinner,
  IgComment,
  IgExternalLink,
  IgEye,
  IgMore,
  IgShare2026,
  IgMention,
  IgTrash,
  IconButton,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@agahiram/ui';
import { StoryCommentsSheet } from '@/features/stories/story-comments-sheet';
import {
  StoryInsightsPanel,
  type StoryInsightsData,
} from '@/features/stories/story-insights-panel';
import { StoryMentionsDialog } from '@/features/stories/story-mentions-dialog';
import { ShareStoryDmDialog } from '@/features/stories/share-story-dm-dialog';
import {
  StoryStickerResultsPanel,
  type StickerResultRow,
} from '@/features/stories/stickers/story-sticker-results';
import { downloadBlob } from '@/features/stories/story-media-utils';
import { useAdsConfig, useServedAds } from '@/hooks/use-ads';
import { injectStoryAds, isSponsoredUserId, sponsoredAdIdFromUserId } from '@/lib/inject-story-ads';
import { trackAdClick, trackAdImpression } from '@/lib/ad-tracking';
import { SponsoredBadge } from '@/components/sponsored-badge';

/* ─────────────────── Types ─────────────────── */

interface ApiStoryGroup {
  userId: string;
  user: { id: string; username: string | null; avatar: string | null };
  stories: Array<{
    id: string;
    mediaUrl: string;
    thumbnailUrl?: string | null;
    hlsUrl?: string | null;
    type: 'image' | 'video';
    linkedPostId: string | null;
    viewerCount?: number;
    commentCount?: number;
    createdAt?: string;
    durationMs?: number;
    overlayJson?: unknown;
    stickers?: Array<{
      id: string;
      type: string;
      payload: Record<string, unknown>;
      x?: number;
      y?: number;
      scale?: number;
      rotation?: number;
    }>;
    allowReplies?: string;
  }>;
  isMe?: boolean;
}

interface ViewerListResponse {
  count: number;
  reactionBreakdown?: Array<{ emoji: string; count: number }>;
  viewers: Array<{
    id: string;
    username: string | null;
    name: string | null;
    avatar: string | null;
    isVerified: boolean;
    viewedAt: string;
  }>;
}

const QUICK_REACTIONS = ['❤️', '🔥', '😂', '😢', '😮', '👏', '🎉', '💯'];

/* ─────────────────── Entry ─────────────────── */

export default function StoryViewerPage({ params }: { params: Promise<{ userId: string }> }) {
  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <StoryViewerContent params={params} />
    </Suspense>
  );
}

/* ─────────────────── Main Content ─────────────────── */

function StoryViewerContent({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();
  const me = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  /* Data */
  const { data: groups, isLoading } = useQuery({
    queryKey: ['stories', 'feed'],
    queryFn: async () => {
      const r = await apiClient.get<ApiStoryGroup[]>('/stories/feed');
      return r.data ?? [];
    },
  });

  const { data: adsConfig } = useAdsConfig();
  const { data: storyAds = [] } = useServedAds(AdSlot.STORY, {
    limit: 3,
    enabled: !!adsConfig?.adsEnabled,
  });

  const mappedUsers = useMemo(() => {
    const base = mapGroups(groups ?? []);
    if (!adsConfig?.adsEnabled) return base;
    return injectStoryAds(base, storyAds, adsConfig.adsStoryInterval ?? 5);
  }, [groups, storyAds, adsConfig?.adsEnabled, adsConfig?.adsStoryInterval]);
  const initialUserIdx = useMemo(
    () => mappedUsers.findIndex((u) => u.id === userId),
    [mappedUsers, userId],
  );

  /* Active story tracking */
  const [userIdx, setUserIdx] = useState(initialUserIdx >= 0 ? initialUserIdx : 0);
  const [storyIdx, setStoryIdx] = useState(0);
  const [activeUserId, setActiveUserId] = useState(userId);

  const activeGroup = (groups ?? []).find((g) => g.userId === activeUserId);
  const activeStory = activeGroup?.stories[storyIdx];
  const isOwner = !!me && me.id === activeUserId;

  /* Dialogs */
  const [page, setPage] = useState<
    'viewer' | 'comments' | 'insights' | 'mentions' | 'share' | 'delete'
  >('viewer');
  const [floatingEmoji, setFloatingEmoji] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  /* Owner queries */
  const viewersQuery = useQuery({
    queryKey: ['story-viewers', activeStory?.id],
    queryFn: async () => {
      const r = await apiClient.get<ViewerListResponse>(`/stories/${activeStory!.id}/views`);
      return r.data ?? { count: 0, viewers: [] };
    },
    enabled: isOwner && !!activeStory,
  });

  const storyInsightsQuery = useQuery({
    queryKey: ['story-insights', activeStory?.id],
    queryFn: async () => {
      const r = await apiClient.get<StoryInsightsData>(`/stories/${activeStory!.id}/insights`);
      return r.data;
    },
    enabled: isOwner && page === 'insights' && !!activeStory,
  });

  const stickerResultsQuery = useQuery({
    queryKey: ['story-sticker-results', activeStory?.id],
    queryFn: async () => {
      const r = await apiClient.get<Record<string, unknown>[]>(
        `/stories/${activeStory!.id}/stickers/results`,
      );
      return (r.data ?? []) as Record<string, unknown>[];
    },
    enabled: isOwner && !!activeStory,
  });

  /* Mark viewed */
  useEffect(() => {
    if (!activeStory?.id) return;
    if (isSponsoredUserId(activeUserId)) {
      const adId = sponsoredAdIdFromUserId(activeUserId);
      if (!adId) return;
      const t = setTimeout(() => void trackAdImpression(adId, 'story'), 2000);
      return () => clearTimeout(t);
    }
    void apiClient.post(`/stories/${activeStory.id}/view`);
  }, [activeStory?.id, activeUserId]);

  /* Socket — live viewer count */
  useEffect(() => {
    if (!isOwner || !me?.id || !activeStory?.id) return;
    const socket = connectStorySocket();
    const onView = (p: { storyId?: string }) => {
      if (p.storyId === activeStory.id)
        void qc.invalidateQueries({ queryKey: ['story-viewers', activeStory.id] });
    };
    socket.on(SOCKET_EVENTS.STORY_VIEW, onView);
    return () => {
      socket.off(SOCKET_EVENTS.STORY_VIEW, onView);
    };
  }, [isOwner, me?.id, activeStory?.id, qc]);

  /* Navigation tracking */
  const handleStoryChange = useCallback(
    (ui: number, si: number) => {
      setUserIdx(ui);
      setStoryIdx(si);
      const u = mappedUsers[ui];
      if (u) setActiveUserId(u.id);
    },
    [mappedUsers],
  );

  /* Actions */
  const sendReaction = async (emoji: string) => {
    if (!activeStory) return;
    setFloatingEmoji(emoji);
    setTimeout(() => setFloatingEmoji(null), 1200);
    await apiClient.post(`/stories/${activeStory.id}/reactions`, { emoji });
  };

  const sendReply = async () => {
    if (!activeStory || !replyText.trim()) return;
    const r = await apiClient.post(`/stories/${activeStory.id}/reply`, { text: replyText.trim() });
    if (r.success) {
      toast.success('پاسخ ارسال شد');
      setReplyText('');
    } else toast.error(r.error ?? 'خطا');
  };

  const handleDelete = async () => {
    if (!activeStory) return;
    const r = await apiClient.delete(`/stories/${activeStory.id}`);
    if (r.success) {
      toast.success('حذف شد');
      void qc.invalidateQueries({ queryKey: ['stories', 'feed'] });
      router.back();
    } else toast.error(r.error ?? 'حذف ناموفق بود');
  };

  /* Loading/Empty states */
  if (isLoading) return <FullScreenSpinner />;
  if (mappedUsers.length === 0 || initialUserIdx < 0) {
    return (
      <div className="fixed inset-0 z-[9999] grid place-items-center bg-black text-white">
        <div className="text-center">
          <p className="mb-3 text-sm">استوری در دسترس نیست</p>
          <button
            onClick={() => router.back()}
            className="rounded-full bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25"
          >
            بازگشت
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Library viewer (z-index: 9999 internally) ── */}
      <StoryViewer
        users={mappedUsers}
        isOpen
        initialUserIndex={initialUserIdx}
        initialStoryIndex={0}
        onClose={() => router.back()}
        onStoryChange={handleStoryChange}
      />

      {/* ── Custom overlay layer (above library's z=9999) ── */}
      <div className="fixed inset-0 z-[10000] pointer-events-none flex justify-center">
        <div className="pointer-events-auto relative w-full max-w-[420px] h-dvh">
          {/* Sponsored story CTA */}
          {isSponsoredUserId(activeUserId) ? (
            <div className="absolute start-3 top-14 z-30">
              <SponsoredBadge />
            </div>
          ) : null}
          {isSponsoredUserId(activeUserId) ? (
            <div className="absolute inset-x-0 bottom-40 z-30 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  const adId = sponsoredAdIdFromUserId(activeUserId);
                  if (!adId) return;
                  void trackAdClick(adId).then((url) => {
                    if (url) window.open(url, '_blank', 'noopener,noreferrer');
                  });
                }}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-neutral-900 shadow-lg tap-none hover:scale-[1.03] transition-transform"
              >
                <IgExternalLink className="size-3.5" strokeWidth={1.75} aria-hidden />
                بیشتر بدانید
              </button>
            </div>
          ) : null}

          {/* Linked post banner */}
          {activeStory?.linkedPostId && !isSponsoredUserId(activeUserId) ? (
            <div className="absolute inset-x-0 bottom-40 z-30 flex justify-center">
              <Link
                href={`/post/${activeStory.linkedPostId}`}
                onClick={() => {
                  void apiClient.post(`/stories/${activeStory.id}/link-click`, {
                    url: `/post/${activeStory.linkedPostId}`,
                  });
                }}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-neutral-900 shadow-lg tap-none hover:scale-[1.03] transition-transform"
              >
                <IgExternalLink className="size-3.5" strokeWidth={1.75} aria-hidden />
                مشاهده آگهی
              </Link>
            </div>
          ) : null}

          {/* Floating emoji */}
          <AnimatePresence>
            {floatingEmoji ? (
              <motion.span
                key={floatingEmoji}
                initial={{ opacity: 0, y: 20, scale: 0.5 }}
                animate={{ opacity: 1, y: -80, scale: 1.2 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute left-1/2 top-1/2 z-40 -translate-x-1/2 text-5xl"
              >
                {floatingEmoji}
              </motion.span>
            ) : null}
          </AnimatePresence>

          {/* Footer overlay */}
          <div className="absolute inset-x-0 bottom-0 z-[var(--z-chrome)]">
            {isOwner ? (
              <OwnerFooter
                viewersCount={activeStory?.viewerCount ?? 0}
                onInsights={() => setPage('insights')}
                onComments={() => setPage('comments')}
                onDelete={() => setPage('delete')}
                onShare={() => setPage('share')}
                onMentions={() => setPage('mentions')}
              />
            ) : (
              <ViewerFooter
                username={activeGroup?.user.username ?? ''}
                allowReplies={activeStory?.allowReplies}
                replyText={replyText}
                setReplyText={setReplyText}
                onSendReply={sendReply}
                onReaction={sendReaction}
                onComments={() => setPage('comments')}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Dialogs ── */}
      {activeStory ? (
        <StoryCommentsSheet
          storyId={activeStory.id}
          storyOwnerId={activeUserId}
          open={page === 'comments'}
          onOpenChange={(v) => setPage(v ? 'comments' : 'viewer')}
        />
      ) : null}
      {isOwner && activeStory ? (
        <StoryMentionsDialog
          storyId={activeStory.id}
          open={page === 'mentions'}
          onOpenChange={(v) => setPage(v ? 'mentions' : 'viewer')}
        />
      ) : null}
      {isOwner && activeStory ? (
        <ShareStoryDmDialog
          storyId={activeStory.id}
          open={page === 'share'}
          onOpenChange={(v) => setPage(v ? 'share' : 'viewer')}
        />
      ) : null}

      {/* Owner insights drawer */}
      {isOwner ? (
        <Drawer open={page === 'insights'} onOpenChange={(v) => setPage(v ? 'insights' : 'viewer')}>
          <DrawerContent className="max-h-[80vh]">
            <div
              aria-hidden
              className="mx-auto mb-2 mt-1.5 h-1 w-10 rounded-full bg-muted-foreground/25"
            />
            <div className="space-y-3 overflow-y-auto p-4 pt-0">
              <h3 className="text-base font-bold tracking-tight">بازدیدکنندگان استوری</h3>
              <StoryInsightsPanel
                data={storyInsightsQuery.data}
                isLoading={storyInsightsQuery.isLoading}
              />
              <p className="text-sm text-muted-foreground">
                {viewersQuery.isLoading
                  ? 'در حال بارگذاری…'
                  : `${formatPersianNumber(viewersQuery.data?.count ?? 0)} بازدید`}
              </p>
              {(viewersQuery.data?.reactionBreakdown ?? []).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {viewersQuery.data!.reactionBreakdown!.map((r) => (
                    <span key={r.emoji} className="rounded-full bg-muted px-2 py-1 text-xs">
                      {r.emoji} {formatPersianNumber(r.count)}
                    </span>
                  ))}
                </div>
              ) : null}
              <StoryStickerResultsPanel
                results={(stickerResultsQuery.data ?? []) as unknown as StickerResultRow[]}
              />
              <ul className="divide-y divide-border">
                {(viewersQuery.data?.viewers ?? []).map((v) => (
                  <li key={v.id} className="flex items-center gap-3 py-2.5">
                    <Avatar size="md" verified={v.isVerified}>
                      {v.avatar ? <AvatarImage src={v.avatar} alt="" /> : null}
                      <AvatarFallback>{(v.username ?? '?').slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{v.username}</p>
                      {v.name ? (
                        <p className="truncate text-xs text-muted-foreground">{v.name}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatRelativeTimeFa(v.viewedAt)}
                    </span>
                  </li>
                ))}
              </ul>
              {activeStory ? (
                <button
                  type="button"
                  className="w-full rounded-lg border border-border py-2 text-sm font-medium hover:bg-muted/50"
                  onClick={async () => {
                    try {
                      const res = await fetch(activeStory.mediaUrl);
                      const blob = await res.blob();
                      await downloadBlob(
                        blob,
                        `story-${activeStory.id}.${activeStory.type === 'video' ? 'mp4' : 'jpg'}`,
                      );
                      toast.success('دانلود شروع شد');
                    } catch {
                      toast.error('ذخیره در دستگاه ناموفق بود');
                    }
                  }}
                >
                  ذخیره در دستگاه
                </button>
              ) : null}
            </div>
          </DrawerContent>
        </Drawer>
      ) : null}

      <Dialog open={page === 'delete'} onOpenChange={(v) => setPage(v ? 'delete' : 'viewer')}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف استوری</DialogTitle>
            <DialogDescription>
              آیا مطمئن هستید که این استوری حذف شود؟ این عمل قابل بازگشت نیست.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setPage('viewer')}>
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setPage('viewer');
                void handleDelete();
              }}
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─────────────────── Footer Components ─────────────────── */

function OwnerFooter({
  viewersCount,
  onInsights,
  onComments,
  onMentions,
  onShare,
  onDelete,
}: {
  viewersCount: number;
  onInsights: () => void;
  onComments: () => void;
  onMentions: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="px-4 pt-14 pb-[calc(var(--safe-bottom,0px)+0.75rem)]"
      style={{
        background:
          'linear-gradient(0deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0) 100%)',
      }}
    >
      {/* Insights button */}
      <button
        type="button"
        onClick={onInsights}
        className="mx-auto flex w-full max-w-xs items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 py-2.5 text-[13px] font-semibold text-white backdrop-blur-md tap-none hover:bg-white/15 mb-2"
      >
        <IgEye className="size-4" strokeWidth={1.75} aria-hidden />
        {formatPersianNumber(viewersCount)} بازدید
      </button>

      {/* Action row */}
      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={onComments}
          className="grid size-9 place-items-center text-white/85 tap-none"
        >
          <IgComment className="size-5" strokeWidth={1.5} aria-hidden />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              className="size-9 text-white/85 hover:bg-white/10 hover:text-white"
              aria-label="گزینه‌ها"
              icon={<IgMore className="size-5" strokeWidth={1.5} aria-hidden />}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[11rem]">
            <DropdownMenuItem onClick={onMentions}>
              <IgMention className="size-4" strokeWidth={1.75} aria-hidden /> منشن
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShare}>
              <IgShare2026 className="size-4" strokeWidth={1.75} aria-hidden /> اشتراک در پیام
            </DropdownMenuItem>
            <DropdownMenuItem destructive onClick={onDelete}>
              <IgTrash className="size-4" strokeWidth={1.75} aria-hidden /> حذف استوری
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function ViewerFooter({
  username,
  allowReplies,
  replyText,
  setReplyText,
  onSendReply,
  onReaction,
  onComments,
}: {
  username: string;
  allowReplies?: string;
  replyText: string;
  setReplyText: (s: string) => void;
  onSendReply: () => void;
  onReaction: (emoji: string) => void;
  onComments: () => void;
}) {
  return (
    <div
      className="px-4 pt-12 pb-[calc(var(--safe-bottom,0px)+0.5rem)]"
      style={{
        background:
          'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0) 100%)',
      }}
    >
      {/* Quick reaction emoji bar */}
      <div className="mb-3 flex items-center justify-center gap-2">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onReaction(emoji)}
            className="grid size-9 place-items-center rounded-full text-xl tap-none hover:scale-125 active:scale-90 transition-transform"
            aria-label={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Reply input row */}
      {allowReplies !== 'OFF' ? (
        <form
          className="flex items-center gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            onSendReply();
          }}
        >
          <button
            type="button"
            onClick={onComments}
            className="grid size-9 shrink-0 place-items-center text-white/85 tap-none"
          >
            <IgComment className="size-6" strokeWidth={1.5} aria-hidden />
          </button>
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={`پاسخ به ${username}…`}
            className="h-9 flex-1 rounded-full border border-white/25 bg-white/15 px-4 text-[13px] text-white placeholder:text-white/50 backdrop-blur-sm outline-none"
          />
          {replyText.trim() ? (
            <button type="submit" className="shrink-0 text-sm font-semibold text-white/90 tap-none">
              ارسال
            </button>
          ) : (
            <button
              type="button"
              aria-label="ارسال عکس"
              className="grid size-9 shrink-0 place-items-center text-white/80 tap-none"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            </button>
          )}
        </form>
      ) : null}
    </div>
  );
}

/* ─────────────────── Helpers ─────────────────── */

function FullScreenSpinner() {
  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-black">
      <Spinner size="xl" className="text-white" />
    </div>
  );
}

function mapGroups(groups: ApiStoryGroup[]): User[] {
  return groups.map((g) => ({
    id: g.userId,
    username: g.isMe ? 'استوری شما' : (g.user.username ?? 'کاربر'),
    avatarUrl: g.user.avatar ?? '',
    hasUnreadStories: true,
    stories: g.stories.map((s) => ({
      id: s.id,
      type: s.type,
      src: s.mediaUrl,
      duration: s.type === 'image' ? (s.durationMs ?? 5000) : undefined,
      alt: '',
    })),
  }));
}
