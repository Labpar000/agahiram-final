'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Search, Send, Trash2, X } from 'lucide-react';
import { formatJalaliDate, formatPersianNumber } from '@agahiram/shared';
import {
  Badge,
  Button,
  Card,
  CardContent,
  IconButton,
  Input,
  Label,
  Textarea,
  toast,
} from '@agahiram/ui';
import Shell from '../layout-shell';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { apiClient } from '@/lib/api';

interface NotificationRow {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
  user: { id: string; username: string | null; name: string | null };
}

const PAGE_SIZE = 30;

function payloadPreview(payload: Record<string, unknown>) {
  const title = typeof payload.title === 'string' ? payload.title : null;
  const body = typeof payload.body === 'string' ? payload.body : null;
  if (title || body) return [title, body].filter(Boolean).join(' — ');
  try {
    const s = JSON.stringify(payload);
    return s.length > 120 ? `${s.slice(0, 120)}…` : s;
  } catch {
    return '—';
  }
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState('');
  const [type, setType] = useState('');
  const [del, setDel] = useState<NotificationRow | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formUserId, setFormUserId] = useState('');

  const list = useQuery({
    queryKey: ['admin', 'notifications', { page, userId, type }],
    queryFn: async () =>
      (
        await apiClient.get<{ data: NotificationRow[]; total: number }>('/admin/notifications', {
          page,
          pageSize: PAGE_SIZE,
          userId: userId || undefined,
          type: type || undefined,
        })
      ).data,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.delete(`/admin/notifications/${id}`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('اعلان حذف شد');
      setDel(null);
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const sendSystem = useMutation({
    mutationFn: async () => {
      const r = await apiClient.post<{ sent: number }>('/admin/notifications/system', {
        title: formTitle.trim(),
        body: formBody.trim(),
        userId: formUserId.trim() || undefined,
      });
      if (!r.success) throw new Error(r.error ?? 'خطا');
      return r.data;
    },
    onSuccess: (data) => {
      toast.success(`ارسال شد به ${formatPersianNumber(data?.sent ?? 0)} نفر`);
      setFormTitle('');
      setFormBody('');
      setFormUserId('');
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const canSend = formTitle.trim().length >= 3 && formBody.trim().length >= 3;

  const columns: Column<NotificationRow>[] = useMemo(
    () => [
      {
        key: 'user',
        header: 'کاربر',
        cell: (n) => (
          <Link href={`/users/${n.user.id}`} className="text-xs hover:underline">
            @{n.user.username ?? n.user.name ?? '—'}
          </Link>
        ),
      },
      {
        key: 'type',
        header: 'نوع',
        hideOnMobile: true,
        cell: (n) => <span className="text-xs font-mono">{n.type}</span>,
      },
      {
        key: 'read',
        header: 'خوانده',
        hideOnMobile: true,
        cell: (n) => (
          <Badge tone={n.isRead ? 'neutral' : 'brand'} size="sm">
            {n.isRead ? 'بله' : 'خیر'}
          </Badge>
        ),
      },
      {
        key: 'payload',
        header: 'محتوا',
        cell: (n) => <p className="text-sm max-w-xl truncate">{payloadPreview(n.payload)}</p>,
      },
      {
        key: 'date',
        header: 'تاریخ',
        hideOnMobile: true,
        cell: (n) => (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {formatJalaliDate(n.createdAt, 'dateTime')}
          </span>
        ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">عملیات</span>,
        align: 'end',
        cell: (n) => (
          <IconButton
            aria-label="حذف"
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10"
            icon={<Trash2 className="size-4" />}
            onClick={() => setDel(n)}
          />
        ),
      },
    ],
    [],
  );

  return (
    <Shell adminOnly>
      <PageHeader title="مدیریت اعلان‌ها" description="مشاهده، حذف و ارسال اعلان سیستمی" />

      <Card className="mb-4">
        <CardContent className="!p-5 space-y-4">
          <h2 className="text-sm font-semibold">ارسال اعلان سیستمی</h2>
          <div>
            <Label required>عنوان</Label>
            <Input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              maxLength={120}
              placeholder="عنوان اعلان"
            />
          </div>
          <div>
            <Label required>متن</Label>
            <Textarea
              rows={3}
              value={formBody}
              onChange={(e) => setFormBody(e.target.value)}
              maxLength={500}
              placeholder="متن اعلان"
            />
          </div>
          <div>
            <Label>شناسه کاربر (اختیاری)</Label>
            <Input
              value={formUserId}
              onChange={(e) => setFormUserId(e.target.value)}
              placeholder="UUID — خالی = همه کاربران فعال"
            />
          </div>
          <div className="flex justify-end">
            <Button
              variant="brand"
              size="md"
              leftIcon={<Send className="size-4" />}
              disabled={!canSend}
              isLoading={sendSystem.isPending}
              onClick={() => sendSystem.mutate()}
            >
              ارسال اعلان
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="!p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[240px]">
              <Input
                size="sm"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setPage(1);
                }}
                placeholder="فیلتر شناسه کاربر (UUID)…"
                leadingIcon={<Search className="size-4" />}
              />
            </div>
            <div className="min-w-[160px]">
              <Input
                size="sm"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setPage(1);
                }}
                placeholder="نوع اعلان…"
              />
            </div>
            {userId || type ? (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<X className="size-4" />}
                onClick={() => {
                  setUserId('');
                  setType('');
                  setPage(1);
                }}
              >
                پاک‌سازی
              </Button>
            ) : null}
            <div className="ms-auto text-xs text-muted-foreground">
              {formatPersianNumber(list.data?.total ?? 0)} اعلان
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={list.data?.data ?? []}
        rowKey={(r) => r.id}
        isLoading={list.isLoading}
        page={page}
        pageSize={PAGE_SIZE}
        total={list.data?.total ?? 0}
        onPageChange={setPage}
        emptyTitle="اعلانی پیدا نشد"
        emptyIcon={<Bell className="size-7" />}
      />

      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title="حذف اعلان"
        description={del ? 'این اعلان حذف شود؟' : null}
        confirmLabel="حذف"
        tone="destructive"
        isLoading={remove.isPending}
        onConfirm={() => del && remove.mutate(del.id)}
      />
    </Shell>
  );
}
