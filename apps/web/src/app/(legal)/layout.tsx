import Link from 'next/link';
import { IgArrowBack, IgWordmark } from '@agahiram/ui';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-background">
      <header className="glass sticky top-0 z-20 border-b border-border-subtle">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            href="/feed"
            className="grid size-9 place-items-center rounded-full text-foreground transition-colors hover:bg-muted tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="بازگشت"
          >
            <IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} aria-hidden />
          </Link>
          <IgWordmark className="text-lg">آگهیرام</IgWordmark>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-4 py-6">{children}</div>
    </div>
  );
}
