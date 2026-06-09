'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BarChart3, Eye, MousePointer, Play, Pause, CheckCircle, X } from 'lucide-react';
import { formatJalaliDate, formatPersianNumber, formatPersianPrice } from '@agahiram/shared';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ErrorState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  toast,
} from '@agahiram/ui';
import Shell from '../../../layout-shell';
import { apiClient } from '@/lib/api';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  ACTIVE: 'فعال',
  PAUSED: 'متوقف',
  COMPLETED: 'پایان‌یافته',
  REJECTED: 'رد شده',
};
const SLOT_LABELS: Record<string, string> = {
  STORY: 'استوری',
  EXPLORE_FEED: 'اکسپلور',
  BANNER: 'بنر',
};

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [newAdOpen, setNewAdOpen] = useState(false);
  const [adForm, setAdForm] = useState({
    title: '',
    description: '',
    mediaUrl: '',
    redirectUrl: '',
    slot: 'EXPLORE_FEED',
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'campaign', id],
    queryFn: async () => (await apiClient.get(`/ads/admin/campaigns/${id}`)).data,
  });

  const updateCampaign = useMutation({
    mutationFn: async (body: { status?: string }) => {
      const r = await apiClient.patch(`/ads/admin/campaigns/${id}`, body);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('ذخیره شد');
      void refetch();
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
  if (isError || !data)
    return (
      <Shell>
        <ErrorState onRetry={() => void refetch()} />
      </Shell>
    );

  const c = data as any;
  const totalImpressions = c.ads?.reduce((s: number, a: any) => s + a.impressions, 0) ?? 0;
  const totalClicks = c.ads?.reduce((s: number, a: any) => s + a.clicks, 0) ?? 0;
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0';

  return (
    <Shell>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/ads/campaigns" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5 rtl:rotate-180" />
        </Link>
        <div>
          <h1 className="text-h2 font-extrabold tracking-tight">{c.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            تبلیغ‌دهنده: {c.advertiser?.name ?? c.advertiser?.username ?? '—'} ·{' '}
            {formatJalaliDate(c.createdAt, 'medium')}
          </p>
        </div>
        <Badge
          tone={c.status === 'ACTIVE' ? 'success' : c.status === 'PAUSED' ? 'warning' : 'neutral'}
          size="sm"
          className="me-auto"
        >
          {STATUS_LABELS[c.status] ?? c.status}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card>
          <CardContent className="!p-3 text-center">
            <Eye className="size-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-lg font-bold tabular-nums">
              {formatPersianNumber(totalImpressions)}
            </div>
            <div className="text-[10px] text-muted-foreground">نمایش</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="!p-3 text-center">
            <MousePointer className="size-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-lg font-bold tabular-nums">{formatPersianNumber(totalClicks)}</div>
            <div className="text-[10px] text-muted-foreground">کلیک</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="!p-3 text-center">
            <BarChart3 className="size-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-lg font-bold tabular-nums">{ctr}%</div>
            <div className="text-[10px] text-muted-foreground">CTR</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="!p-3 text-center">
            <div className="text-lg font-bold tabular-nums">
              {formatPersianPrice(Number(c.budget))}
            </div>
            <div className="text-[10px] text-muted-foreground">بودجه (تومان)</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-4">
        {c.status === 'DRAFT' && (
          <Button
            size="sm"
            variant="brand"
            onClick={() => updateCampaign.mutate({ status: 'ACTIVE' })}
            isLoading={updateCampaign.isPending}
          >
            <Play className="size-4 me-1" />
            فعال‌سازی
          </Button>
        )}
        {c.status === 'ACTIVE' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateCampaign.mutate({ status: 'PAUSED' })}
            isLoading={updateCampaign.isPending}
          >
            <Pause className="size-4 me-1" />
            توقف
          </Button>
        )}
        {c.status === 'PAUSED' && (
          <Button
            size="sm"
            variant="brand"
            onClick={() => updateCampaign.mutate({ status: 'ACTIVE' })}
            isLoading={updateCampaign.isPending}
          >
            <Play className="size-4 me-1" />
            ادامه
          </Button>
        )}
        {(c.status === 'ACTIVE' || c.status === 'PAUSED') && (
          <Button
            size="sm"
            variant="outline"
            className="text-destructive"
            onClick={() => updateCampaign.mutate({ status: 'COMPLETED' })}
            isLoading={updateCampaign.isPending}
          >
            <CheckCircle className="size-4 me-1" />
            پایان
          </Button>
        )}
      </div>

      {/* Ads list */}
      <Card>
        <CardContent className="!p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">تبلیغات ({c.ads?.length ?? 0})</h3>
          </div>
          {c.ads?.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">تبلیغی ثبت نشده</p>
          ) : (
            <div className="space-y-2">
              {c.ads.map((ad: any) => (
                <div
                  key={ad.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  {ad.mediaUrl && (
                    <img
                      src={ad.mediaUrl}
                      alt=""
                      className="size-12 rounded-md object-cover bg-muted"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {ad.title ?? 'بدون عنوان'}
                      </span>
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
                        {ad.status === 'APPROVED'
                          ? 'تایید شده'
                          : ad.status === 'REJECTED'
                            ? 'رد شده'
                            : ad.status === 'PENDING_REVIEW'
                              ? 'در انتظار'
                              : ad.status}
                      </Badge>
                      <Badge tone="neutral" size="sm">
                        {SLOT_LABELS[ad.slot] ?? ad.slot}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatPersianNumber(ad.impressions)} نمایش · {formatPersianNumber(ad.clicks)}{' '}
                      کلیک
                      {ad.spent ? ` · ${formatPersianPrice(Number(ad.spent))} تومان` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
}
