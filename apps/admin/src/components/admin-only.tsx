'use client';

import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import { Button, EmptyState } from '@agahiram/ui';
import { useAuth } from '@/components/auth-provider';

export function useIsAdmin(): boolean {
  const { me } = useAuth();
  return me?.role === 'admin';
}

/** Blocks non-admin users with an access-denied empty state (no layout shell). */
export function AdminOnlyGate({
  children,
  title = 'دسترسی محدود',
  description = 'این بخش فقط برای ادمین کل در دسترس است.',
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
}) {
  const { me, isLoading } = useAuth();

  if (isLoading) return null;

  if (me?.role !== 'admin') {
    return (
      <EmptyState
        icon={<ShieldX className="size-8" />}
        title={title}
        description={description}
        action={
          <Link href="/">
            <Button variant="outline" size="sm">
              بازگشت به داشبورد
            </Button>
          </Link>
        }
      />
    );
  }

  return children;
}
