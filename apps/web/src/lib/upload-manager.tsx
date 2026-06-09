'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast } from '@agahiram/ui';
import { uploadToMinio } from './upload-media';

export type UploadTask = {
  id: string;
  label: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  hiddenComplete?: boolean;
};

type UploadManagerContextValue = {
  tasks: UploadTask[];
  uploadFile: (opts: {
    id?: string;
    label: string;
    url: string;
    file: File;
    contentType: string;
  }) => Promise<boolean>;
  clearTask: (id: string) => void;
};

const UploadManagerContext = createContext<UploadManagerContextValue | null>(null);

export function UploadManagerProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeLockRef.current?.release();
    } catch {
      /* ignore */
    }
    wakeLockRef.current = null;
  }, []);

  const uploadFile = useCallback(
    async (opts: {
      id?: string;
      label: string;
      url: string;
      file: File;
      contentType: string;
    }): Promise<boolean> => {
      const id = opts.id ?? `upload-${Date.now()}`;
      setTasks((t) => [
        ...t.filter((x) => x.id !== id),
        { id, label: opts.label, progress: 0, status: 'uploading' },
      ]);

      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch {
          /* unsupported */
        }
      }

      const result = await uploadToMinio(opts.url, opts.file, opts.contentType, (pct) => {
        setTasks((t) => t.map((x) => (x.id === id ? { ...x, progress: pct } : x)));
      });
      const ok = result.ok;

      await releaseWakeLock();

      setTasks((t) =>
        t.map((x) =>
          x.id === id
            ? { ...x, progress: ok ? 100 : x.progress, status: ok ? 'done' : 'error' }
            : x,
        ),
      );

      if (!ok) {
        const hint =
          result.detail === 'network_error'
            ? 'اتصال به سرور ذخیره‌سازی برقرار نشد'
            : result.status
              ? `خطای HTTP ${result.status}`
              : 'آپلود ناموفق';
        console.error('[upload]', hint, opts.url, result.detail);
      }

      if (ok && document.visibilityState === 'hidden') {
        setTasks((t) => t.map((x) => (x.id === id ? { ...x, hiddenComplete: true } : x)));
      }

      return ok;
    },
    [releaseWakeLock],
  );

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      setTasks((t) => {
        const pending = t.filter((x) => x.hiddenComplete);
        if (pending.length > 0) {
          toast.success('آپلود شما با موفقیت انجام شد ✓');
        }
        return t.map((x) => ({ ...x, hiddenComplete: false }));
      });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const clearTask = useCallback((id: string) => {
    setTasks((t) => t.filter((x) => x.id !== id));
  }, []);

  return (
    <UploadManagerContext.Provider value={{ tasks, uploadFile, clearTask }}>
      {children}
      <UploadProgressPill tasks={tasks} />
    </UploadManagerContext.Provider>
  );
}

function UploadProgressPill({ tasks }: { tasks: UploadTask[] }) {
  const active = tasks.filter((t) => t.status === 'uploading');
  if (active.length === 0) return null;

  const task = active[0]!;
  return (
    <div
      className="fixed bottom-[calc(var(--bottom-nav)+var(--safe-bottom)+0.75rem)] end-3 z-[var(--z-toast)] min-w-[10rem] rounded-2xl border border-border bg-surface/95 px-3 py-2 shadow-lg backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      <p className="truncate text-xs font-medium text-foreground">{task.label}</p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-200"
          style={{ width: `${task.progress}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{task.progress}٪</p>
    </div>
  );
}

export function useUploadManager() {
  const ctx = useContext(UploadManagerContext);
  if (!ctx) throw new Error('useUploadManager must be used within UploadManagerProvider');
  return ctx;
}
