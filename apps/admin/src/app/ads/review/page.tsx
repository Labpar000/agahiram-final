'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Eye, Megaphone, XCircle } from 'lucide-react';
import { formatJalaliDate, formatPersianNumber } from '@agahiram/shared';
import {
  Badge,
  Button,
  Card,
  CardContent,
  ErrorState,
  Spinner,
  Textarea,
  toast,
} from '@agahiram/ui';
import Shell from '../../layout-shell';
import { apiClient } from '@/lib/api';

interface AdItem {
  id: string;
  title: string | null;
  description: string | null;
  mediaUrl: string;
  redirectUrl: string | null;
  slot: string;
  status: string;
  createdAt: string;
  campaign: {
    id: string;
    name: string;
    advertiser: { id: string; username: string | null; name: string | null };
  };
}

const SLOT_LABELS: Record<string, string> = {
  STORY: 'استوری',
  EXPLORE_FEED: 'اکسپلور',
  BANNER: 'بنر',
};

export default function AdsReviewPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<AdItem | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'ads', 'pending', page],
    queryFn: async () =>
      (
        await apiClient.get<{
          data: AdItem[];
          total: number;
          page: number;
          pageSize: number;
          totalPages: number;
        }>('/ads/admin/pending', { page, pageSize: 20 })
      ).data,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.post(`/ads/admin/ads/${id}/review`, { action: 'approve' });
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('تایید شد');
      qc.invalidateQueries({ queryKey: ['admin', 'ads'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const r = await apiClient.post(`/ads/admin/ads/${id}/review`, { action: 'reject', note });
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('رد شد');
      setRejectTargetId(null);
      setRejectNote('');
      qc.invalidateQueries({ queryKey: ['admin', 'ads'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading)
    return (
      <Shell>
        <div className="grid place-items-center py-16">
          <Spinner className="size-8" />
        </div>
      </Shell>
    );
  if (isError)
    return (
      <Shell>
        <ErrorState onRetry={() => void refetch()} />
      </Shell>
    );

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-h2 font-extrabold tracking-tight">بررسی تبلیغات</h1>
        <p className="mt-1 text-sm text-muted-foreground">بررسی و تایید یا رد تبلیغات در انتظار</p>
      </div>

      <Card>
        <CardContent className="!p-4">
          {data?.data.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              تبلیغی در انتظار بررسی نیست
            </div>
          ) : (
            <div className="space-y-3">
              {data?.data.map((ad) => (
                <div
                  key={ad.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <img
                    src={ad.mediaUrl}
                    alt=""
                    className="size-16 rounded-md object-cover shrink-0 bg-muted"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold truncate">
                        {ad.title ?? 'بدون عنوان'}
                      </span>
                      <Badge tone="neutral" size="sm">
                        {SLOT_LABELS[ad.slot] ?? ad.slot}
                      </Badge>
                      {ad.campaign && (
                        <span className="text-[11px] text-muted-foreground">
                          کمپین: {ad.campaign.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {ad.description ?? 'بدون توضیح'}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      تبلیغ‌دهنده:{' '}
                      {ad.campaign?.advertiser?.name ?? ad.campaign?.advertiser?.username ?? '—'} ·{' '}
                      {formatJalaliDate(ad.createdAt, 'medium')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => setViewing(ad)}>
                      <Eye className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-300"
                      onClick={() => approveMutation.mutate(ad.id)}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle className="size-3.5 me-1" />
                      تایید
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30"
                      onClick={() => {
                        setRejectTargetId(ad.id);
                        setRejectNote('');
                      }}
                    >
                      <XCircle className="size-3.5 me-1" />
                      رد
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                قبلی
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                صفحه {formatPersianNumber(page)} از {formatPersianNumber(data.totalPages)}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                بعدی
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View full ad */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setViewing(null)}
        >
          <div
            className="max-h-[90vh] max-w-lg mx-4 overflow-auto rounded-2xl bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {viewing.mediaUrl && (
              <img src={viewing.mediaUrl} alt="" className="w-full rounded-lg mb-3" />
            )}
            <h3 className="font-bold">{viewing.title ?? 'بدون عنوان'}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {viewing.description ?? 'بدون توضیح'}
            </p>
            <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
              <span>{SLOT_LABELS[viewing.slot] ?? viewing.slot}</span>
              {viewing.redirectUrl && <span dir="ltr">{viewing.redirectUrl}</span>}
            </div>
            <Button variant="outline" className="mt-4 w-full" onClick={() => setViewing(null)}>
              بستن
            </Button>
          </div>
        </div>
      )}

      {/* Reject dialog */}
      {rejectTargetId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setRejectTargetId(null)}
        >
          <div
            className="max-w-sm mx-4 rounded-2xl bg-surface p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold">دلیل رد</h3>
            <Textarea
              rows={3}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="دلیل رد تبلیغ را وارد کنید…"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setRejectTargetId(null)}>
                انصراف
              </Button>
              <Button
                variant="destructive"
                disabled={!rejectNote.trim()}
                isLoading={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate({ id: rejectTargetId, note: rejectNote })}
              >
                رد تبلیغ
              </Button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
