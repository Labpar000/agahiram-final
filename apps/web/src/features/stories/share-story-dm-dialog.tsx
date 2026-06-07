'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  toast,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';

export function ShareStoryDmDialog({
  storyId,
  open,
  onOpenChange,
}: {
  storyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [username, setUsername] = useState('');

  const share = useMutation({
    mutationFn: async () => {
      const u = username.replace(/^@/, '').trim();
      if (!u) throw new Error('نام کاربری را وارد کنید');
      const r = await apiClient.post<{ conversationId?: string }>('/stories/share-dm', {
        username: u,
        storyId,
      });
      if (!r.success) throw new Error(r.error ?? 'خطا');
      return r.data;
    },
    onSuccess: (data) => {
      toast.success('استوری در پیام‌ها ارسال شد');
      onOpenChange(false);
      setUsername('');
      if (data?.conversationId) router.push(`/messages/${data.conversationId}`);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>ارسال استوری در پیام</DialogTitle>
          <DialogDescription>استوری را برای کاربر مورد نظر ارسال کنید.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="نام کاربری"
            dir="ltr"
          />
          <Button
            variant="brand"
            fullWidth
            isLoading={share.isPending}
            onClick={() => share.mutate()}
          >
            ارسال
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
