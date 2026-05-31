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
      className="min-h-svh bg-background text-foreground"
      style={{ paddingBottom: 'calc(var(--bottom-nav) + var(--safe-bottom))' }}
    >
      <TopBar />
      <MainViewport>
        <TabShell feed={feed} explore={explore} reels={reels} messages={messages} profile={profile}>
          {children}
        </TabShell>
      </MainViewport>
      <FeedSpeculationRules />
      <BottomNav />
    </div>
  );
}
