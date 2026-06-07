'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
type ReportTargetType = 'post' | 'story' | 'user' | 'comment';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';

const REASONS = ['محتوای نامناسب', 'کلاهبرداری', 'اسپم', 'سایر'] as const;

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  title = 'گزارش',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
  title?: string;
}) {
  const [reason, setReason] = useState<(typeof REASONS)[number]>('محتوای نامناسب');
  const [details, setDetails] = useState('');

  const submit = useMutation({
    mutationFn: async () => {
      const r = await apiClient.post('/reports', {
        targetType,
        targetId,
        reason,
        details: details.trim() || undefined,
      });
      if (!r.success) throw new Error(r.error ?? 'خطا در ثبت گزارش');
      return r.data;
    },
    onSuccess: () => {
      toast.success('گزارش شما با موفقیت ثبت شد. متشکریم.');
      onOpenChange(false);
      setDetails('');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>دلیل گزارش</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as (typeof REASONS)[number])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-details">توضیحات (اختیاری)</Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="جزئیات بیشتر…"
            />
          </div>
          <Button
            variant="brand"
            fullWidth
            onClick={() => submit.mutate()}
            isLoading={submit.isPending}
          >
            ارسال گزارش
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
