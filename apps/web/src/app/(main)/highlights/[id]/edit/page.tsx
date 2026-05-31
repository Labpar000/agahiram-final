'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Button, IconButton, Input, Label, LoadingState, toast } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function EditHighlightPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const username = useAuthStore((s) => s.user?.username);
  const [title, setTitle] = useState('');
  const [coverStoryId, setCoverStoryId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['highlight-edit', id, username],
    queryFn: async () => {
      if (!username) throw new Error('وارد شوید');
      const [highlightsRes, storiesRes] = await Promise.all([
        apiClient.get<Array<{ id: string; title: string; coverUrl: string | null }>>(
          `/users/${username}/highlights`,
        ),
        apiClient.get<Array<{ id: string; mediaUrl: string }>>(`/highlights/${id}/stories`),
      ]);
      const meta = (highlightsRes.data ?? []).find((h) => h.id === id);
      if (!meta) throw new Error('هایلایت یافت نشد');
      const stories = storiesRes.data ?? [];
      const cover = stories.find((s) => s.mediaUrl === meta.coverUrl)?.id ?? stories[0]?.id ?? null;
      return { meta, stories, coverStoryId: cover };
    },
    enabled: !!username,
  });

  useEffect(() => {
    if (!data) return;
    setTitle(data.meta.title);
    setCoverStoryId(data.coverStoryId);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const r = await apiClient.patch(`/highlights/${id}`, {
        title: title.trim(),
        ...(coverStoryId ? { coverStoryId } : {}),
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

  if (isLoading || !data) return <LoadingState label="در حال بارگذاری…" />;

  return (
    <div className="bg-background p-4">
      <div className="mb-4 flex items-center gap-2">
        <IconButton
          aria-label="بازگشت"
          icon={<ArrowRight className="size-5 rtl:rotate-180" aria-hidden />}
          variant="ghost"
          onClick={() => router.back()}
        />
        <h1 className="text-lg font-bold">ویرایش هایلایت</h1>
      </div>
      <form
        className="space-y-4"
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
        <div className="space-y-2">
          <Label>کاور</Label>
          <div className="flex flex-wrap gap-2">
            {data.stories.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`size-16 overflow-hidden rounded-full ring-2 ${
                  coverStoryId === s.id ? 'ring-primary' : 'ring-border'
                }`}
                onClick={() => setCoverStoryId(s.id)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.mediaUrl} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        <Button type="submit" variant="brand" disabled={save.isPending || !title.trim()}>
          ذخیره
        </Button>
      </form>
    </div>
  );
}
