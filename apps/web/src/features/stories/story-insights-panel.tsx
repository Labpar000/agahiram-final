'use client';

import Image from 'next/image';
import { formatPersianNumber } from '@agahiram/shared';
import { Spinner } from '@agahiram/ui';

export interface StoryInsightsData {
  storyId: string;
  createdAt: string;
  mediaUrl: string;
  type: string;
  sequenceIndex: number;
  reach: number;
  impressions: number;
  replies: number;
  linkClicks: number;
  stickerInteractions: number;
  commentCount: number;
  reactionCount: number;
  completionRate: number;
  navigation: {
    forward: number;
    back: number;
    exit: number;
    nextAccount: number;
  };
  slideDropOff?: Array<{
    storyId: string;
    sequenceIndex: number;
    views: number;
    forwards: number;
    exits: number;
  }>;
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-muted/60 px-3 py-2 text-center">
      <p className="text-lg font-bold">
        {typeof value === 'number' ? formatPersianNumber(value) : value}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

export function StoryInsightsPanel({
  data,
  isLoading,
}: {
  data?: StoryInsightsData;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid place-items-center py-8">
        <Spinner />
      </div>
    );
  }
  if (!data) return null;

  const nav = data.navigation;
  const navMax = Math.max(nav.forward, nav.back, nav.exit, nav.nextAccount, 1);

  return (
    <div className="space-y-4 border-b border-border pb-4">
      <h4 className="text-sm font-semibold">آمار این استوری</h4>
      <div className="grid grid-cols-3 gap-2">
        <Metric label="بازدید (reach)" value={data.reach} />
        <Metric label="نمایش" value={data.impressions} />
        <Metric label="تکمیل %" value={`${formatPersianNumber(data.completionRate)}٪`} />
        <Metric label="پاسخ DM" value={data.replies} />
        <Metric label="کامنت" value={data.commentCount} />
        <Metric label="واکنش" value={data.reactionCount} />
        <Metric label="کلیک لینک" value={data.linkClicks} />
        <Metric label="استیکر" value={data.stickerInteractions} />
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">ناوبری</p>
        <div className="space-y-1.5">
          {(
            [
              ['جلو', nav.forward],
              ['عقب', nav.back],
              ['خروج', nav.exit],
              ['حساب بعدی', nav.nextAccount],
            ] as const
          ).map(([label, count]) => (
            <div key={label} className="flex items-center gap-2 text-xs">
              <span className="w-16 shrink-0">{label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.round((count / navMax) * 100)}%` }}
                />
              </div>
              <span className="w-8 text-end">{formatPersianNumber(count)}</span>
            </div>
          ))}
        </div>
      </div>

      {data.slideDropOff && data.slideDropOff.length > 1 ? (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">رها شدن per اسلاید</p>
          <ul className="space-y-1">
            {data.slideDropOff.map((sl) => (
              <li
                key={sl.storyId}
                className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1 text-[11px]"
              >
                <span>اسلاید {formatPersianNumber(sl.sequenceIndex + 1)}</span>
                <span>
                  {formatPersianNumber(sl.views)} بازدید · {formatPersianNumber(sl.exits)} خروج
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function StoryInsightsListItem({
  item,
  onSelect,
}: {
  item: StoryInsightsData;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-xl border border-border p-2 text-start hover:bg-muted/50"
    >
      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
        {item.type === 'video' ? (
          <video src={item.mediaUrl} className="size-full object-cover" muted />
        ) : (
          <Image src={item.mediaUrl} alt="" fill className="object-cover" sizes="48px" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {formatPersianNumber(item.reach)} بازدید · {formatPersianNumber(item.completionRate)}٪
          تکمیل
        </p>
        <p className="text-xs text-muted-foreground">
          {formatPersianNumber(item.replies)} پاسخ · {formatPersianNumber(item.commentCount)} کامنت
        </p>
      </div>
    </button>
  );
}
