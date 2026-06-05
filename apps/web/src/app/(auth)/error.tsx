'use client';

import { useEffect } from 'react';
import { ErrorState } from '@agahiram/ui/components/error-state';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50svh] items-center justify-center bg-background px-4">
      <ErrorState onRetry={reset} />
    </div>
  );
}
