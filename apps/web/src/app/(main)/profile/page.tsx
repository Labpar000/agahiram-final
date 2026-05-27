'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function MyProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user?.username) router.replace(`/profile/${user.username}`);
      else router.replace('/login');
    }
  }, [user, isLoading, router]);

  return <div className="p-8 text-center text-muted-foreground">در حال انتقال…</div>;
}
