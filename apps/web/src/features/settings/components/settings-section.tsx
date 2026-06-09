'use client';

import type { ReactNode } from 'react';

export function SettingsSection({
  label,
  children,
  description,
}: {
  label?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div>
      {label ? (
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      ) : null}
      {description ? (
        <p className="mb-2 px-2 text-xs text-muted-foreground">{description}</p>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        {children}
      </div>
    </div>
  );
}
