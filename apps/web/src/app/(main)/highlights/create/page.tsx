'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, IconButton, IgArrowBack, Input, Label, LoadingState, toast } from '@agahiram/ui';
import { cn } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { StoryArchivePicker } from '@/features/stories/story-archive-picker';

interface StoryPick {
  id: string;
  mediaUrl: string;
  type: 'image' | 'video';
}

interface StoryGroup {
  userId: string;
  isMe?: boolean;
  stories: StoryPick[];
}

type SourceTab = 'live' | 'archive';

export default function CreateHighlightPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CreateHighlightInner />
    </Suspense>
  );
}

function CreateHighlightInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const preselectArchive = searchParams.get('archive');
  const [tab, setTab] = useState<SourceTab>(preselectArchive ? 'archive' : 'live');
  const [title, setTitle] = useState('');
  const [selectedLive, setSelectedLive] = useState<Set<string>>(new Set());
  const [selectedArchive, setSelectedArchive] = useState<Set<string>>(
    () => new Set(preselectArchive ? [preselectArchive] : []),
  );
  const [coverLiveId, setCoverLiveId] = useState<string | null>(null);
  const [coverArchiveId, setCoverArchiveId] = useState<string | null>(preselectArchive ?? null);

  const { data: groups, isLoading } = useQuery({
    queryKey: ['stories', 'feed'],
    queryFn: async () => {
      const r = await apiClient.get<StoryGroup[]>('/stories/feed');
      return r.data ?? [];
    },
  });

  const myStories = (groups ?? []).find((g) => g.isMe)?.stories ?? [];

  const selectedCount = tab === 'live' ? selectedLive.size : selectedArchive.size;
  const canSubmit = title.trim().length > 0 && selectedCount > 0;

  const create = useMutation({
    mutationFn: async () => {
      if (!canSubmit) throw new Error('عنوان و حداقل یک استوری لازم است');
      const body =
        tab === 'live'
          ? {
              title: title.trim(),
              storyIds: Array.from(selectedLive),
              coverStoryId: coverLiveId ?? Array.from(selectedLive)[0],
            }
          : {
              title: title.trim(),
              storyArchiveIds: Array.from(selectedArchive),
              coverStoryArchiveId: coverArchiveId ?? Array.from(selectedArchive)[0],
            };
      const r = await apiClient.post<{ id: string }>('/highlights', body);
      if (!r.success) throw new Error(r.error ?? 'خطا در ساخت هایلایت');
      return r.data;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['highlights'] });
      toast.success('هایلایت ساخته شد');
      router.replace(data?.id ? `/highlights/${data.id}` : '/');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleLive = (id: string) => {
    setSelectedLive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (coverLiveId === id) setCoverLiveId(null);
      } else {
        next.add(id);
        if (!coverLiveId) setCoverLiveId(id);
      }
      return next;
    });
  };

  const toggleArchive = (id: string) => {
    setSelectedArchive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (coverArchiveId === id) setCoverArchiveId(null);
      } else {
        next.add(id);
        if (!coverArchiveId) setCoverArchiveId(id);
      }
      return next;
    });
  };

  const emptyMessage = useMemo(() => {
    if (tab === 'live') {
      return 'ابتدا یک استوری زنده بسازید، یا از تب آرشیو استوری‌های گذشته را انتخاب کنید.';
    }
    return 'هنوز استوری در آرشیو نیست. پس از انقضای استوری‌ها اینجا ظاهر می‌شوند.';
  }, [tab]);

  if (isLoading) return <LoadingState label="در حال بارگذاری…" />;

  return (
    <div className="bg-background p-4">
      <div className="mb-4 flex items-center gap-2">
        <IconButton
          aria-label="بازگشت"
          icon={<IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} aria-hidden />}
          variant="ghost"
          onClick={() => router.back()}
        />
        <h1 className="text-lg font-bold">ساخت هایلایت</h1>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="title" required>
            عنوان هایلایت
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثلاً: آگهی‌های ویژه"
            minLength={1}
            maxLength={15}
          />
        </div>

        <div className="flex gap-2 rounded-lg bg-muted p-1">
          {(['live', 'archive'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={cn(
                'flex-1 rounded-md py-2 text-sm font-medium transition-colors',
                tab === t ? 'bg-background shadow-sm' : 'text-muted-foreground',
              )}
              onClick={() => setTab(t)}
            >
              {t === 'live' ? 'استوری زنده' : 'آرشیو'}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          برای کاور، روی تصویر انتخاب‌شده دوباره بزنید.
        </p>

        {tab === 'live' ? (
          myStories.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {myStories.map((s) => {
                const on = selectedLive.has(s.id);
                const isCover = coverLiveId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={cn(
                      'relative aspect-[9/16] overflow-hidden rounded-lg ring-2 transition-colors',
                      on ? 'ring-primary' : 'ring-transparent opacity-70',
                      isCover && 'ring-4 ring-primary',
                    )}
                    onClick={() => {
                      if (!on) {
                        toggleLive(s.id);
                        return;
                      }
                      if (isCover) toggleLive(s.id);
                      else setCoverLiveId(s.id);
                    }}
                  >
                    <Image src={s.mediaUrl} alt="" fill className="object-cover" sizes="120px" />
                  </button>
                );
              })}
            </div>
          )
        ) : (
          <StoryArchivePicker
            selected={selectedArchive}
            coverId={coverArchiveId}
            onToggle={toggleArchive}
            onSetCover={setCoverArchiveId}
          />
        )}

        <Button type="submit" variant="brand" disabled={create.isPending || !canSubmit}>
          {create.isPending ? 'در حال ذخیره…' : 'ساخت هایلایت'}
        </Button>
      </form>
    </div>
  );
}
