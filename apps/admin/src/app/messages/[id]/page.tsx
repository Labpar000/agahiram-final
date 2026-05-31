'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageSquare, Trash2 } from 'lucide-react';
import { formatJalaliDate } from '@agahiram/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  IconButton,
  Spinner,
  toast,
} from '@agahiram/ui';
import Shell from '../../layout-shell';
import { PageHeader } from '@/components/page-header';
import { DataTable, type Column } from '@/components/data-table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { apiClient } from '@/lib/api';

const MESSAGE_TYPE_LABEL: Record<string, string> = {
  text: 'متن',
  image: 'تصویر',
  voice: 'صدا',
  post: 'آگهی',
};

interface MessageRow {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  sender: {
    id: string;
    username: string | null;
    name: string | null;
    avatar: string | null;
  };
}

interface ConversationDetail {
  conversation: {
    id: string;
    updatedAt: string;
    participants: Array<{
      user: {
        id: string;
        username: string | null;
        name: string | null;
        avatar: string | null;
        phone: string;
      };
    }>;
  };
  messages: MessageRow[];
  total: number;
}

export default function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [del, setDel] = useState<MessageRow | null>(null);
  const PAGE_SIZE = 50;

  const detail = useQuery({
    queryKey: ['admin', 'conversation', id, page],
    queryFn: async () =>
      (
        await apiClient.get<ConversationDetail>(`/admin/conversations/${id}`, {
          page,
          pageSize: PAGE_SIZE,
        })
      ).data,
  });

  const remove = useMutation({
    mutationFn: async (messageId: string) => {
      const r = await apiClient.delete(`/admin/messages/${messageId}`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('پیام حذف شد');
      setDel(null);
      qc.invalidateQueries({ queryKey: ['admin', 'conversation', id] });
      qc.invalidateQueries({ queryKey: ['admin', 'conversations'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const columns: Column<MessageRow>[] = useMemo(
    () => [
      {
        key: 'sender',
        header: 'فرستنده',
        cell: (m) => (
          <Link
            href={`/users/${m.sender.id}`}
            className="inline-flex items-center gap-2 hover:underline"
          >
            <Avatar size="xs">
              {m.sender.avatar ? <AvatarImage src={m.sender.avatar} alt="" /> : null}
              <AvatarFallback>{(m.sender.username ?? '?').slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span className="text-xs">@{m.sender.username ?? '—'}</span>
          </Link>
        ),
      },
      {
        key: 'content',
        header: 'متن',
        cell: (m) => <p className="text-sm whitespace-pre-wrap max-w-xl">{m.content}</p>,
      },
      {
        key: 'type',
        header: 'نوع',
        hideOnMobile: true,
        cell: (m) => (
          <Badge tone="neutral" size="sm">
            {MESSAGE_TYPE_LABEL[m.type] ?? m.type}
          </Badge>
        ),
      },
      {
        key: 'createdAt',
        header: 'تاریخ',
        hideOnMobile: true,
        cell: (m) => (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {formatJalaliDate(m.createdAt, 'dateTime')}
          </span>
        ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">عملیات</span>,
        align: 'end',
        cell: (m) => (
          <IconButton
            aria-label="حذف"
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10"
            icon={<Trash2 className="size-4" />}
            onClick={() => setDel(m)}
          />
        ),
      },
    ],
    [],
  );

  const convo = detail.data?.conversation;

  return (
    <Shell>
      <div className="mb-4">
        <Link href="/messages">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="size-4" />}>
            بازگشت به لیست
          </Button>
        </Link>
      </div>

      {detail.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : !convo ? (
        <PageHeader title="گفتگو یافت نشد" />
      ) : (
        <>
          <PageHeader
            title="جزئیات گفتگو"
            description={
              convo.participants
                .map((p) => `@${p.user.username ?? p.user.name ?? '—'}`)
                .join(' · ') || '—'
            }
          />

          <Card className="mb-4">
            <CardContent className="!p-4">
              <div className="flex flex-wrap gap-3">
                {convo.participants.map((p) => (
                  <Link
                    key={p.user.id}
                    href={`/users/${p.user.id}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-muted/50"
                  >
                    <Avatar size="sm">
                      {p.user.avatar ? <AvatarImage src={p.user.avatar} alt="" /> : null}
                      <AvatarFallback>{(p.user.username ?? '?').slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">@{p.user.username ?? '—'}</div>
                      {p.user.name ? (
                        <div className="text-[11px] text-muted-foreground">{p.user.name}</div>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <DataTable
            columns={columns}
            rows={detail.data?.messages ?? []}
            rowKey={(r) => r.id}
            isLoading={detail.isFetching && !detail.data}
            page={page}
            pageSize={PAGE_SIZE}
            total={detail.data?.total ?? 0}
            onPageChange={setPage}
            emptyTitle="پیامی در این گفتگو نیست"
            emptyIcon={<MessageSquare className="size-7" />}
          />
        </>
      )}

      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title="حذف پیام"
        description={del ? `«${del.content.slice(0, 80)}…» حذف شود؟` : null}
        confirmLabel="حذف"
        tone="destructive"
        isLoading={remove.isPending}
        onConfirm={() => del && remove.mutate(del.id)}
      />
    </Shell>
  );
}
