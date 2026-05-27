'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  HardDrive,
  RefreshCw,
  Search,
  Server,
  Trash2,
} from 'lucide-react';
import { formatPersianNumber } from '@agahiram/shared';
import { Badge, Button, Card, CardContent, Spinner, toast } from '@agahiram/ui';
import Shell from '../layout-shell';
import { PageHeader } from '@/components/page-header';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useState } from 'react';
import { apiClient } from '@/lib/api';

interface QueueStatus {
  name: string;
  healthy: boolean;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

interface SystemStatus {
  queues: QueueStatus[];
  meili: {
    healthy: boolean;
    databaseSize?: number;
    lastUpdate?: string;
    indexes?: Record<string, unknown>;
  };
  storage: { imageCount: number; videoCount: number; mediaLast24h: number };
  database: { totalPosts: number; totalUsers: number };
  uptime: number;
  memoryUsage: { heapUsed: number; heapTotal: number; rss: number };
}

export default function SystemPage() {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<null | 'reindex' | 'clean'>(null);

  const status = useQuery({
    queryKey: ['admin', 'system'],
    queryFn: async () => (await apiClient.get<SystemStatus>('/admin/system/status')).data,
    refetchInterval: 10_000,
  });

  const reindex = useMutation({
    mutationFn: async () => {
      const r = await apiClient.post<{ queued: number }>('/admin/system/reindex');
      if (!r.success) throw new Error(r.error ?? 'خطا');
      return r.data!;
    },
    onSuccess: (r) => {
      toast.success(`${formatPersianNumber(r.queued)} آگهی برای ایندکس صف شد`);
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ['admin', 'system'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const cleanQueues = useMutation({
    mutationFn: async () => {
      const r = await apiClient.post<Record<string, number>>('/admin/system/queues/clean');
      if (!r.success) throw new Error(r.error ?? 'خطا');
      return r.data!;
    },
    onSuccess: (r) => {
      const total = Object.values(r).reduce((a, b) => a + (b > 0 ? b : 0), 0);
      toast.success(`${formatPersianNumber(total)} جاب ناموفق پاک شد`);
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ['admin', 'system'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (status.isLoading || !status.data) {
    return (
      <Shell>
        <div className="grid place-items-center py-16">
          <Spinner className="size-8" />
        </div>
      </Shell>
    );
  }

  const s = status.data;
  const memMB = (n: number) => Math.round(n / 1024 / 1024);

  return (
    <Shell>
      <PageHeader
        title="وضعیت سیستم"
        description="مانیتورینگ صف‌های BullMQ، MeiliSearch و رسانه‌ها"
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<RefreshCw className="size-4" />}
              onClick={() => status.refetch()}
            >
              تازه‌سازی
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Search className="size-4" />}
              onClick={() => setConfirm('reindex')}
            >
              ایندکس مجدد
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Trash2 className="size-4" />}
              onClick={() => setConfirm('clean')}
            >
              پاک‌سازی جاب‌های ناموفق
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Queues */}
        <Card>
          <CardContent className="!p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Server className="size-4" /> صف‌های BullMQ
            </h2>
            <div className="space-y-2">
              {s.queues.map((q) => (
                <div key={q.name} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs">{q.name}</span>
                    {q.healthy ? (
                      <Badge
                        tone={q.failed > 0 ? 'warning' : 'success'}
                        size="sm"
                        icon={<CheckCircle2 className="size-3" />}
                      >
                        سالم
                      </Badge>
                    ) : (
                      <Badge
                        tone="destructive"
                        size="sm"
                        icon={<AlertTriangle className="size-3" />}
                      >
                        قطع
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] sm:grid-cols-5">
                    <Pill label="در انتظار" value={q.waiting} />
                    <Pill label="فعال" value={q.active} tone="brand" />
                    <Pill label="کامل" value={q.completed} tone="success" />
                    <Pill
                      label="ناموفق"
                      value={q.failed}
                      tone={q.failed > 0 ? 'destructive' : 'neutral'}
                    />
                    <Pill label="تأخیری" value={q.delayed} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* MeiliSearch */}
        <Card>
          <CardContent className="!p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Search className="size-4" /> MeiliSearch
            </h2>
            <div className="space-y-2 text-sm">
              <Row
                label="وضعیت"
                value={
                  s.meili.healthy ? (
                    <Badge tone="success" size="sm">
                      سالم
                    </Badge>
                  ) : (
                    <Badge tone="destructive" size="sm">
                      قطع
                    </Badge>
                  )
                }
              />
              {s.meili.databaseSize ? (
                <Row
                  label="حجم دیتابیس"
                  value={`${formatPersianNumber(Math.round(s.meili.databaseSize / 1024 / 1024))} مگابایت`}
                />
              ) : null}
              {s.meili.indexes ? (
                <div className="pt-2 border-t border-border">
                  <div className="mb-1 text-xs font-semibold">ایندکس‌ها</div>
                  <pre dir="ltr" className="rounded bg-muted p-2 text-[10px] overflow-auto">
                    {JSON.stringify(s.meili.indexes, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Storage */}
        <Card>
          <CardContent className="!p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <HardDrive className="size-4" /> رسانه‌ها
            </h2>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <Pill label="تصویر" value={s.storage.imageCount} />
              <Pill label="ویدیو" value={s.storage.videoCount} />
              <Pill label="۲۴ ساعت اخیر" value={s.storage.mediaLast24h} tone="brand" />
            </div>
          </CardContent>
        </Card>

        {/* DB + memory */}
        <Card>
          <CardContent className="!p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Database className="size-4" /> برنامه
            </h2>
            <div className="space-y-1.5 text-sm">
              <Row label="کل کاربران" value={formatPersianNumber(s.database.totalUsers)} />
              <Row label="کل آگهی‌ها" value={formatPersianNumber(s.database.totalPosts)} />
              <Row
                label="مدت زمان فعالیت"
                value={`${formatPersianNumber(Math.round(s.uptime / 60))} دقیقه`}
              />
              <Row
                label="حافظه استفاده‌شده"
                value={`${formatPersianNumber(memMB(s.memoryUsage.heapUsed))} / ${formatPersianNumber(
                  memMB(s.memoryUsage.heapTotal),
                )} مگابایت`}
              />
              <Row label="RSS" value={`${formatPersianNumber(memMB(s.memoryUsage.rss))} مگابایت`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirm === 'reindex'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="ایندکس مجدد همه‌ی آگهی‌ها"
        description="همه‌ی آگهی‌های منتشرشده به صف ایندکس MeiliSearch اضافه می‌شوند. اجرا ممکن است چند دقیقه طول بکشد."
        confirmLabel="شروع"
        tone="brand"
        isLoading={reindex.isPending}
        onConfirm={() => reindex.mutate()}
      />
      <ConfirmDialog
        open={confirm === 'clean'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="پاک‌سازی جاب‌های ناموفق"
        description="جاب‌های ناموفق قدیمی‌تر از ۷ روز از همه‌ی صف‌ها حذف می‌شوند."
        confirmLabel="پاک‌سازی"
        isLoading={cleanQueues.isPending}
        onConfirm={() => cleanQueues.mutate()}
      />
    </Shell>
  );
}

function Pill({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'brand' | 'success' | 'destructive';
}) {
  const toneClass = {
    neutral: 'bg-muted text-foreground',
    brand: 'bg-accent text-accent-foreground',
    success: 'bg-success/10 text-success',
    destructive: 'bg-destructive/10 text-destructive',
  };
  return (
    <div className={`rounded-md ${toneClass[tone]} p-2 text-center`}>
      <div className="text-base font-extrabold tabular-nums leading-none">
        {formatPersianNumber(value)}
      </div>
      <div className="mt-0.5 text-[10px] opacity-80">{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
