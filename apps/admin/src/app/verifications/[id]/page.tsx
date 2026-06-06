'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle, ExternalLink, ShieldCheck, XCircle } from 'lucide-react';
import { formatJalaliDate } from '@agahiram/shared';
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

const SCORE_LABELS: Record<string, number> = {
  PHONE: 100,
  NATIONAL_ID: 150,
  BUSINESS_LICENSE: 250,
  COMPANY_REG: 300,
  ENAMAD: 200,
  ADDRESS: 100,
  BANK_ACCOUNT: 100,
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

export default function VerificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [rejectNote, setRejectNote] = useState('');

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

  return (
    <Shell>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/verifications"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="size-4" />
          تأییدیه‌ها
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">جزئیات درخواست</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardContent className="!p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">{data.shop.name}</h2>
                  <p className="text-sm text-muted-foreground">@{data.shop.user.username ?? '—'}</p>
                  <p className="text-xs text-muted-foreground mt-1">{data.shop.user.phone}</p>
                </div>
                <div className="text-end">
                  <div className="text-sm font-medium">امتیاز اعتماد</div>
                  <div className="text-2xl font-bold text-primary">{data.shop.trustScore}</div>
                  <div className="text-xs text-muted-foreground">{data.shop.trustTier}</div>
                </div>
              </div>

              {data.shop.badges.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    نشان‌های فعال
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {data.shop.badges.map((badge) => (
                      <Badge key={badge.id} tone="brand" size="sm">
                        {badge.type}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="!p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">درخواست {TYPE_LABELS[data.type] ?? data.type}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatJalaliDate(data.createdAt, 'medium')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(data.status)}
                  {data.scoreGranted !== null && (
                    <Badge tone="success" size="sm">
                      +{data.scoreGranted} امتیاز
                    </Badge>
                  )}
                </div>
              </div>

              <div className="rounded-md bg-muted/40 p-3 text-sm">
                <span className="font-medium">امتیاز در صورت تأیید: </span>
                <span className="text-primary font-bold">+{SCORE_LABELS[data.type] ?? 0}</span>
              </div>

              {data.adminNote && (
                <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  <span className="font-medium">یادداشت ادمین: </span>
                  {data.adminNote}
                </div>
              )}

              {data.reviewedAt && (
                <p className="mt-2 text-xs text-muted-foreground">
                  بررسی در: {formatJalaliDate(data.reviewedAt, 'medium')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {data.documents.length > 0 && (
            <Card>
              <CardContent className="!p-6">
                <h3 className="font-semibold mb-4">مستندات ارسالی</h3>
                <div className="grid grid-cols-2 gap-3">
                  {data.documents.map((doc, i) => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc);
                    return isImage ? (
                      <a key={i} href={doc} target="_blank" rel="noopener noreferrer">
                        <img
                          src={doc}
                          alt={`سند ${i + 1}`}
                          className="w-full rounded-md border border-border object-cover aspect-video hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ) : (
                      <a
                        key={i}
                        href={doc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-md border border-border p-3 text-sm hover:bg-muted/40"
                      >
                        <ExternalLink className="size-4 text-primary" />
                        <span className="truncate">سند {i + 1}</span>
                      </a>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {canAct && (
            <Card>
              <CardContent className="!p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <ShieldCheck className="size-4" />
                  اقدام ادمین
                </h3>

                <div className="space-y-4">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
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
                      placeholder="دلیل رد را وارد کنید…"
                      rows={3}
                      className="mb-2"
                    />
                    <Button
                      variant="outline"
                      className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => rejectMutation.mutate()}
                      disabled={
                        approveMutation.isPending || rejectMutation.isPending || !rejectNote.trim()
                      }
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
    </Shell>
  );
}
