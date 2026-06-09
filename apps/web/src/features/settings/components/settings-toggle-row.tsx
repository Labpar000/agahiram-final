'use client';

import { Switch } from '@agahiram/ui';

export function SettingsToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        {description ? (
          <div className="text-[11px] text-muted-foreground">{description}</div>
        ) : null}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}
