import { QueryClient } from '@tanstack/react-query';
import { cache } from 'react';

/**
 * Per-request QueryClient for Server Components.
 *
 * Wrapped in React's `cache()` so a single render pass reuses one client (and
 * therefore one dehydrated cache) across nested server components. The browser
 * keeps using the long-lived client created in `components/providers.tsx`; this
 * one only exists to prefetch + dehydrate during SSR.
 */
export const getQueryClient = cache(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          // Match the client default so hydrated data isn't considered stale and
          // refetched immediately after mount.
          staleTime: 30_000,
        },
      },
    }),
);
