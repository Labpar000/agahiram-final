import { Suspense } from 'react';
import { BottomNav } from '@/components/bottom-nav';
import { TopBar } from '@/components/top-bar';
import { TabShell } from '@/components/tab-shell';
import { MainViewport } from '@/components/main-viewport';
import { FeedSpeculationRules } from '@/components/feed-speculation';

export default function MainLayout({
  children,
  feed,
  explore,
  reels,
  messages,
  profile,
}: {
  children: React.ReactNode;
  feed: React.ReactNode;
  explore: React.ReactNode;
  reels: React.ReactNode;
  messages: React.ReactNode;
  profile: React.ReactNode;
}) {
  return (
    <div
      className="min-h-svh bg-[linear-gradient(180deg,color-mix(in_oklch,var(--surface)_94%,var(--brand-50))_0%,var(--background)_14%,var(--background)_100%)] text-foreground"
      data-main-chrome
      style={{ paddingBottom: 'calc(var(--bottom-nav) + var(--safe-bottom))' }}
    >
      <div className="mx-auto min-h-svh max-w-2xl bg-surface shadow-[0_0_0_1px_color-mix(in_oklch,var(--border-subtle)_80%,transparent),0_24px_80px_-40px_rgb(0_0_0_/_0.35)]">
        <Suspense fallback={null}>
          <TopBar />
        </Suspense>
        <MainViewport>
          <TabShell
            feed={feed}
            explore={explore}
            reels={reels}
            messages={messages}
            profile={profile}
          >
            {children}
          </TabShell>
        </MainViewport>
        <FeedSpeculationRules />
      </div>
      <BottomNav />
    </div>
  );
}
