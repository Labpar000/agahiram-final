'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  Input,
  toast,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';

type Collection = {
  id: string;
  name: string;
  _count?: { saves: number };
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  onSaved?: () => void;
}

export function CollectionPickerDrawer({ open, onOpenChange, postId, onSaved }: Props) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const r = await apiClient.get<Collection[]>('/me/collections');
      return r.data ?? [];
    },
    enabled: open,
  });

  const saveToCollection = useMutation({
    mutationFn: async (collectionId: string) => {
      const r = await apiClient.post(`/posts/${postId}/save`, { collectionId });
      if (!r.success) throw new Error(r.error ?? 'خطا در ذخیره');
    },
    onSuccess: () => {
      toast.success('در مجموعه ذخیره شد');
      void qc.invalidateQueries({ queryKey: ['collections'] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
      onSaved?.();
      onOpenChange(false);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const createCollection = useMutation({
    mutationFn: async (name: string) => {
      const r = await apiClient.post<Collection>('/me/collections', { name });
      if (!r.success || !r.data) throw new Error(r.error ?? 'خطا در ساخت مجموعه');
      return r.data;
    },
    onSuccess: (col) => {
      void qc.invalidateQueries({ queryKey: ['collections'] });
      setNewName('');
      saveToCollection.mutate(col.id);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold">ذخیره در مجموعه</h2>
        </DrawerHeader>
        <DrawerBody className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>
          ) : collections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              هنوز مجموعه‌ای ندارید. یک نام وارد کنید و مجموعه بسازید.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {collections.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={saveToCollection.isPending}
                    onClick={() => saveToCollection.mutate(c.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start text-sm transition-colors hover:bg-muted disabled:opacity-60"
                  >
                    <span className="font-medium">{c.name}</span>
                    {c._count?.saves != null ? (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {c._count.saves} آگهی
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2 pt-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="نام مجموعه جدید"
              maxLength={80}
              aria-label="نام مجموعه جدید"
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={!newName.trim() || createCollection.isPending}
              isLoading={createCollection.isPending}
              onClick={() => createCollection.mutate(newName.trim())}
            >
              جدید
            </Button>
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            بستن
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
