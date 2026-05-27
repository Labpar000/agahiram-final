'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { cn } from '../lib/utils';

export interface HeartBurstProps {
  /** When toggled true, plays the burst animation once and then resets. */
  trigger: number;
  className?: string;
  size?: number;
}

/**
 * A one-shot heart-burst overlay (Instagram-style double-tap to like).
 * Mount it inside a relatively positioned parent; it covers the parent absolutely.
 *
 * Increment `trigger` (e.g. by a counter or timestamp) to play the animation.
 */
export function HeartBurst({ trigger, className, size = 96 }: HeartBurstProps) {
  return (
    <AnimatePresence>
      {trigger ? (
        <motion.div
          key={trigger}
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 grid place-items-center z-20',
            className,
          )}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: [0.3, 1.15, 0.95, 1], opacity: [0, 1, 1, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.65, ease: [0.34, 1.56, 0.64, 1], times: [0, 0.3, 0.55, 1] }}
        >
          <Heart
            className="text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.45)]"
            style={{ width: size, height: size }}
            fill="currentColor"
            strokeWidth={0}
            aria-hidden
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
