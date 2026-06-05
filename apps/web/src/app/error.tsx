'use client';

import { useEffect } from 'react';
import { ErrorState } from '@agahiram/ui/components/error-state';

export default function Error({
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
    <div className="min-h-[50svh] bg-background">
      <ErrorState onRetry={reset} />
    </div>
  );
}
