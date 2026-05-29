'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function MyProfilePage() {
  const { user, isLoading, refetch } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (user?.username) {
      router.replace(`/profile/${user.username}`);
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    let cancelled = false;
    void refetch().then(({ data }) => {
      if (cancelled) return;
      if (data?.username) router.replace(`/profile/${data.username}`);
      else router.replace('/onboarding');
    });

    return () => {
      cancelled = true;
    };
  }, [user, isLoading, router, refetch]);

  return <div className="p-8 text-center text-muted-foreground">در حال انتقال…</div>;
}
