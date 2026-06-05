'use client';

import { useEffect } from 'react';
import { ErrorState } from '@agahiram/ui/components/error-state';

export default function MainError({
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
    <div className="min-h-[calc(100svh-var(--header-height)-var(--bottom-nav)-var(--safe-bottom))] bg-background">
      <ErrorState onRetry={reset} />
    </div>
  );
}
