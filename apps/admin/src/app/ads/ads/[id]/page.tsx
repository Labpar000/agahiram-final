'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Eye, MousePointer, Pencil, Trash2 } from 'lucide-react';
import { formatJalaliDate, formatPersianNumber, formatPersianPrice } from '@agahiram/shared';
import {
  Badge,
  Button,
  Card,
  CardContent,
  ErrorState,
  Input,
  Label,
  Spinner,
  Textarea,
  toast,
} from '@agahiram/ui';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { AdMediaUpload } from '@/components/ad-media-upload';
import Shell from '../../../layout-shell';
import { apiClient } from '@/lib/api';
import { AD_SLOT_LABELS, AD_STATUS_LABELS, adPreviewAspect } from '@/lib/ads-utils';

interface AdDetail {
  id: string;
  title: string | null;
  description: string | null;
  mediaUrl: string;
  redirectUrl: string | null;
  slot: string;
  status: string;
  impressions: number;
  clicks: number;
  spent: string;
  ctr: number;
  adminNote: string | null;
  approvedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  campaign: { id: string; name: string; bidType?: string; bidAmount?: string };
  approvedBy?: { username: string | null; name: string | null } | null;
  reviewedBy?: { username: string | null; name: string | null } | null;
}

export default function AdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    mediaUrl: '',
    redirectUrl: '',
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'ad', id],
    queryFn: async () => (await apiClient.get<AdDetail>(`/ads/admin/ads/${id}`)).data,
  });

  const { data: analytics } = useQuery({
    queryKey: ['admin', 'ad', id, 'analytics'],
    queryFn: async () =>
      (
        await apiClient.get<{ impressions: number; clicks: number; ctr: number }>(
          `/ads/admin/ads/${id}/analytics`,
        )
      ).data,
  });

  useEffect(() => {
    if (!data) return;
    setEditForm({
      title: data.title ?? '',
      description: data.description ?? '',
      mediaUrl: data.mediaUrl,
      redirectUrl: data.redirectUrl ?? '',
    });
  }, [data]);

  const deleteAd = useMutation({
    mutationFn: async () => {
      const r = await apiClient.delete(`/ads/admin/ads/${id}`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('تبلیغ حذف شد');
      window.location.href = '/ads/ads';
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const updateAd = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const r = await apiClient.patch(`/ads/admin/ads/${id}`, body);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('ذخیره شد');
      setEditing(false);
      void refetch();
      void qc.invalidateQueries({ queryKey: ['admin', 'ad', id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading)
    return (
      <Shell adminOnly>
        <div className="grid place-items-center py-16">
          <Spinner className="size-8" />
        </div>
      </Shell>
    );
  if (isError || !data)
    return (
      <Shell adminOnly>
        <ErrorState onRetry={() => void refetch()} />
      </Shell>
    );

  const ad = data;

  const saveEdit = () => {
    const body: Record<string, unknown> = {};
    if (editForm.title.trim()) body.title = editForm.title.trim();
    if (editForm.description.trim()) body.description = editForm.description.trim();
    if (editForm.mediaUrl.trim()) body.mediaUrl = editForm.mediaUrl.trim();
    if (editForm.redirectUrl.trim()) body.redirectUrl = editForm.redirectUrl.trim();
    updateAd.mutate(body);
  };

  return (
    <Shell adminOnly>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/ads/ads" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5 rtl:rotate-180" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-h2 font-extrabold tracking-tight truncate">
            {ad.title ?? 'بدون عنوان'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            کمپین:{' '}
            <Link href={`/ads/campaigns/${ad.campaign.id}`} className="underline">
              {ad.campaign.name}
            </Link>
          </p>
        </div>
        <Badge
          tone={
            ad.status === 'APPROVED'
              ? 'success'
              : ad.status === 'REJECTED'
                ? 'destructive'
                : ad.status === 'PENDING_REVIEW'
                  ? 'warning'
                  : 'neutral'
          }
          size="sm"
        >
          {AD_STATUS_LABELS[ad.status] ?? ad.status}
        </Badge>
        <Badge tone="neutral" size="sm">
          {AD_SLOT_LABELS[ad.slot] ?? ad.slot}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="!p-4">
            <h3 className="mb-3 text-sm font-bold">پیش‌نمایش</h3>
            <div className={adPreviewAspect(ad.slot)}>
              <img src={ad.mediaUrl} alt="" className="size-full object-cover" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="!p-3 text-center">
                <Eye className="mx-auto mb-1 size-4 text-muted-foreground" />
                <div className="text-lg font-bold tabular-nums">
                  {formatPersianNumber(analytics?.impressions ?? ad.impressions)}
                </div>
                <div className="text-[10px] text-muted-foreground">نمایش</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="!p-3 text-center">
                <MousePointer className="mx-auto mb-1 size-4 text-muted-foreground" />
                <div className="text-lg font-bold tabular-nums">
                  {formatPersianNumber(analytics?.clicks ?? ad.clicks)}
                </div>
                <div className="text-[10px] text-muted-foreground">کلیک</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="!p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">CTR</span>
                <span className="font-semibold tabular-nums">{analytics?.ctr ?? ad.ctr ?? 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">هزینه</span>
                <span className="font-semibold tabular-nums">
                  {formatPersianPrice(Number(ad.spent ?? 0))} تومان
                </span>
              </div>
              {ad.adminNote ? (
                <p className="text-xs text-destructive border-t border-border pt-2">
                  یادداشت رد: {ad.adminNote}
                </p>
              ) : null}
              {ad.approvedAt ? (
                <p className="text-xs text-muted-foreground">
                  تایید: {formatJalaliDate(ad.approvedAt, 'medium')}
                  {ad.approvedBy ? ` · ${ad.approvedBy.name ?? ad.approvedBy.username}` : ''}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
              <Pencil className="size-4 me-1" />
              {editing ? 'لغو ویرایش' : 'ویرایش'}
            </Button>
            {ad.status === 'APPROVED' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateAd.mutate({ status: 'PAUSED' })}
                isLoading={updateAd.isPending}
              >
                توقف
              </Button>
            ) : null}
            {ad.status === 'PAUSED' ? (
              <Button
                size="sm"
                variant="brand"
                onClick={() => updateAd.mutate({ status: 'APPROVED' })}
                isLoading={updateAd.isPending}
              >
                فعال‌سازی
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4 me-1" />
              حذف
            </Button>
          </div>
        </div>
      </div>

      {editing ? (
        <Card className="mt-4">
          <CardContent className="!p-4 space-y-3">
            <h3 className="font-bold text-sm">ویرایش تبلیغ</h3>
            <div className="space-y-1">
              <Label>عنوان</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>توضیحات</Label>
              <Textarea
                rows={2}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>رسانه</Label>
              <AdMediaUpload
                value={editForm.mediaUrl}
                onChange={(url) => setEditForm({ ...editForm, mediaUrl: url })}
              />
              <Input
                dir="ltr"
                value={editForm.mediaUrl}
                onChange={(e) => setEditForm({ ...editForm, mediaUrl: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>آدرس مقصد</Label>
              <Input
                dir="ltr"
                value={editForm.redirectUrl}
                onChange={(e) => setEditForm({ ...editForm, redirectUrl: e.target.value })}
              />
            </div>
            <Button variant="brand" isLoading={updateAd.isPending} onClick={saveEdit}>
              ذخیره تغییرات
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="حذف تبلیغ"
        description="آیا از حذف این تبلیغ اطمینان دارید؟"
        confirmLabel="حذف"
        tone="destructive"
        isLoading={deleteAd.isPending}
        onConfirm={() => deleteAd.mutate()}
      />
    </Shell>
  );
}
