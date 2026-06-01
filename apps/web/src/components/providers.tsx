'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeProvider, Toaster, TooltipProvider } from '@agahiram/ui';
import { AuthSessionProvider } from './auth-session-provider';
import { NavigationLifecycleInstaller } from './navigation-lifecycle-installer';
import { UploadManagerProvider } from '@/lib/upload-manager';
import { PwaInstallBanner } from '@/components/pwa-install-banner';
import { SwUpdateBanner } from '@/components/sw-update-banner';
import { WebPushRegister } from '@/components/web-push-register';
import { CallProvider } from '@/features/calls/call-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60_000,
            gcTime: 30 * 60_000,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={client}>
        <AuthSessionProvider>
          <NavigationLifecycleInstaller />
          <WebPushRegister />
          <UploadManagerProvider>
            <CallProvider>
              <TooltipProvider>
                <SwUpdateBanner />
                {children}
                <PwaInstallBanner />
              </TooltipProvider>
            </CallProvider>
          </UploadManagerProvider>
        </AuthSessionProvider>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
