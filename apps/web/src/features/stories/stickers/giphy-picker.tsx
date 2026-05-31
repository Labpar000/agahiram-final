'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@agahiram/ui';
import { apiClient } from '@/lib/api';

export function GiphyPicker({
  onPick,
}: {
  onPick: (gif: { id: string; url: string; previewUrl: string }) => void;
}) {
  const [q, setQ] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['giphy', q],
    queryFn: async () => {
      const r = await apiClient.get<{
        data: Array<{ id: string; url: string; previewUrl: string }>;
      }>('/integrations/giphy/search', { q: q || 'happy', limit: 16 });
      return r.data?.data ?? [];
    },
    staleTime: 60_000,
  });

  return (
    <div className="space-y-2">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="جستجوی GIF…"
        className="text-xs"
      />
      {isLoading ? (
        <p className="text-xs text-muted-foreground">در حال جستجو…</p>
      ) : (data ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">
          GIFی یافت نشد. در سرور متغیر GIPHY_API_KEY را تنظیم کنید.
        </p>
      ) : (
        <div className="grid max-h-36 grid-cols-4 gap-1 overflow-y-auto">
          {(data ?? []).map((g) => (
            <button
              key={g.id}
              type="button"
              className="relative aspect-square overflow-hidden rounded-md bg-muted"
              onClick={() => onPick(g)}
            >
              <Image src={g.previewUrl} alt="" fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
