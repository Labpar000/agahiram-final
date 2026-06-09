'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@agahiram/ui';
import { useAuthStore } from '@/lib/auth-store';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner className="size-8" />
      </div>
    );
  }

  return <>{children}</>;
}
