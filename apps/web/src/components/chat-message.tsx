'use client';

import { Check, CheckCheck } from 'lucide-react';
import { cn, formatJalaliDate } from '@agahiram/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@agahiram/ui';

export interface ChatMessageProps {
  id: string;
  content: string;
  isMine: boolean;
  createdAt: string;
  sender?: { username?: string | null; avatar?: string | null };
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  /** Group spacing — first message of a sender shows avatar, last shows status. */
  isFirstOfGroup?: boolean;
  isLastOfGroup?: boolean;
}

export function ChatMessage({
  content,
  isMine,
  createdAt,
  sender,
  status,
  isFirstOfGroup = true,
  isLastOfGroup = true,
}: ChatMessageProps) {
  return (
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
            'rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words shadow-xs',
            isMine
              ? 'bg-primary text-primary-foreground rounded-ee-md'
              : 'bg-surface-elevated text-foreground rounded-es-md',
          )}
        >
          {content}
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
                className={cn(status === 'read' && 'text-primary')}
              >
                {status === 'sending' ? (
                  <Check className="size-3 opacity-50" aria-hidden />
                ) : status === 'sent' ? (
                  <Check className="size-3" aria-hidden />
                ) : (
                  <CheckCheck className="size-3" aria-hidden />
                )}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function statusLabel(s: 'sending' | 'sent' | 'delivered' | 'read'): string {
  if (s === 'sending') return 'در حال ارسال';
  if (s === 'sent') return 'ارسال شد';
  if (s === 'delivered') return 'تحویل داده شد';
  return 'خوانده شد';
}
