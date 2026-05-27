'use client';

/**
 * Compatibility shim — the real Toaster is mounted globally by `providers.tsx`
 * via `@agahiram/ui`'s sonner-based toaster. Existing call sites can keep using
 * `const { toast } = useToast()` while we migrate them to `import { toast }`.
 */
import { toast as sonnerToast } from '@agahiram/ui';

type ToastKind = 'success' | 'error' | 'info' | 'warning';

function dispatch(message: string, type: ToastKind = 'info') {
  if (type === 'success') return sonnerToast.success(message);
  if (type === 'error') return sonnerToast.error(message);
  if (type === 'warning') return sonnerToast.warning(message);
  return sonnerToast(message);
}

export function useToast() {
  return { toast: dispatch };
}

export const toast = dispatch;

/** Legacy named export from old API — now a no-op (Toaster is mounted globally). */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
