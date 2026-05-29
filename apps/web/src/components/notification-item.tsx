'use client';

import Link from 'next/link';
import {
  AlertCircle,
  BadgeCheck,
  Bell,
  CheckCircle2,
  Megaphone,
  MessageCircle,
  Sparkles,
  Trash2,
  TrendingDown,
  UserPlus,
  Wallet,
  Zap,
} from 'lucide-react';
import { NotificationType, type NotificationItem as Notif } from '@agahiram/shared';
import { cn, formatRelativeTimeFa } from '@agahiram/shared';
import { Avatar, AvatarFallback, AvatarImage, IgComment, IgHeart } from '@agahiram/ui';

interface Props {
  notif: Notif;
  onClick?: () => void;
}

interface Payload {
  fromUser?: { id?: string; username?: string; avatar?: string | null };
  fromUserId?: string;
  userId?: string;
  postId?: string;
  postTitle?: string;
  conversationId?: string;
  reason?: string;
  message?: string;
}

type IconCmp = React.ComponentType<{ className?: string; filled?: boolean; strokeWidth?: number }>;

const ICON_MAP: Record<NotificationType, { icon: IconCmp; tone: string; filled?: boolean }> = {
  [NotificationType.LIKE]: { icon: IgHeart, tone: 'text-[var(--like)]', filled: true },
  [NotificationType.COMMENT]: { icon: IgComment, tone: 'text-primary' },
  [NotificationType.FOLLOW]: { icon: UserPlus, tone: 'text-[var(--verified)]' },
  [NotificationType.MESSAGE]: { icon: MessageCircle as IconCmp, tone: 'text-primary' },
  [NotificationType.AD_APPROVED]: { icon: CheckCircle2, tone: 'text-success' },
  [NotificationType.AD_REJECTED]: { icon: AlertCircle, tone: 'text-destructive' },
  [NotificationType.AD_REMOVED]: { icon: Trash2, tone: 'text-destructive' },
  [NotificationType.BOOST_EXPIRING]: { icon: Zap, tone: 'text-warning' },
  [NotificationType.PRICE_DROP]: { icon: TrendingDown, tone: 'text-success' },
  [NotificationType.STORY_MENTION]: { icon: Sparkles, tone: 'text-primary' },
  [NotificationType.WALLET_CREDIT]: { icon: Wallet, tone: 'text-success' },
  [NotificationType.WALLET_DEBIT]: { icon: Wallet, tone: 'text-warning' },
  [NotificationType.BROADCAST]: { icon: Megaphone, tone: 'text-primary' },
  [NotificationType.SYSTEM_ANNOUNCEMENT]: { icon: Bell, tone: 'text-primary' },
};

function buildHref(notif: Notif): string | null {
  const p = notif.payload as Payload;
  switch (notif.type) {
    case NotificationType.LIKE:
    case NotificationType.COMMENT:
    case NotificationType.AD_APPROVED:
    case NotificationType.AD_REJECTED:
    case NotificationType.BOOST_EXPIRING:
    case NotificationType.PRICE_DROP:
      return p.postId ? `/post/${p.postId}` : null;
    case NotificationType.FOLLOW:
      return p.fromUser?.username ? `/profile/${p.fromUser.username}` : null;
    case NotificationType.MESSAGE:
      return p.conversationId ? `/messages/${p.conversationId}` : '/messages';
    case NotificationType.STORY_MENTION: {
      const storyUserId = p.fromUserId ?? p.fromUser?.id ?? p.userId;
      return storyUserId ? `/stories/${storyUserId}` : null;
    }
    default:
      return null;
  }
}

function buildMessage(notif: Notif): string {
  const p = notif.payload as Payload;
  const u = p.fromUser?.username ?? 'کاربری';
  switch (notif.type) {
    case NotificationType.LIKE:
      return `${u} پست شما را پسندید`;
    case NotificationType.COMMENT:
      return `${u} نظر گذاشت${p.message ? `: «${p.message.slice(0, 60)}»` : ''}`;
    case NotificationType.FOLLOW:
      return `${u} شما را دنبال کرد`;
    case NotificationType.MESSAGE:
      return `${u} پیام جدیدی برای شما فرستاد`;
    case NotificationType.AD_APPROVED:
      return `آگهی شما تأیید شد${p.postTitle ? `: ${p.postTitle}` : ''}`;
    case NotificationType.AD_REJECTED:
      return `آگهی شما رد شد${p.reason ? `: ${p.reason}` : ''}`;
    case NotificationType.BOOST_EXPIRING:
      return 'مدت نردبان آگهی شما رو به پایان است';
    case NotificationType.PRICE_DROP:
      return `قیمت یکی از آگهی‌های ذخیره‌شده شما کاهش یافت`;
    case NotificationType.STORY_MENTION:
      return `${u} شما را در استوری منشن کرد`;
    default:
      return 'اعلان جدید';
  }
}

export function NotificationItem({ notif, onClick }: Props) {
  const href = buildHref(notif);
  const {
    icon: Icon,
    tone,
    filled,
  } = ICON_MAP[notif.type] ?? { icon: BadgeCheck, tone: 'text-foreground', filled: false };
  const message = buildMessage(notif);
  const p = notif.payload as Payload;

  const body = (
    <div
      className={cn(
        'group/notif flex min-h-16 items-start gap-3 px-4 py-3 transition-colors tap-none',
        'hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
        !notif.isRead && 'bg-accent/45',
      )}
    >
      <div className="relative shrink-0">
        <Avatar size="md">
          {p.fromUser?.avatar ? <AvatarImage src={p.fromUser.avatar} alt="" /> : null}
          <AvatarFallback>{(p.fromUser?.username ?? '?').slice(0, 2)}</AvatarFallback>
        </Avatar>
        <span
          aria-hidden
          className={cn(
            'absolute -bottom-0.5 -end-0.5 grid size-5 place-items-center rounded-full bg-surface ring-2 ring-surface',
            tone,
          )}
        >
          <Icon className="size-3.5" filled={filled} strokeWidth={2.2} />
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed text-foreground">{message}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
          {formatRelativeTimeFa(notif.createdAt)}
        </p>
      </div>
      {!notif.isRead ? (
        <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
      ) : null}
    </div>
  );

  return href ? (
    <Link
      href={href}
      onClick={onClick}
      aria-label={message}
      className="block focus-visible:outline-none"
    >
      {body}
    </Link>
  ) : (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-start focus-visible:outline-none"
    >
      {body}
    </button>
  );
}
