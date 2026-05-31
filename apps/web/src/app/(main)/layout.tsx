import { BottomNav } from '@/components/bottom-nav';
import { TopBar } from '@/components/top-bar';
import { TabShell } from '@/components/tab-shell';
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
      <main
        id="main"
        className="mx-auto max-w-2xl"
        style={{
          minHeight: 'calc(100svh - var(--header-height) - var(--bottom-nav) - var(--safe-bottom))',
        }}
      >
        <TabShell feed={feed} explore={explore} reels={reels} messages={messages} profile={profile}>
          {children}
        </TabShell>
      </main>
      <FeedSpeculationRules />
      <BottomNav />
    </div>
  );
}
