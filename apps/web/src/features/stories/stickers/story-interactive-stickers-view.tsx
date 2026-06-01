'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { IgBell, IgLocation, IgShop } from '@agahiram/ui';
import { cn, formatPersianNumber } from '@agahiram/shared';
import { Button, Input, toast } from '@agahiram/ui';
import { apiClient } from '@/lib/api';

export interface ApiStorySticker {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

function useCountdown(endsAt: string) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    const tick = () => {
      const ms = new Date(endsAt).getTime() - Date.now();
      if (ms <= 0) {
        setLeft('تمام شد');
        return;
      }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setLeft(
        `${formatPersianNumber(h)}:${formatPersianNumber(m).padStart(2, '0')}:${formatPersianNumber(s).padStart(2, '0')}`,
      );
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [endsAt]);
  return left;
}

export function StoryInteractiveStickersView({
  storyId,
  stickers,
  isOwner,
  storyOwnerId,
  ownerResults,
  allowInteraction = true,
}: {
  storyId: string;
  stickers: ApiStorySticker[];
  isOwner?: boolean;
  storyOwnerId?: string;
  allowInteraction?: boolean;
  ownerResults?: Array<{
    id: string;
    type: string;
    payload: Record<string, unknown>;
    summary?: {
      options?: string[];
      percents?: number[];
      total?: number;
      average?: number;
      emoji?: string;
    };
  }>;
}) {
  const [answered, setAnswered] = useState<Record<string, boolean>>({});
  const [quizFlash, setQuizFlash] = useState<string | null>(null);

  if (!stickers.length) return null;

  const resultById = new Map((ownerResults ?? []).map((r) => [r.id, r]));

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {quizFlash ? (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-30 grid place-items-center text-4xl font-bold',
            quizFlash === 'correct' ? 'text-green-400' : 'text-red-400',
          )}
        >
          {quizFlash === 'correct' ? '🎉 درست!' : 'اشتباه'}
        </div>
      ) : null}
      {stickers.map((s) => (
        <div
          key={s.id}
          className="pointer-events-auto absolute max-w-[88%]"
          style={{
            left: `${s.x * 100}%`,
            top: `${s.y * 100}%`,
            transform: `translate(-50%, -50%) scale(${s.scale}) rotate(${s.rotation}deg)`,
          }}
        >
          <StickerBody
            storyId={storyId}
            sticker={s}
            isOwner={isOwner}
            storyOwnerId={storyOwnerId}
            ownerSummary={resultById.get(s.id)?.summary}
            allowInteraction={allowInteraction}
            done={!!answered[s.id]}
            onDone={(extra) => {
              setAnswered((p) => ({ ...p, [s.id]: true }));
              if (extra?.quizCorrect != null) {
                setQuizFlash(extra.quizCorrect ? 'correct' : 'wrong');
                window.setTimeout(() => setQuizFlash(null), 1400);
              }
            }}
          />
        </div>
      ))}
    </div>
  );
}

function StickerBody({
  storyId,
  sticker,
  isOwner,
  storyOwnerId,
  ownerSummary,
  allowInteraction,
  done,
  onDone,
}: {
  storyId: string;
  sticker: ApiStorySticker;
  isOwner?: boolean;
  storyOwnerId?: string;
  allowInteraction?: boolean;
  ownerSummary?: {
    options?: string[];
    percents?: number[];
    total?: number;
    average?: number;
    emoji?: string;
  };
  done: boolean;
  onDone: (extra?: { quizCorrect?: boolean }) => void;
}) {
  const p = sticker.payload;

  if (
    !allowInteraction &&
    ['POLL', 'QUIZ', 'SLIDER', 'QUESTION', 'NOTIFY'].includes(sticker.type)
  ) {
    const label =
      (p.question as string) ??
      (p.title as string) ??
      (sticker.type === 'HASHTAG' ? `#${p.tag ?? ''}` : sticker.type);
    return (
      <span className="rounded-lg bg-black/55 px-2 py-1 text-[10px] font-semibold text-white shadow backdrop-blur-sm">
        {label}
      </span>
    );
  }

  if (sticker.type === 'POLL' && !isOwner) {
    const options = (p.options as string[]) ?? ['بله', 'خیر'];
    const question = (p.question as string) ?? '';
    return (
      <PollQuizUI
        question={question}
        options={options}
        done={done}
        onVote={async (i) => {
          const r = await apiClient.post(`/stories/${storyId}/stickers/${sticker.id}/vote`, {
            voteIndex: i,
          });
          if (r.success) onDone();
          else toast.error(r.error ?? 'خطا در ثبت رأی');
        }}
      />
    );
  }

  if (sticker.type === 'QUIZ' && !isOwner) {
    const options = (p.options as string[]) ?? [];
    const question = (p.question as string) ?? '';
    return (
      <PollQuizUI
        question={question}
        options={options}
        done={done}
        onVote={async (i) => {
          const r = await apiClient.post<{ correct?: boolean }>(
            `/stories/${storyId}/stickers/${sticker.id}/vote`,
            { voteIndex: i },
          );
          if (r.success) onDone({ quizCorrect: r.data?.correct });
          else toast.error(r.error ?? 'خطا در ثبت پاسخ');
        }}
      />
    );
  }

  if (sticker.type === 'LINK') {
    const url = p.url as string;
    const label = (p.label as string) ?? 'باز کردن';
    if (!url) return null;
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-neutral-900 shadow-lg"
        onClick={() => {
          void apiClient.post(`/stories/${storyId}/link-click`, { url, stickerId: sticker.id });
        }}
      >
        {label}
      </a>
    );
  }

  if (sticker.type === 'PRODUCT') {
    const postId = p.postId as string;
    const title = (p.title as string) ?? 'مشاهده آگهی';
    if (!postId) return null;
    return (
      <Link
        href={`/post/${postId}`}
        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-neutral-900 shadow-lg"
        onClick={() => {
          const path = `/post/${postId}`;
          void apiClient.post(`/stories/${storyId}/link-click`, {
            url: path,
            stickerId: sticker.id,
          });
        }}
      >
        <IgShop className="size-4" strokeWidth={1.75} aria-hidden />
        {title}
      </Link>
    );
  }

  if (sticker.type === 'QUESTION' && isOwner) {
    return (
      <span className="rounded-lg bg-black/60 px-3 py-1.5 text-xs font-semibold text-white shadow backdrop-blur-sm">
        {(p.question as string) ?? 'سوال'}
      </span>
    );
  }

  if (sticker.type === 'QUESTION' && !isOwner) {
    return (
      <QuestionUI
        storyId={storyId}
        stickerId={sticker.id}
        question={(p.question as string) ?? ''}
        done={done}
        onDone={() => onDone()}
      />
    );
  }

  if (sticker.type === 'HASHTAG') {
    const tag = String(p.tag ?? '');
    return (
      <Link
        href={`/hashtag/${encodeURIComponent(tag)}/stories`}
        className="rounded-lg bg-white/90 px-2 py-1 text-sm font-bold text-primary shadow"
      >
        #{tag}
      </Link>
    );
  }

  if (sticker.type === 'MENTION') {
    const username = p.username as string;
    if (!username) return null;
    return (
      <Link
        href={`/profile/${username}`}
        className="rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-primary shadow"
      >
        @{username}
      </Link>
    );
  }

  if (sticker.type === 'LOCATION') {
    const cityId = p.cityId as string;
    const cityName = (p.cityName as string) ?? 'مکان';
    return cityId ? (
      <Link
        href={`/location/${cityId}/stories`}
        className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-neutral-900 shadow"
      >
        <IgLocation className="size-3.5" strokeWidth={1.75} aria-hidden />
        {cityName}
      </Link>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold shadow">
        <IgLocation className="size-3.5" strokeWidth={1.75} aria-hidden />
        {cityName}
      </span>
    );
  }

  if (sticker.type === 'COUNTDOWN') {
    const title = (p.title as string) ?? '';
    const endsAt = p.endsAt as string;
    return (
      <CountdownSticker
        title={title}
        endsAt={endsAt}
        storyId={storyId}
        stickerId={sticker.id}
        isOwner={isOwner}
        done={done}
        onDone={() => onDone()}
      />
    );
  }

  if (sticker.type === 'SLIDER' && !isOwner) {
    const question = (p.question as string) ?? '';
    const emoji = (p.emoji as string) ?? '🔥';
    return (
      <div className="w-56 rounded-2xl bg-black/75 p-3 text-white shadow-lg">
        <p className="mb-2 text-sm">{question}</p>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          defaultValue={0.5}
          disabled={done}
          className="w-full"
          onPointerUp={async (e) => {
            if (done) return;
            const r = await apiClient.post(`/stories/${storyId}/stickers/${sticker.id}/vote`, {
              sliderValue: Number((e.target as HTMLInputElement).value),
            });
            if (r.success) onDone();
            else toast.error(r.error ?? 'خطا');
          }}
        />
        <span className="text-lg">{emoji}</span>
      </div>
    );
  }

  if (sticker.type === 'NOTIFY' && !isOwner && storyOwnerId) {
    return (
      <button
        type="button"
        disabled={done}
        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-neutral-900 shadow-lg"
        onClick={async () => {
          const r = await apiClient.post(`/stories/${storyId}/stickers/${sticker.id}/notify`, {});
          if (r.success) {
            toast.success('برای استوری‌های بعدی این کاربر اعلان فعال شد');
            onDone();
          } else toast.error(r.error ?? 'خطا');
        }}
      >
        <IgBell className="size-4" strokeWidth={1.75} aria-hidden />
        {done ? 'فعال شد' : 'اعلان پست‌های بعدی'}
      </button>
    );
  }

  if (sticker.type === 'GIF') {
    const url = (p.previewUrl as string) ?? (p.url as string);
    if (!url) return null;
    return (
      <div className="relative h-24 w-24">
        <Image src={url} alt="" fill className="object-contain" unoptimized />
      </div>
    );
  }

  if (sticker.type === 'TIME' || sticker.type === 'DATE' || sticker.type === 'WEATHER') {
    const label = (p.label as string) ?? '';
    const temp = p.tempC as number | undefined;
    return (
      <span className="rounded-xl bg-black/55 px-3 py-2 text-sm font-semibold text-white shadow backdrop-blur-md">
        {sticker.type === 'WEATHER' && temp != null ? `${formatPersianNumber(temp)}° — ` : ''}
        {label}
      </span>
    );
  }

  if (isOwner && (sticker.type === 'POLL' || sticker.type === 'QUIZ') && ownerSummary?.options) {
    return (
      <div className="min-w-[180px] rounded-2xl bg-black/75 p-2 text-white shadow-lg backdrop-blur-md">
        <p className="mb-1 text-xs font-semibold">{(p.question as string) ?? sticker.type}</p>
        {ownerSummary.options.map((opt, i) => (
          <div key={opt} className="mb-0.5">
            <div className="flex justify-between text-[10px]">
              <span>{opt}</span>
              <span>{ownerSummary.percents?.[i] ?? 0}٪</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full bg-primary"
                style={{ width: `${ownerSummary.percents?.[i] ?? 0}%` }}
              />
            </div>
          </div>
        ))}
        <p className="mt-1 text-[10px] text-white/60">{ownerSummary.total ?? 0} پاسخ</p>
      </div>
    );
  }

  if (isOwner && sticker.type === 'SLIDER' && ownerSummary) {
    return (
      <span className="rounded-lg bg-black/70 px-2 py-1 text-[10px] text-white">
        میانگین {Math.round((ownerSummary.average ?? 0) * 100)}٪ {ownerSummary.emoji ?? '🔥'}
      </span>
    );
  }

  if (
    isOwner &&
    (sticker.type === 'POLL' || sticker.type === 'QUIZ' || sticker.type === 'SLIDER')
  ) {
    return (
      <span className="rounded-lg bg-black/50 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
        {(p.question as string) ?? sticker.type}
      </span>
    );
  }

  return null;
}

function PollQuizUI({
  question,
  options,
  done,
  onVote,
}: {
  question: string;
  options: string[];
  done: boolean;
  onVote: (index: number) => void | Promise<void>;
}) {
  return (
    <div className="min-w-[200px] rounded-2xl bg-black/75 p-3 text-white shadow-lg backdrop-blur-md">
      <p className="mb-2 text-sm font-semibold">{question}</p>
      {done ? (
        <p className="text-xs text-white/70">ثبت شد</p>
      ) : (
        <div className="flex flex-col gap-1">
          {options.map((opt, i) => (
            <button
              key={`${opt}-${i}`}
              type="button"
              className="rounded-lg bg-white/20 px-3 py-2 text-sm hover:bg-white/30"
              onClick={() => void onVote(i)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionUI({
  storyId,
  stickerId,
  question,
  done,
  onDone,
}: {
  storyId: string;
  stickerId: string;
  question: string;
  done: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [text, setText] = useState('');
  return (
    <div className="w-64 rounded-2xl bg-black/75 p-3 text-white shadow-lg">
      <p className="mb-2 text-sm font-semibold">{question}</p>
      {done ? (
        <p className="text-xs text-white/80">پاسخ به پیام‌ها ارسال شد</p>
      ) : (
        <>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mb-2 border-white/30 bg-white/10 text-white"
            placeholder="پاسخ شما"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              if (!text.trim()) return;
              const r = await apiClient.post<{ conversationId?: string }>(
                `/stories/${storyId}/stickers/${stickerId}/answer`,
                { text: text.trim() },
              );
              if (r.success) {
                const cid = r.data?.conversationId;
                toast.success(cid ? 'پاسخ در پیام‌ها ارسال شد' : 'پاسخ ارسال شد');
                if (cid) router.push(`/messages/${cid}`);
                onDone();
              } else toast.error(r.error ?? 'خطا');
            }}
          >
            ارسال
          </Button>
        </>
      )}
    </div>
  );
}

function CountdownSticker({
  title,
  endsAt,
  storyId,
  stickerId,
  isOwner,
  done,
  onDone,
}: {
  title: string;
  endsAt: string;
  storyId: string;
  stickerId: string;
  isOwner?: boolean;
  done: boolean;
  onDone: () => void;
}) {
  const left = useCountdown(endsAt);
  return (
    <div className="rounded-2xl bg-gradient-to-br from-pink-600/90 to-purple-700/90 px-4 py-3 text-center text-white shadow-lg">
      <p className="text-xs opacity-90">{title}</p>
      <p className="font-mono text-xl font-bold tracking-wider">{left}</p>
      {!isOwner && !done ? (
        <button
          type="button"
          className="mt-2 text-xs underline"
          onClick={async () => {
            const r = await apiClient.post(`/stories/${storyId}/stickers/${stickerId}/remind`, {});
            if (r.success) {
              toast.success('یادآور در اعلان‌ها ثبت شد');
              onDone();
            } else toast.error(r.error ?? 'خطا');
          }}
        >
          یادآور
        </button>
      ) : null}
    </div>
  );
}
