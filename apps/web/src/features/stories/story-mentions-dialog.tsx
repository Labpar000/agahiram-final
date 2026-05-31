'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';

export function StoryMentionsDialog({
  storyId,
  open,
  onOpenChange,
}: {
  storyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [raw, setRaw] = useState('');

  const save = useMutation({
    mutationFn: async () => {
      const usernames = raw
        .split(/[\s,]+/)
        .map((u) => u.replace(/^@/, '').trim())
        .filter(Boolean);
      if (!usernames.length) throw new Error('حداقل یک نام کاربری وارد کنید');
      const r = await apiClient.patch(`/stories/${storyId}/mentions`, { usernames });
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('منشن‌ها اضافه شد');
      setRaw('');
      onOpenChange(false);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>افزودن منشن</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="mentions">نام کاربری‌ها (با ویرگول جدا کنید)</Label>
          <Input
            id="mentions"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="@user1, user2"
          />
          <Button variant="brand" disabled={save.isPending} onClick={() => save.mutate()}>
            ذخیره منشن‌ها
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
