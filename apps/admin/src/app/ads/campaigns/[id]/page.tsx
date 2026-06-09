'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BarChart3,
  Eye,
  MousePointer,
  Play,
  Pause,
  CheckCircle,
  Plus,
} from 'lucide-react';
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
import { ConfirmDialog } from '@/components/confirm-dialog';
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
  const [statusConfirm, setStatusConfirm] = useState<{ open: boolean; targetStatus: string }>({
    open: false,
    targetStatus: '',
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
      setStatusConfirm({ open: false, targetStatus: '' });
      void refetch();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const createAdMutation = useMutation({
    mutationFn: async (body: typeof adForm) => {
      const r = await apiClient.post('/ads/admin/ads', {
        campaignId: id,
        ...body,
      });
      if (!r.success) throw new Error(r.error ?? 'خطا');
      return r.data;
    },
    onSuccess: () => {
      toast.success('تبلیغ جدید ایجاد شد');
      setNewAdOpen(false);
      setAdForm({
        title: '',
        description: '',
        mediaUrl: '',
        redirectUrl: '',
        slot: 'EXPLORE_FEED',
      });
      qc.invalidateQueries({ queryKey: ['admin', 'campaign', id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const handleStatusChange = (targetStatus: string) => {
    setStatusConfirm({ open: true, targetStatus });
  };

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

  const statusConfirmLabels: Record<
    string,
    { title: string; desc: string; tone: 'primary' | 'destructive' | 'brand' }
  > = {
    ACTIVE: {
      title: 'فعال‌سازی کمپین',
      desc: 'آیا از فعال‌سازی این کمپین اطمینان دارید؟',
      tone: 'brand',
    },
    PAUSED: {
      title: 'توقف کمپین',
      desc: 'آیا از توقف این کمپین اطمینان دارید؟ تبلیغات متوقف خواهند شد.',
      tone: 'primary',
    },
    COMPLETED: {
      title: 'پایان کمپین',
      desc: 'آیا از پایان این کمپین اطمینان دارید؟ این عملیات قابل بازگشت نیست.',
      tone: 'destructive',
    },
  };

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
            onClick={() => handleStatusChange('ACTIVE')}
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
            onClick={() => handleStatusChange('PAUSED')}
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
            onClick={() => handleStatusChange('ACTIVE')}
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
            onClick={() => handleStatusChange('COMPLETED')}
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
            <Button size="sm" variant="brand" onClick={() => setNewAdOpen(true)}>
              <Plus className="size-4 me-1" />
              تبلیغ جدید
            </Button>
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

      {/* New Ad Dialog */}
      <Dialog open={newAdOpen} onOpenChange={setNewAdOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>ایجاد تبلیغ جدید</DialogTitle>
            <DialogDescription>اطلاعات تبلیغ را وارد کنید</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="ad-title">عنوان</Label>
              <Input
                id="ad-title"
                value={adForm.title}
                onChange={(e) => setAdForm({ ...adForm, title: e.target.value })}
                placeholder="عنوان تبلیغ (اختیاری)"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ad-desc">توضیحات</Label>
              <Input
                id="ad-desc"
                value={adForm.description}
                onChange={(e) => setAdForm({ ...adForm, description: e.target.value })}
                placeholder="توضیح کوتاه (اختیاری)"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ad-media" required>
                آدرس تصویر
              </Label>
              <Input
                id="ad-media"
                value={adForm.mediaUrl}
                onChange={(e) => setAdForm({ ...adForm, mediaUrl: e.target.value })}
                placeholder="https://..."
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ad-redirect">آدرس مقصد</Label>
              <Input
                id="ad-redirect"
                value={adForm.redirectUrl}
                onChange={(e) => setAdForm({ ...adForm, redirectUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ad-slot">محل نمایش</Label>
              <Select value={adForm.slot} onValueChange={(v) => setAdForm({ ...adForm, slot: v })}>
                <SelectTrigger id="ad-slot">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPLORE_FEED">اکسپلور</SelectItem>
                  <SelectItem value="STORY">استوری</SelectItem>
                  <SelectItem value="BANNER">بنر</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewAdOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="brand"
              disabled={!adForm.mediaUrl.trim()}
              isLoading={createAdMutation.isPending}
              onClick={() => createAdMutation.mutate(adForm)}
            >
              ایجاد تبلیغ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Confirmation */}
      {statusConfirm.targetStatus && statusConfirmLabels[statusConfirm.targetStatus] && (
        <ConfirmDialog
          open={statusConfirm.open}
          onOpenChange={(open) => setStatusConfirm((s) => ({ ...s, open }))}
          title={statusConfirmLabels[statusConfirm.targetStatus].title}
          description={statusConfirmLabels[statusConfirm.targetStatus].desc}
          tone={statusConfirmLabels[statusConfirm.targetStatus].tone}
          confirmLabel="تأیید"
          isLoading={updateCampaign.isPending}
          onConfirm={() => updateCampaign.mutate({ status: statusConfirm.targetStatus })}
        />
      )}
    </Shell>
  );
}
