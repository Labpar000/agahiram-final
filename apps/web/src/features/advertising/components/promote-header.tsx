'use client';

import { useRouter } from 'next/navigation';
import { IgArrowBack, IconButton } from '@agahiram/ui';

export function PromoteHeader({ title }: { title: string }) {
  const router = useRouter();

  return (
    <div className="glass sticky top-[var(--header-height)] z-[var(--z-raised)] flex items-center gap-2 border-b border-border-subtle px-3 py-4">
      <IconButton
        aria-label="بازگشت"
        icon={<IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} aria-hidden />}
        variant="ghost"
        onClick={() => router.back()}
      />
      <h1 className="text-lg font-bold tracking-tight">{title}</h1>
    </div>
  );
}
