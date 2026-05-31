'use client';

import { useState } from 'react';
import { IgCheck, IgCheckDouble, IgClose, Avatar, AvatarFallback, AvatarImage } from '@agahiram/ui';
import { cn, formatJalaliDate } from '@agahiram/shared';
import { StoryReplyPreview } from '@/components/story-reply-preview';
import type { StoryPreviewInMessage } from '@/hooks/useConversation';

export interface ChatMessageProps {
  id: string;
  content: string;
  type?: string;
  isMine: boolean;
  createdAt: string;
  sender?: { username?: string | null; avatar?: string | null };
  storyPreview?: StoryPreviewInMessage;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  isFirstOfGroup?: boolean;
  isLastOfGroup?: boolean;
}

export function ChatMessage({
  content,
  type = 'text',
  isMine,
  createdAt,
  sender,
  storyPreview,
  status,
  isFirstOfGroup = true,
  isLastOfGroup = true,
}: ChatMessageProps) {
  const [lightbox, setLightbox] = useState(false);

  return (
    <>
      <div
        className={cn(
          'flex w-full gap-2',
          isMine ? 'justify-end' : 'justify-start',
          isFirstOfGroup ? 'mt-3' : 'mt-0.5',
        )}
      >
        {/* Their avatar — start side; reserve space for grouped messages */}
        {!isMine && (
          <div className="w-8 shrink-0">
            {isLastOfGroup ? (
              <Avatar size="sm">
                {sender?.avatar ? <AvatarImage src={sender.avatar} alt="" /> : null}
                <AvatarFallback>{(sender?.username ?? '?').slice(0, 2)}</AvatarFallback>
              </Avatar>
            ) : null}
          </div>
        )}

        <div className="flex max-w-[82%] flex-col gap-0.5 sm:max-w-[72%]">
          <div
            className={cn(
              'rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words',
              isMine
                ? 'bg-ig-bubble-sent text-ig-bubble-sent-foreground rounded-ee-md'
                : 'bg-surface-muted text-foreground rounded-es-md',
            )}
          >
            {type === 'image' ? (
              <button type="button" onClick={() => setLightbox(true)} className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={content} alt="" className="max-h-48 rounded-xl object-cover" />
              </button>
            ) : type === 'voice' ? (
              <audio src={content} controls className="max-w-full" preload="metadata" />
            ) : storyPreview ? (
              <div className="space-y-2">
                <StoryReplyPreview preview={storyPreview} isMine={isMine} />
                {content ? <p className="text-sm">{content}</p> : null}
              </div>
            ) : (
              content
            )}
          </div>
          {isLastOfGroup ? (
            <div
              className={cn(
                'flex items-center gap-1 text-[10px] text-muted-foreground',
                isMine ? 'justify-end' : 'justify-start',
              )}
            >
              <span>{formatJalaliDate(createdAt, 'time')}</span>
              {isMine && status ? (
                <span
                  aria-label={statusLabel(status)}
                  className={cn(status === 'read' && 'text-ig-link')}
                >
                  {status === 'sending' ? (
                    <IgCheck className="size-3 opacity-50" strokeWidth={2} aria-hidden />
                  ) : status === 'sent' ? (
                    <IgCheck className="size-3" strokeWidth={2} aria-hidden />
                  ) : (
                    <IgCheckDouble className="size-3" strokeWidth={2} aria-hidden />
                  )}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {lightbox && type === 'image' ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            aria-label="بستن"
            className="absolute end-4 top-4 rounded-full bg-white/10 p-2 text-white"
            onClick={() => setLightbox(false)}
          >
            <IgClose className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={content} alt="" className="max-h-[90svh] max-w-full object-contain" />
        </div>
      ) : null}
    </>
  );
}

function statusLabel(s: 'sending' | 'sent' | 'delivered' | 'read'): string {
  if (s === 'sending') return 'در حال ارسال';
  if (s === 'sent') return 'ارسال شد';
  if (s === 'delivered') return 'تحویل داده شد';
  return 'خوانده شد';
}
