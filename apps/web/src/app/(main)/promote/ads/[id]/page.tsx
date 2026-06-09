'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { formatJalaliDate, formatPersianPrice, cn } from '@agahiram/shared';
import { Button, Input, Label, Spinner, Textarea, toast } from '@agahiram/ui';
import { RequireAuth } from '@/features/advertising/components/require-auth';
import { PromoteHeader } from '@/features/advertising/components/promote-header';
import { AdStatusBadge } from '@/features/advertising/components/ad-status-badge';
import { AdMediaUpload } from '@/features/advertising/components/ad-media-upload';
import { AnalyticsSummary } from '@/features/advertising/components/analytics-summary';
import {
  useAdAnalytics,
  useDeleteAd,
  useMyAd,
  useUpdateAd,
} from '@/features/advertising/hooks/useMyAds';
import { AD_SLOT_LABELS, adPreviewAspect } from '@/features/advertising/lib/ads-utils';

export default function AdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError, refetch } = useMyAd(id);
  const analytics = useAdAnalytics(id);
  const update = useUpdateAd(id);
  const del = useDeleteAd();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    mediaUrl: '',
    redirectUrl: '',
  });

  const startEdit = () => {
    if (!data) return;
    setForm({
      title: data.title ?? '',
      description: data.description ?? '',
      mediaUrl: data.mediaUrl,
      redirectUrl: data.redirectUrl ?? '',
    });
    setEditing(true);
  };

  const saveEdit = () => {
    update.mutate(
      {
        title: form.title.trim() || undefined,
        description: form.description.trim() || undefined,
        mediaUrl: form.mediaUrl || undefined,
        redirectUrl: form.redirectUrl.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('تبلیغ به‌روزرسانی و برای بررسی ارسال شد');
          setEditing(false);
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  const handleDelete = () => {
    if (!confirm('تبلیغ حذف شود؟')) return;
    del.mutate(id, {
      onSuccess: () => {
        toast.success('تبلیغ حذف شد');
        window.history.back();
      },
      onError: (e) => toast.error((e as Error).message),
    });
  };

  return (
    <RequireAuth>
      <div className="bg-background min-h-svh pb-8">
        <PromoteHeader title="جزئیات تبلیغ" />
        <div className="mx-auto max-w-2xl px-4 py-4 space-y-4">
          {isLoading ? (
            <div className="py-12 grid place-items-center">
              <Spinner className="size-8" />
            </div>
          ) : isError || !data ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-muted-foreground">تبلیغ یافت نشد</p>
              <Button variant="outline" onClick={() => void refetch()}>
                تلاش مجدد
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold">{data.title ?? 'تبلیغ'}</h2>
                  <p className="text-xs text-muted-foreground">
                    {AD_SLOT_LABELS[data.slot] ?? data.slot} ·{' '}
                    {formatJalaliDate(data.createdAt, 'medium')}
                  </p>
                </div>
                <AdStatusBadge status={data.status} />
              </div>

              {!editing ? (
                <div className={cn(adPreviewAspect(data.slot), 'relative')}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={data.mediaUrl} alt="" className="size-full object-cover" />
                </div>
              ) : null}

              {data.adminNote && data.status === 'REJECTED' ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
                  <p className="font-medium text-destructive">دلیل رد</p>
                  <p className="text-muted-foreground text-xs mt-1">{data.adminNote}</p>
                </div>
              ) : null}

              {analytics.data ? (
                <AnalyticsSummary
                  impressions={analytics.data.impressions}
                  clicks={analytics.data.clicks}
                  ctr={analytics.data.ctr}
                  spend={data.spent}
                />
              ) : (
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-xl border p-2">
                    <div className="text-muted-foreground text-xs">نمایش</div>
                    <div className="font-semibold">{data.impressions.toLocaleString('fa-IR')}</div>
                  </div>
                  <div className="rounded-xl border p-2">
                    <div className="text-muted-foreground text-xs">کلیک</div>
                    <div className="font-semibold">{data.clicks.toLocaleString('fa-IR')}</div>
                  </div>
                  <div className="rounded-xl border p-2">
                    <div className="text-muted-foreground text-xs">هزینه</div>
                    <div className="font-semibold">{formatPersianPrice(Number(data.spent))}</div>
                  </div>
                </div>
              )}

              {data.campaign ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/promote/campaigns/${data.campaign.id}`}>
                    کمپین: {data.campaign.name}
                  </Link>
                </Button>
              ) : null}

              {editing ? (
                <div className="space-y-4 border-t border-border pt-4">
                  <AdMediaUpload
                    value={form.mediaUrl}
                    onChange={(url) => setForm({ ...form, mediaUrl: url })}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="title">عنوان</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="description">توضیح</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="redirectUrl">لینک</Label>
                    <Input
                      id="redirectUrl"
                      dir="ltr"
                      value={form.redirectUrl}
                      onChange={(e) => setForm({ ...form, redirectUrl: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="brand" disabled={update.isPending} onClick={saveEdit}>
                      {update.isPending ? <Spinner className="size-4" /> : 'ذخیره و ارسال مجدد'}
                    </Button>
                    <Button variant="ghost" onClick={() => setEditing(false)}>
                      انصراف
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(data.status === 'REJECTED' || data.status === 'PENDING_REVIEW') && (
                    <>
                      <Button variant="brand" size="sm" onClick={startEdit}>
                        {data.status === 'REJECTED' ? 'ویرایش و ارسال مجدد' : 'ویرایش'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={del.isPending}
                        onClick={handleDelete}
                      >
                        حذف
                      </Button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
