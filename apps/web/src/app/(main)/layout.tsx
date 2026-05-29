import { BottomNav } from '@/components/bottom-nav';
import { TopBar } from '@/components/top-bar';
import { PageTransition } from '@/components/page-transition';

export default function MainLayout({ children }: { children: React.ReactNode }) {
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
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />
    </div>
  );
}
