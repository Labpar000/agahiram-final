'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BarChart3,
  Coins,
  Eye,
  MousePointer,
  Pencil,
  Play,
  Pause,
  CheckCircle,
  Plus,
  Wallet,
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
import { AdMediaUpload } from '@/components/ad-media-upload';
import Shell from '../../../layout-shell';
import { apiClient } from '@/lib/api';
import {
  AD_SLOT_LABELS,
  AD_STATUS_LABELS,
  CAMPAIGN_STATUS_LABELS,
  PAUSE_REASON_LABELS,
  adPreviewAspect,
  buildAdCreatePayload,
} from '@/lib/ads-utils';

interface CampaignDetail {
  id: string;
  name: string;
  status: string;
  budget: string;
  totalSpent: string;
  dailyBudget: string | null;
  bidType: string;
  bidAmount: string;
  startDate: string;
  endDate: string | null;
  pauseReason: string | null;
  targeting: Record<string, unknown> | null;
  createdAt: string;
  advertiser: {
    id: string;
    username: string | null;
    name: string | null;
    phone?: string | null;
    walletBalance?: string;
  };
  ads: Array<{
    id: string;
    title: string | null;
    status: string;
    slot: string;
    mediaUrl: string;
    impressions: number;
    clicks: number;
    spent: string;
  }>;
  payments: Array<{
    id: string;
    amount: string;
    status: string;
    note: string | null;
    createdAt: string;
  }>;
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [newAdOpen, setNewAdOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [adForm, setAdForm] = useState({
    title: '',
    description: '',
    mediaUrl: '',
    redirectUrl: '',
    slot: 'EXPLORE_FEED',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    budget: '',
    dailyBudget: '',
    endDate: '',
  });
  const [statusConfirm, setStatusConfirm] = useState<{ open: boolean; targetStatus: string }>({
    open: false,
    targetStatus: '',
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'campaign', id],
    queryFn: async () => (await apiClient.get<CampaignDetail>(`/ads/admin/campaigns/${id}`)).data,
  });

  const { data: analytics } = useQuery({
    queryKey: ['admin', 'campaign', id, 'analytics'],
    queryFn: async () =>
      (
        await apiClient.get<{
          impressions: number;
          clicks: number;
          ctr: number;
          spend: string;
        }>(`/ads/admin/campaigns/${id}/analytics`)
      ).data,
  });

  const updateCampaign = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const r = await apiClient.patch(`/ads/admin/campaigns/${id}`, body);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('ذخیره شد');
      setStatusConfirm({ open: false, targetStatus: '' });
      setEditOpen(false);
      void refetch();
      void qc.invalidateQueries({ queryKey: ['admin', 'campaign', id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const createAdMutation = useMutation({
    mutationFn: async () => {
      const payload = buildAdCreatePayload(id, adForm);
      const r = await apiClient.post('/ads/admin/ads', payload);
      if (!r.success) throw new Error(r.error ?? 'خطا');
      return r.data;
    },
    onSuccess: () => {
      toast.success('تبلیغ جدید ایجاد شد — به صف بررسی رفت');
      setNewAdOpen(false);
      setAdForm({
        title: '',
        description: '',
        mediaUrl: '',
        redirectUrl: '',
        slot: 'EXPLORE_FEED',
      });
      void refetch();
      void qc.invalidateQueries({ queryKey: ['admin', 'ads', 'pending'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const handleStatusChange = (targetStatus: string) => {
    setStatusConfirm({ open: true, targetStatus });
  };

  const openEdit = () => {
    if (!data) return;
    setEditForm({
      name: data.name,
      budget: String(data.budget),
      dailyBudget: data.dailyBudget ? String(data.dailyBudget) : '',
      endDate: data.endDate ? data.endDate.slice(0, 16) : '',
    });
    setEditOpen(true);
  };

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

  const c = data;
  const spent = Number(c.totalSpent ?? 0);
  const budget = Number(c.budget);
  const budgetPct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

  const statusConfirmLabels: Record<
    string,
    { title: string; desc: string; tone: 'primary' | 'destructive' | 'brand' }
  > = {
    ACTIVE: {
      title: 'فعال‌سازی کمپین',
      desc: 'آیا از فعال‌سازی این کمپین اطمینان دارید؟ تبلیغ‌های تاییدشده نمایش داده می‌شوند.',
      tone: 'brand',
    },
    PAUSED: {
      title: 'توقف کمپین',
      desc: 'آیا از توقف این کمپین اطمینان دارید؟',
      tone: 'primary',
    },
    COMPLETED: {
      title: 'پایان کمپین',
      desc: 'آیا از پایان این کمپین اطمینان دارید؟ این عملیات قابل بازگشت نیست.',
      tone: 'destructive',
    },
  };

  return (
    <Shell adminOnly>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/ads/campaigns" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5 rtl:rotate-180" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-h2 font-extrabold tracking-tight">{c.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            تبلیغ‌دهنده:{' '}
            <Link href={`/users/${c.advertiser.id}`} className="underline">
              {c.advertiser.name ?? c.advertiser.username ?? '—'}
            </Link>
            {' · '}
            {formatJalaliDate(c.createdAt, 'medium')}
          </p>
        </div>
        <Badge
          tone={c.status === 'ACTIVE' ? 'success' : c.status === 'PAUSED' ? 'warning' : 'neutral'}
          size="sm"
        >
          {CAMPAIGN_STATUS_LABELS[c.status] ?? c.status}
        </Badge>
        <Button size="sm" variant="outline" onClick={openEdit}>
          <Pencil className="size-4 me-1" />
          ویرایش
        </Button>
      </div>

      {/* Campaign meta */}
      <Card className="mb-4">
        <CardContent className="!p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">نوع قیمت</div>
            <div className="font-semibold">
              {c.bidType} · {formatPersianPrice(Number(c.bidAmount))} تومان
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">بودجه</div>
            <div className="font-semibold tabular-nums">
              {formatPersianPrice(spent)} / {formatPersianPrice(budget)} ({budgetPct}%)
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">بودجه روزانه</div>
            <div className="font-semibold tabular-nums">
              {c.dailyBudget ? `${formatPersianPrice(Number(c.dailyBudget))} تومان` : '—'}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">بازه زمانی</div>
            <div className="font-semibold text-xs">
              {formatJalaliDate(c.startDate, 'medium')}
              {c.endDate ? ` — ${formatJalaliDate(c.endDate, 'medium')}` : ' — نامحدود'}
            </div>
          </div>
          {c.pauseReason ? (
            <div className="sm:col-span-2">
              <div className="text-muted-foreground text-xs">دلیل توقف</div>
              <div className="font-semibold">
                {PAUSE_REASON_LABELS[c.pauseReason] ?? c.pauseReason}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Wallet */}
      <Card className="mb-4">
        <CardContent className="!p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wallet className="size-5 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">موجودی کیف پول تبلیغ‌دهنده</div>
              <div className="font-bold tabular-nums">
                {formatPersianPrice(Number(c.advertiser.walletBalance ?? 0))} تومان
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/users/${c.advertiser.id}`}>شارژ کیف پول</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card>
          <CardContent className="!p-3 text-center">
            <Eye className="size-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-lg font-bold tabular-nums">
              {formatPersianNumber(analytics?.impressions ?? 0)}
            </div>
            <div className="text-[10px] text-muted-foreground">نمایش (۳۰ روز)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="!p-3 text-center">
            <MousePointer className="size-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-lg font-bold tabular-nums">
              {formatPersianNumber(analytics?.clicks ?? 0)}
            </div>
            <div className="text-[10px] text-muted-foreground">کلیک (۳۰ روز)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="!p-3 text-center">
            <BarChart3 className="size-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-lg font-bold tabular-nums">{analytics?.ctr ?? 0}%</div>
            <div className="text-[10px] text-muted-foreground">CTR</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="!p-3 text-center">
            <Coins className="size-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-lg font-bold tabular-nums text-sm">
              {formatPersianPrice(Number(analytics?.spend ?? 0))}
            </div>
            <div className="text-[10px] text-muted-foreground">هزینه (۳۰ روز)</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {c.status === 'DRAFT' && (
          <Button size="sm" variant="brand" onClick={() => handleStatusChange('ACTIVE')}>
            <Play className="size-4 me-1" />
            فعال‌سازی
          </Button>
        )}
        {c.status === 'ACTIVE' && (
          <Button size="sm" variant="outline" onClick={() => handleStatusChange('PAUSED')}>
            <Pause className="size-4 me-1" />
            توقف
          </Button>
        )}
        {c.status === 'PAUSED' && (
          <Button size="sm" variant="brand" onClick={() => handleStatusChange('ACTIVE')}>
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
          >
            <CheckCircle className="size-4 me-1" />
            پایان
          </Button>
        )}
        <Button size="sm" variant="ghost" asChild>
          <Link href={`/ads/ads?campaignId=${c.id}`}>مشاهده در لیست تبلیغات</Link>
        </Button>
      </div>

      {/* Ads list */}
      <Card className="mb-4">
        <CardContent className="!p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">تبلیغات ({c.ads.length})</h3>
            <Button size="sm" variant="brand" onClick={() => setNewAdOpen(true)}>
              <Plus className="size-4 me-1" />
              تبلیغ جدید
            </Button>
          </div>
          {c.ads.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">تبلیغی ثبت نشده</p>
          ) : (
            <div className="space-y-2">
              {c.ads.map((ad) => (
                <Link
                  key={ad.id}
                  href={`/ads/ads/${ad.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                >
                  <img
                    src={ad.mediaUrl}
                    alt=""
                    className="size-12 rounded-md object-cover bg-muted"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
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
                        {AD_STATUS_LABELS[ad.status] ?? ad.status}
                      </Badge>
                      <Badge tone="neutral" size="sm">
                        {AD_SLOT_LABELS[ad.slot] ?? ad.slot}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatPersianNumber(ad.impressions)} نمایش · {formatPersianNumber(ad.clicks)}{' '}
                      کلیک · {formatPersianPrice(Number(ad.spent))} تومان
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payments ledger */}
      {c.payments.length > 0 ? (
        <Card>
          <CardContent className="!p-4">
            <h3 className="font-bold text-sm mb-3">تراکنش‌های هزینه</h3>
            <div className="space-y-2">
              {c.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0"
                >
                  <span className="text-muted-foreground">
                    {formatJalaliDate(p.createdAt, 'medium')} · {p.note ?? '—'}
                  </span>
                  <span className="font-semibold tabular-nums text-destructive">
                    −{formatPersianPrice(Number(p.amount))}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* New Ad Dialog */}
      <Dialog open={newAdOpen} onOpenChange={setNewAdOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>ایجاد تبلیغ جدید</DialogTitle>
            <DialogDescription>پس از ایجاد، تبلیغ به صف بررسی می‌رود</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>محل نمایش</Label>
              <Select value={adForm.slot} onValueChange={(v) => setAdForm({ ...adForm, slot: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPLORE_FEED">اکسپلور (۱:۱)</SelectItem>
                  <SelectItem value="STORY">استوری (۹:۱۶)</SelectItem>
                  <SelectItem value="BANNER">بنر (۶.۴:۱)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label required>رسانه</Label>
              <AdMediaUpload
                value={adForm.mediaUrl}
                onChange={(url) => setAdForm({ ...adForm, mediaUrl: url })}
              />
              <Input
                value={adForm.mediaUrl}
                onChange={(e) => setAdForm({ ...adForm, mediaUrl: e.target.value })}
                placeholder="یا آدرس تصویر را وارد کنید"
                dir="ltr"
              />
            </div>
            {adForm.mediaUrl ? (
              <div className={adPreviewAspect(adForm.slot)}>
                <img src={adForm.mediaUrl} alt="" className="size-full object-cover" />
              </div>
            ) : null}
            <div className="space-y-1">
              <Label htmlFor="ad-title">عنوان (اختیاری)</Label>
              <Input
                id="ad-title"
                value={adForm.title}
                onChange={(e) => setAdForm({ ...adForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ad-redirect">آدرس مقصد (اختیاری)</Label>
              <Input
                id="ad-redirect"
                dir="ltr"
                value={adForm.redirectUrl}
                onChange={(e) => setAdForm({ ...adForm, redirectUrl: e.target.value })}
                placeholder="https://..."
              />
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
              onClick={() => createAdMutation.mutate()}
            >
              ایجاد تبلیغ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit campaign */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>ویرایش کمپین</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>نام</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>بودجه کل</Label>
                <Input
                  type="number"
                  value={editForm.budget}
                  onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>بودجه روزانه</Label>
                <Input
                  type="number"
                  value={editForm.dailyBudget}
                  onChange={(e) => setEditForm({ ...editForm, dailyBudget: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>تاریخ پایان</Label>
              <Input
                type="datetime-local"
                value={editForm.endDate}
                onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="brand"
              isLoading={updateCampaign.isPending}
              onClick={() =>
                updateCampaign.mutate({
                  name: editForm.name,
                  budget: Number(editForm.budget),
                  dailyBudget: editForm.dailyBudget ? Number(editForm.dailyBudget) : null,
                  endDate: editForm.endDate ? new Date(editForm.endDate).toISOString() : null,
                })
              }
            >
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
