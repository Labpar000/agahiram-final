import { cn } from '@agahiram/shared';

export function SponsoredBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm',
        className,
      )}
    >
      تبلیغ
    </span>
  );
}
