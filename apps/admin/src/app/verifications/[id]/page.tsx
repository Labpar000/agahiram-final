'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Maximize2,
  Play,
  ShieldCheck,
  Store,
  User,
  X,
  XCircle,
  ZoomIn,
} from 'lucide-react';
import { formatJalaliDate } from '@agahiram/shared';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ErrorState,
  Spinner,
  Textarea,
  toast,
} from '@agahiram/ui';
import Shell from '../../layout-shell';
import { apiClient } from '@/lib/api';

interface VerificationDetail {
  id: string;
  type: string;
  status: string;
  documents: string[];
  adminNote: string | null;
  scoreGranted: number | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  shop: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    trustScore: number;
    trustTier: string;
    user: {
      id: string;
      username: string | null;
      name: string | null;
      phone: string;
      avatar: string | null;
    };
    badges: Array<{ id: string; type: string; grantedAt: string }>;
  };
}

const TYPE_LABELS: Record<string, string> = {
  PHONE: 'موبایل',
  NATIONAL_ID: 'کد ملی',
  BUSINESS_LICENSE: 'جواز کسب',
  COMPANY_REG: 'ثبت شرکت',
  ENAMAD: 'نماد اعتماد',
  ADDRESS: 'آدرس فیزیکی',
  BANK_ACCOUNT: 'حساب بانکی',
};

const TYPE_REQUIREMENT_HINTS: Record<string, string> = {
  PHONE: 'مالکیت شماره موبایل با کد OTP تأیید می‌شود.',
  NATIONAL_ID: 'تصویر کارت ملی (پشت و رو) یا شناسنامه الزامی است.',
  BUSINESS_LICENSE: 'تصویر جواز کسب معتبر با تاریخ به‌روز الزامی است.',
  COMPANY_REG: 'تصویر آگهی تأسیس یا روزنامه رسمی ثبت شرکت الزامی است.',
  ENAMAD: 'نماد اعتماد الکترونیکی باید معتبر و فعال باشد.',
  ADDRESS: 'تصویر قبض یا سند مالکیت با آدرس خوانا الزامی است.',
  BANK_ACCOUNT: 'تصویر کارت بانکی یا گواهی حساب بانکی الزامی است.',
};

const SCORE_LABELS: Record<string, number> = {
  PHONE: 100,
  NATIONAL_ID: 150,
  BUSINESS_LICENSE: 250,
  COMPANY_REG: 300,
  ENAMAD: 200,
  ADDRESS: 100,
  BANK_ACCOUNT: 100,
};

const TRUST_TIER_LABELS: Record<string, string> = {
  PREMIUM: 'طلایی',
  TRUSTED: 'مورد اعتماد',
  VERIFIED: 'تأییدشده',
  STANDARD: 'استاندارد',
  BASIC: 'پایه',
  UNVERIFIED: 'تأییدنشده',
};

const TRUST_TIER_COLORS: Record<string, string> = {
  PREMIUM: 'bg-amber-100 text-amber-800 border-amber-300',
  TRUSTED: 'bg-green-100 text-green-800 border-green-300',
  VERIFIED: 'bg-blue-100 text-blue-800 border-blue-300',
  STANDARD: 'bg-gray-100 text-gray-700 border-gray-300',
  BASIC: 'bg-gray-50 text-gray-600 border-gray-200',
  UNVERIFIED: 'bg-red-50 text-red-600 border-red-200',
};

function statusBadge(status: string) {
  if (status === 'APPROVED')
    return (
      <Badge tone="success" size="sm">
        تأییدشده
      </Badge>
    );
  if (status === 'REJECTED')
    return (
      <Badge tone="destructive" size="sm">
        رد‌شده
      </Badge>
    );
  if (status === 'UNDER_REVIEW')
    return (
      <Badge tone="warning" size="sm">
        در حال بررسی
      </Badge>
    );
  return (
    <Badge tone="neutral" size="sm">
      در انتظار
    </Badge>
  );
}

function getFileExtension(url: string): string {
  try {
    const path = new URL(url, 'https://a.ir').pathname;
    return path.split('.').pop()?.toLowerCase() ?? '';
  } catch {
    return '';
  }
}

function getFileIcon(ext: string) {
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(ext))
    return <ImageIcon className="size-4" />;
  if (['mp4', 'webm', 'mov'].includes(ext)) return <Play className="size-4" />;
  if (ext === 'pdf') return <FileText className="size-4 text-red-500" />;
  return <FileText className="size-4" />;
}

function isVideo(doc: string) {
  const ext = getFileExtension(doc);
  return ['mp4', 'webm', 'mov', 'mkv'].includes(ext);
}

function isPdf(doc: string) {
  return getFileExtension(doc) === 'pdf';
}

export default function VerificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [rejectNote, setRejectNote] = useState('');
  const [lightboxDoc, setLightboxDoc] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'verifications', id],
    queryFn: async () =>
      (await apiClient.get<VerificationDetail>(`/admin/verifications/${id}`)).data,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const r = await apiClient.post(`/admin/verifications/${id}/approve`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('درخواست تأیید شد');
      qc.invalidateQueries({ queryKey: ['admin', 'verifications'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!rejectNote.trim()) throw new Error('دلیل رد را وارد کنید');
      const r = await apiClient.post(`/admin/verifications/${id}/reject`, { note: rejectNote });
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('درخواست رد شد');
      setRejectNote('');
      qc.invalidateQueries({ queryKey: ['admin', 'verifications'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const openLightbox = (idx: number) => {
    setLightboxIndex(idx);
    setLightboxDoc(data?.documents[idx] ?? null);
    setZoomLevel(1);
  };

  const navigateLightbox = (delta: number) => {
    const docs = data?.documents ?? [];
    const newIdx = lightboxIndex + delta;
    if (newIdx < 0 || newIdx >= docs.length) return;
    setLightboxIndex(newIdx);
    setLightboxDoc(docs[newIdx]);
    setZoomLevel(1);
  };

  if (isLoading) {
    return (
      <Shell>
        <div className="grid place-items-center py-16">
          <Spinner className="size-8" />
        </div>
      </Shell>
    );
  }

  if (isError || !data) {
    return (
      <Shell>
        <ErrorState onRetry={() => void refetch()} />
      </Shell>
    );
  }

  const canAct = data.status === 'PENDING' || data.status === 'UNDER_REVIEW';
  const imageDocs = data.documents.filter((d) => /\.(jpg|jpeg|png|gif|webp)$/i.test(d));
  const nonImageDocs = data.documents.filter((d) => !/\.(jpg|jpeg|png|gif|webp)$/i.test(d));
  const trustTierLabel = TRUST_TIER_LABELS[data.shop.trustTier] ?? data.shop.trustTier;
  const trustTierColor =
    TRUST_TIER_COLORS[data.shop.trustTier] ?? 'bg-gray-50 text-gray-600 border-gray-200';

  return (
    <Shell>
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/verifications"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="size-4" />
          تأییدیه‌ها
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">جزئیات درخواست</span>
        {statusBadge(data.status)}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT: main content (2 cols) */}
        <div className="space-y-4 lg:col-span-2">
          {/* Documents — image gallery */}
          {imageDocs.length > 0 && (
            <Card>
              <CardContent className="!p-5">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <ImageIcon className="size-4 text-primary" />
                  تصاویر ارسالی ({imageDocs.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {imageDocs.map((doc, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => openLightbox(data.documents.indexOf(doc))}
                      className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-black/5 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <img
                        src={doc}
                        alt={`سند ${i + 1}`}
                        className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <ZoomIn className="size-3" />
                        بزرگ‌نمایی
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Non-image documents */}
          {nonImageDocs.length > 0 && (
            <Card>
              <CardContent className="!p-5">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  سایر فایل‌ها ({nonImageDocs.length})
                </h3>
                <div className="space-y-2">
                  {nonImageDocs.map((doc, i) => {
                    const ext = getFileExtension(doc);
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                          {getFileIcon(ext)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">سند {i + 1}</div>
                          <div className="text-[11px] text-muted-foreground uppercase">
                            {ext || 'فایل'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={doc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            <Eye className="size-3.5" />
                            مشاهده
                          </a>
                          <a
                            href={doc}
                            download
                            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium bg-muted hover:bg-muted/80 transition-colors"
                          >
                            <Download className="size-3.5" />
                            دانلود
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state when no documents */}
          {data.documents.length === 0 && (
            <Card>
              <CardContent className="!p-8 text-center">
                <FileText className="size-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">مستندی ارسال نشده است</p>
                <p className="text-xs text-muted-foreground mt-1">
                  کاربر هیچ فایلی برای این درخواست آپلود نکرده است.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Verification type hint */}
          <Card>
            <CardContent className="!p-5">
              <h3 className="font-bold text-sm mb-2">راهنمای بررسی</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {TYPE_REQUIREMENT_HINTS[data.type] ?? 'مستندات ارسالی را با دقت بررسی کنید.'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: sidebar (1 col) */}
        <div className="space-y-4">
          {/* Shop info */}
          <Card>
            <CardContent className="!p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Store className="size-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-sm truncate">{data.shop.name}</h2>
                  <Link
                    href={`/users/${data.shop.user.id}`}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    @{data.shop.user.username ?? '—'}
                  </Link>
                </div>
              </div>

              <div className="space-y-2 text-sm border-t border-border pt-3">
                <Row label="مالک" value={data.shop.user.name ?? '—'} />
                <Row label="شماره" value={data.shop.user.phone} dir="ltr" />
                <Row label="امتیاز اعتماد" value={data.shop.trustScore} mono />
                <Row label="سطح اعتماد" value={trustTierLabel} valueClassName={trustTierColor} />
              </div>

              {data.shop.badges.length > 0 && (
                <div className="border-t border-border pt-3">
                  <div className="text-[11px] font-medium text-muted-foreground mb-2">نشان‌ها</div>
                  <div className="flex flex-wrap gap-1">
                    {data.shop.badges.map((badge) => (
                      <span
                        key={badge.id}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium"
                      >
                        <ShieldCheck className="size-3 text-primary" />
                        {badge.type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request details */}
          <Card>
            <CardContent className="!p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{TYPE_LABELS[data.type] ?? data.type}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {formatJalaliDate(data.createdAt, 'dateTime')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(data.status)}
                  {data.scoreGranted !== null && (
                    <Badge tone="success" size="sm">
                      +{data.scoreGranted}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-muted/40 border border-border p-3 text-sm flex items-center justify-between">
                <span>امتیاز در صورت تأیید</span>
                <span className="text-primary font-bold tabular-nums">
                  +{SCORE_LABELS[data.type] ?? 0}
                </span>
              </div>

              {data.adminNote && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  <span className="font-bold">یادداشت ادمین:</span>
                  <p className="mt-1 leading-relaxed">{data.adminNote}</p>
                </div>
              )}

              {data.reviewedAt && (
                <p className="text-[11px] text-muted-foreground">
                  تاریخ بررسی: {formatJalaliDate(data.reviewedAt, 'dateTime')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Admin action */}
          {canAct && (
            <Card className="border-primary/20">
              <CardContent className="!p-5">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  اقدام ادمین
                </h3>

                <div className="space-y-4">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    isLoading={approveMutation.isPending}
                  >
                    <CheckCircle className="size-4 me-2" />
                    تأیید درخواست{' '}
                    {data.scoreGranted === null ? `(+${SCORE_LABELS[data.type] ?? 0} امتیاز)` : ''}
                  </Button>

                  <div className="border-t border-border pt-4">
                    <label className="block text-sm font-medium mb-2">رد درخواست</label>
                    <Textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="دلیل رد را به صورت دقیق وارد کنید…"
                      rows={3}
                      className="mb-2"
                    />
                    <Button
                      variant="outline"
                      className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 font-semibold"
                      onClick={() => rejectMutation.mutate()}
                      disabled={
                        approveMutation.isPending || rejectMutation.isPending || !rejectNote.trim()
                      }
                      isLoading={rejectMutation.isPending}
                    >
                      <XCircle className="size-4 me-2" />
                      رد درخواست
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Lightbox / image viewer */}
      <Dialog
        open={!!lightboxDoc}
        onOpenChange={(o) => {
          if (!o) {
            setLightboxDoc(null);
            setZoomLevel(1);
          }
        }}
      >
        <DialogContent size="full" className="bg-black/95 border-none !p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>نمایش سند</DialogTitle>
          </DialogHeader>
          <div className="relative flex h-screen w-screen items-center justify-center">
            {/* Close */}
            <button
              type="button"
              onClick={() => {
                setLightboxDoc(null);
                setZoomLevel(1);
              }}
              className="absolute top-4 right-4 z-50 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="بستن"
            >
              <X className="size-5" />
            </button>

            {/* Zoom controls */}
            <div className="absolute top-4 left-4 z-50 flex items-center gap-1 rounded-full bg-white/10 p-1">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                className="flex size-8 items-center justify-center rounded-full text-white hover:bg-white/20 transition-colors text-lg"
                aria-label="کوچک‌نمایی"
              >
                −
              </button>
              <span className="text-xs text-white/70 tabular-nums px-1 min-w-[42px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(4, z + 0.25))}
                className="flex size-8 items-center justify-center rounded-full text-white hover:bg-white/20 transition-colors text-lg"
                aria-label="بزرگ‌نمایی"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="flex size-8 items-center justify-center rounded-full text-white hover:bg-white/20 transition-colors"
                aria-label="اندازه واقعی"
              >
                <Maximize2 className="size-3.5" />
              </button>
            </div>

            {/* Navigation */}
            {(data?.documents.length ?? 0) > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => navigateLightbox(-1)}
                  disabled={lightboxIndex <= 0}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-50 flex size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="قبلی"
                >
                  <ChevronRight className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={() => navigateLightbox(1)}
                  disabled={lightboxIndex >= (data?.documents.length ?? 0) - 1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="بعدی"
                >
                  <ChevronLeft className="size-6" />
                </button>
              </>
            )}

            {/* Image */}
            {lightboxDoc && !isVideo(lightboxDoc) && (
              <img
                src={lightboxDoc}
                alt="نمایش سند"
                className="max-h-[90vh] max-w-[90vw] object-contain transition-transform duration-200 select-none"
                style={{ transform: `scale(${zoomLevel})` }}
                draggable={false}
              />
            )}

            {/* Video */}
            {lightboxDoc && isVideo(lightboxDoc) && (
              <video
                src={lightboxDoc}
                controls
                autoPlay
                className="max-h-[90vh] max-w-[90vw] rounded-lg"
              />
            )}

            {/* Counter */}
            {(data?.documents.length ?? 0) > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white tabular-nums">
                {lightboxIndex + 1} / {data?.documents.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

function Row({
  label,
  value,
  dir,
  mono,
  valueClassName,
}: {
  label: string;
  value: string | number;
  dir?: string;
  mono?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span
        dir={dir}
        className={`text-sm font-medium ${mono ? 'tabular-nums' : ''} ${valueClassName ? `rounded-full border px-2 py-0.5 text-xs ${valueClassName}` : ''}`}
      >
        {value}
      </span>
    </div>
  );
}
