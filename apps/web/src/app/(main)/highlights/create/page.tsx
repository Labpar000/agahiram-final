'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Button, IconButton, Input, Label, LoadingState, toast } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { cn } from '@agahiram/shared';

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

export default function CreateHighlightPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [coverId, setCoverId] = useState<string | null>(null);

  const { data: groups, isLoading } = useQuery({
    queryKey: ['stories', 'feed'],
    queryFn: async () => {
      const r = await apiClient.get<StoryGroup[]>('/stories/feed');
      return r.data ?? [];
    },
  });

  const myStories = (groups ?? []).find((g) => g.isMe)?.stories ?? [];

  const create = useMutation({
    mutationFn: async () => {
      const storyIds = Array.from(selected);
      if (!title.trim() || storyIds.length === 0) {
        throw new Error('عنوان و حداقل یک استوری لازم است');
      }
      const r = await apiClient.post<{ id: string }>('/highlights', {
        title: title.trim(),
        storyIds,
        coverStoryId: coverId ?? storyIds[0],
      });
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

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (coverId === id) setCoverId(null);
      } else {
        next.add(id);
        if (!coverId) setCoverId(id);
      }
      return next;
    });
  };

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
        <h1 className="text-lg font-bold">ساخت هایلایت</h1>
      </div>

      {myStories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          ابتدا یک استوری بسازید، سپس می‌توانید آن را در هایلایت ذخیره کنید.
        </p>
      ) : (
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
          <p className="text-xs text-muted-foreground">
            استوری‌های موردنظر را انتخاب کنید. برای کاور، روی تصویر انتخاب‌شده دوباره بزنید.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {myStories.map((s) => {
              const on = selected.has(s.id);
              const isCover = coverId === s.id;
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
                      toggle(s.id);
                      return;
                    }
                    if (isCover) toggle(s.id);
                    else setCoverId(s.id);
                  }}
                >
                  <Image src={s.mediaUrl} alt="" fill className="object-cover" sizes="120px" />
                </button>
              );
            })}
          </div>
          <Button
            type="submit"
            variant="brand"
            disabled={create.isPending || !title.trim() || selected.size === 0}
          >
            {create.isPending ? 'در حال ذخیره…' : 'ساخت هایلایت'}
          </Button>
        </form>
      )}
    </div>
  );
}
