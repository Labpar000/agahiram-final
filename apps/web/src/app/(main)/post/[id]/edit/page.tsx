'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Button, IconButton, Input, Label, LoadingState, Textarea, toast } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import type { PostDetail } from '../post-detail-client';

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
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

  useEffect(() => {
    if (!data) return;
    setTitle(String(data.title ?? ''));
    setDescription(String(data.description ?? ''));
    setPrice(data.price != null ? String(data.price) : '');
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const r = await apiClient.patch(`/posts/${id}`, {
        title,
        description: description || undefined,
        price: price ? Number(price) : null,
      });
      if (!r.success) throw new Error(r.error ?? 'خطا در ذخیره');
      return r.data;
    },
    onSuccess: () => {
      toast.success('آگهی با موفقیت ویرایش شد');
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
          <Button type="submit" variant="brand" disabled={save.isPending || title.length < 3}>
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
