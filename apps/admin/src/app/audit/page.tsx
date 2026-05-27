'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ListChecks, Search, X } from 'lucide-react';
import { formatJalaliDate, formatPersianNumber } from '@agahiram/shared';
import { Badge, Button, Card, CardContent, EmptyState, Input } from '@agahiram/ui';
import Shell from '../layout-shell';
import { PageHeader } from '@/components/page-header';
import { apiClient } from '@/lib/api';

interface AuditEntry {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  target: string | null;
  payload: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { id: string; username: string | null; name: string | null } | null;
}

const PAGE_SIZE = 30;

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [actorId, setActorId] = useState('');
  const [action, setAction] = useState('');
  const [target, setTarget] = useState('');

  const list = useQuery({
    queryKey: ['admin', 'audit', { page, actorId, action, target }],
    queryFn: async () =>
      (
        await apiClient.get<{
          data: AuditEntry[];
          total: number;
          totalPages: number;
        }>('/admin/audit', {
          page,
          pageSize: PAGE_SIZE,
          actorId,
          action,
          target,
        })
      ).data,
  });

  const rows = list.data?.data ?? [];

  return (
    <Shell>
      <PageHeader title="گزارش عملیات" description="ردپای کامل تمام عملیات مدیریتی برای حسابرسی" />

      <Card className="mb-4">
        <CardContent className="!p-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[180px] flex-1">
              <Input
                size="sm"
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setPage(1);
                }}
                placeholder="نوع عمل (مثلاً post.delete)"
                leadingIcon={<Search className="size-4" />}
              />
            </div>
            <div className="min-w-[180px] flex-1">
              <Input
                size="sm"
                value={target}
                onChange={(e) => {
                  setTarget(e.target.value);
                  setPage(1);
                }}
                placeholder="هدف (مثلاً post:uuid)"
                dir="ltr"
              />
            </div>
            <div className="min-w-[180px] flex-1">
              <Input
                size="sm"
                value={actorId}
                onChange={(e) => {
                  setActorId(e.target.value);
                  setPage(1);
                }}
                placeholder="شناسه ادمین"
                dir="ltr"
              />
            </div>
            {action || target || actorId ? (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<X className="size-4" />}
                onClick={() => {
                  setAction('');
                  setTarget('');
                  setActorId('');
                  setPage(1);
                }}
              >
                پاک‌سازی
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {list.isLoading ? (
        <div className="text-center text-sm text-muted-foreground py-8">در حال بارگذاری…</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<ListChecks className="size-7" />} title="گزارشی پیدا نشد" />
      ) : (
        <Card>
          <CardContent className="!p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                    <th className="text-start px-3 py-2">عامل</th>
                    <th className="text-start px-3 py-2">عمل</th>
                    <th className="text-start px-3 py-2">هدف</th>
                    <th className="text-start px-3 py-2 hidden md:table-cell">داده</th>
                    <th className="text-start px-3 py-2 hidden lg:table-cell">IP</th>
                    <th className="text-end px-3 py-2">زمان</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 align-top">
                      <td className="px-3 py-2.5">
                        {r.actor ? (
                          <Link
                            href={`/users/${r.actor.id}`}
                            className="text-primary hover:underline text-xs"
                          >
                            {r.actor.name ?? r.actor.username ?? r.actor.id.slice(0, 8)}
                          </Link>
                        ) : (
                          <span className="text-xs font-mono">{r.actorId.slice(0, 8)}</span>
                        )}
                        <div className="text-[10px] text-muted-foreground">{r.actorRole}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge tone="neutral" size="sm" className="font-mono text-[11px]">
                          {r.action}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        {r.target ? (
                          <TargetLink target={r.target} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell max-w-[280px]">
                        {r.payload ? (
                          <details className="text-[11px]">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              مشاهده
                            </summary>
                            <pre
                              className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 text-[10px]"
                              dir="ltr"
                            >
                              {JSON.stringify(r.payload, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 hidden lg:table-cell">
                        <span dir="ltr" className="font-mono text-[11px] text-muted-foreground">
                          {r.ip ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-end">
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {formatJalaliDate(r.createdAt, 'dateTime')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {list.data && list.data.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-muted-foreground">{formatPersianNumber(list.data.total)} گزارش</div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(Math.max(1, page - 1))}
            >
              قبلی
            </Button>
            <span className="text-muted-foreground tabular-nums">
              صفحه {formatPersianNumber(page)} از {formatPersianNumber(list.data.totalPages)}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= list.data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              بعدی
            </Button>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}

function TargetLink({ target }: { target: string }) {
  const [kind, id] = target.split(':');
  const href = kind === 'post' ? `/posts/${id}` : kind === 'user' ? `/users/${id}` : undefined;
  if (!href) {
    return (
      <code dir="ltr" className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
        {target}
      </code>
    );
  }
  return (
    <Link
      href={href}
      className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-primary hover:underline"
      dir="ltr"
    >
      {target.slice(0, 30)}
    </Link>
  );
}
