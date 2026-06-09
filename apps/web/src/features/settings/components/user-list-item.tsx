'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage, Button } from '@agahiram/ui';

export interface SettingsUserSummary {
  id: string;
  username: string | null;
  name: string | null;
  avatar: string | null;
  isVerified?: boolean;
}

export function UserListItem({
  user,
  actionLabel,
  onAction,
  isLoading,
}: {
  user: SettingsUserSummary;
  actionLabel: string;
  onAction: () => void;
  isLoading?: boolean;
}) {
  const display = user.name ?? user.username ?? 'کاربر';
  const handle = user.username ? `@${user.username}` : null;

  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
      <Link href={user.username ? `/profile/${user.username}` : '#'} className="shrink-0">
        <Avatar size="sm" verified={user.isVerified ?? false}>
          {user.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
          <AvatarFallback>{(user.username ?? display).slice(0, 2)}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{display}</p>
        {handle ? <p className="truncate text-xs text-muted-foreground">{handle}</p> : null}
      </div>
      <Button type="button" variant="outline" size="sm" isLoading={isLoading} onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}
