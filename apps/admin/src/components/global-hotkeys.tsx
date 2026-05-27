'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@agahiram/ui';

/* g + key navigation map. We deliberately use a 2-key sequence (g, then letter)
 * to avoid clashing with form input keys. Pressing `?` opens the cheat sheet. */
const NAV_HOTKEYS: Array<{ keys: string; href: string; label: string }> = [
  { keys: 'g d', href: '/', label: 'داشبورد' },
  { keys: 'g p', href: '/pending', label: 'صف تأیید' },
  { keys: 'g a', href: '/posts', label: 'همه‌ی آگهی‌ها' },
  { keys: 'g u', href: '/users', label: 'کاربران' },
  { keys: 'g r', href: '/reports', label: 'گزارش‌ها' },
  { keys: 'g c', href: '/comments', label: 'کامنت‌ها' },
  { keys: 'g $', href: '/payments', label: 'پرداخت‌ها' },
  { keys: 'g s', href: '/settings', label: 'تنظیمات' },
  { keys: 'g l', href: '/audit', label: 'گزارش عملیات' },
  { keys: 'g y', href: '/system', label: 'وضعیت سیستم' },
];

const HOTKEY_MAP: Record<string, string> = Object.fromEntries(
  NAV_HOTKEYS.map((h) => [h.keys.split(' ')[1] ?? '', h.href]),
);

export function GlobalHotkeys() {
  const router = useRouter();
  const [help, setHelp] = useState(false);
  const [pendingG, setPendingG] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /input|textarea|select/i.test(e.target.tagName))
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '?') {
        e.preventDefault();
        setHelp(true);
        return;
      }
      if (e.key === 'g' && !pendingG) {
        setPendingG(true);
        setTimeout(() => setPendingG(false), 1500);
        return;
      }
      if (pendingG && HOTKEY_MAP[e.key]) {
        e.preventDefault();
        router.push(HOTKEY_MAP[e.key]!);
        setPendingG(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, pendingG]);

  return (
    <Dialog open={help} onOpenChange={setHelp}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>میان‌برهای صفحه‌کلید</DialogTitle>
        </DialogHeader>
        <ul className="space-y-2 text-sm">
          {NAV_HOTKEYS.map((h) => (
            <li key={h.keys} className="flex items-center justify-between">
              <span>{h.label}</span>
              <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">
                {h.keys}
              </kbd>
            </li>
          ))}
          <li className="flex items-center justify-between border-t border-border pt-2 mt-2">
            <span>صف تأیید: حرکت / تأیید / رد</span>
            <span className="space-x-1 rtl:space-x-reverse">
              <kbd className="rounded border border-border bg-muted px-1 text-[10px]">j</kbd>
              <kbd className="rounded border border-border bg-muted px-1 text-[10px]">k</kbd>
              <kbd className="rounded border border-border bg-muted px-1 text-[10px]">a</kbd>
              <kbd className="rounded border border-border bg-muted px-1 text-[10px]">r</kbd>
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span>راهنما</span>
            <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">
              ?
            </kbd>
          </li>
        </ul>
        {pendingG ? (
          <p className="text-[11px] text-muted-foreground">
            یک کلید دیگر فشار دهید تا به صفحه‌ی موردنظر بروید…
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
