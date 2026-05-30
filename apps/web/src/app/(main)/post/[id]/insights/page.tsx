'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Eye } from 'lucide-react';
import { formatPersianNumber } from '@agahiram/shared';
import { Skeleton, EmptyState } from '@agahiram/ui';
import { apiClient } from '@/lib/api';

interface InsightsResponse {
  totalViews: number;
  last7Days: Array<{ date: string; count: number }>;
  unique: number;
  repeat: number;
  byHour: number[];
}

const FA_WEEKDAY = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

function toFaDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y!, (m ?? 1) - 1, d ?? 1);
  const map = [1, 2, 3, 4, 5, 6, 0];
  return FA_WEEKDAY[map[date.getDay()]!]!;
}

export default function InsightsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, error } = useQuery({
    queryKey: ['post-insights', id],
    queryFn: async () => {
      const r = await apiClient.get<InsightsResponse>(`/posts/${id}/insights`);
      if (!r.success) throw new Error(r.error ?? 'دسترسی به آمار وجود ندارد');
      return r.data!;
    },
  });

  const maxDay = data?.last7Days.reduce((m, d) => Math.max(m, d.count), 0) ?? 0;
  const maxHour = data ? Math.max(...data.byHour, 1) : 1;
  const peakHour = data ? data.byHour.indexOf(maxHour) : -1;

  return (
    <div className="bg-background">
      <div className="sticky top-[var(--header-height)] z-20 flex items-center gap-2 border-b border-border bg-background/95 px-3 py-2 backdrop-blur-md">
        <Link
          href={`/post/${id}`}
          aria-label="بازگشت"
          className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden />
        </Link>
        <h1 className="text-h3 font-bold tracking-tight">آمار آگهی</h1>
      </div>

      <div className="mx-auto max-w-2xl space-y-5 p-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ) : error ? (
          <EmptyState
            icon={<Eye className="size-7" aria-hidden />}
            title="آمار قابل نمایش نیست"
            description={(error as Error).message}
          />
        ) : data ? (
          <>
            <section className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-surface p-4 shadow-card">
              <Stat label="کل بازدید" value={data.totalViews} />
              <Stat label="بازدیدکنندگان یکتا" value={data.unique} />
              <Stat label="بازدیدکنندگان تکراری" value={data.repeat} />
            </section>

            <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
              <h2 className="text-sm font-bold">۷ روز اخیر</h2>
              <ul className="flex h-40 items-end justify-between gap-1.5">
                {data.last7Days.map((d) => {
                  const pct = maxDay > 0 ? (d.count / maxDay) * 100 : 0;
                  return (
                    <li key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                      <div className="relative flex w-full flex-1 items-end">
                        <div
                          className="w-full rounded-t-md bg-primary/80 transition-all"
                          style={{ height: `${Math.max(pct, 4)}%` }}
                          aria-label={`${formatPersianNumber(d.count)} بازدید`}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {formatPersianNumber(d.count)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {toFaDayLabel(d.date)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-bold">بازدید بر اساس ساعت روز</h2>
                {peakHour >= 0 ? (
                  <span className="text-[11px] text-muted-foreground">
                    اوج بازدید: {formatPersianNumber(peakHour)}
                  </span>
                ) : null}
              </div>
              <ul className="flex h-28 items-end justify-between gap-0.5">
                {data.byHour.map((c, h) => {
                  const pct = (c / maxHour) * 100;
                  return (
                    <li key={h} className="flex flex-1 flex-col items-center gap-1">
                      <div className="relative w-full flex-1">
                        <div
                          className="absolute bottom-0 w-full rounded-t-sm bg-muted-foreground/60"
                          style={{ height: `${Math.max(pct, 3)}%` }}
                          aria-label={`ساعت ${h}: ${c} بازدید`}
                        />
                      </div>
                      {h % 4 === 0 ? (
                        <span className="text-[9px] tabular-nums text-muted-foreground">
                          {formatPersianNumber(h)}
                        </span>
                      ) : (
                        <span className="text-[9px] opacity-0">.</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="text-xl font-extrabold tabular-nums">{formatPersianNumber(value)}</span>
      <span className="mt-1 text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
