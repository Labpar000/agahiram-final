'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
  toast,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';

const REPORT_REASONS: Record<string, string> = {
  SPAM: 'اسپم',
  INAPPROPRIATE: 'محتوای نامناسب',
  MISLEADING: 'گمراه‌کننده',
  OFFENSIVE: 'توهین‌آمیز',
  OTHER: 'سایر',
};

interface ReportAdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adId: string;
}

export function ReportAdDialog({ open, onOpenChange, adId }: ReportAdDialogProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const reportMutation = useMutation({
    mutationFn: async () => {
      const r = await apiClient.post(`/ads/${adId}/report`, {
        reason,
        details: details || undefined,
      });
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('گزارش با موفقیت ثبت شد');
      onOpenChange(false);
      setReason('');
      setDetails('');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            گزارش تبلیغ
          </DialogTitle>
          <DialogDescription>لطفاً دلیل گزارش خود را انتخاب کنید</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>دلیل</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(REPORT_REASONS).map(([key, label]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={reason === key ? 'brand' : 'outline'}
                  onClick={() => setReason(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="report-details">توضیحات (اختیاری)</Label>
            <Textarea
              id="report-details"
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="توضیحات بیشتر..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button
            variant="destructive"
            disabled={!reason}
            isLoading={reportMutation.isPending}
            onClick={() => reportMutation.mutate()}
          >
            ثبت گزارش
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
