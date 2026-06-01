'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Download,
  Grid2x2,
  Infinity,
  RotateCcw,
  Timer,
  Video,
  Zap,
  ZoomIn,
} from 'lucide-react';
import { IconButton } from '@agahiram/ui';
import { cn } from '@agahiram/shared';
import { captureSuperzoomFrame, downloadBlob, makeBoomerangBlob } from '../story-media-utils';

export type CapturedMedia = {
  blob: Blob;
  url: string;
  type: 'image' | 'video';
  durationMs?: number;
};

export type CameraMode = 'normal' | 'boomerang' | 'superzoom' | 'handsfree';

export function StoryCamera({
  onCapture,
  onGallery,
  onLayout,
}: {
  onCapture: (media: CapturedMedia) => void;
  onGallery: () => void;
  onLayout?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const handsFreeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const superzoomIvRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [facing, setFacing] = useState<'user' | 'environment'>('environment');
  const [recording, setRecording] = useState(false);
  const [timerSec, setTimerSec] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [mode, setMode] = useState<CameraMode>('normal');
  const [handsFree, setHandsFree] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [superzoom, setSuperzoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCameraError(null);
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: facing,
        aspectRatio: 9 / 16,
        ...(torchOn && facing === 'environment'
          ? { advanced: [{ torch: true } as MediaTrackConstraintSet] }
          : {}),
      },
      audio: mode !== 'superzoom',
    };
    const attachStream = async (stream: MediaStream) => {
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    };
    try {
      await attachStream(await navigator.mediaDevices.getUserMedia(constraints));
    } catch {
      try {
        await attachStream(
          await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing },
            audio: mode !== 'superzoom',
          }),
        );
      } catch {
        setCameraError('دوربین در دسترس نیست. از گالری یا آپلود فایل استفاده کنید.');
      }
    }
  }, [facing, torchOn, mode]);

  useEffect(() => {
    void startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (handsFreeTimerRef.current) clearTimeout(handsFreeTimerRef.current);
      if (superzoomIvRef.current) clearInterval(superzoomIvRef.current);
    };
  }, [startCamera]);

  useEffect(() => {
    if (mode !== 'superzoom') {
      setSuperzoom(1);
      if (superzoomIvRef.current) clearInterval(superzoomIvRef.current);
      return;
    }
    superzoomIvRef.current = setInterval(() => {
      setSuperzoom((z) => Math.min(z + 0.08, 2.5));
    }, 120);
    return () => {
      if (superzoomIvRef.current) clearInterval(superzoomIvRef.current);
    };
  }, [mode]);

  const runAfterTimer = (fn: () => void) => {
    if (timerSec > 0) {
      setCountdown(timerSec);
      let n = timerSec;
      const iv = setInterval(() => {
        n -= 1;
        setCountdown(n);
        if (n <= 0) {
          clearInterval(iv);
          setCountdown(null);
          fn();
        }
      }, 1000);
    } else fn();
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video || busy) return;
    setBusy(true);
    try {
      if (mode === 'superzoom') {
        const { blob, url } = await captureSuperzoomFrame(video, superzoom);
        onCapture({ blob, url, type: 'image' });
        return;
      }
      const run = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (!blob) return;
            onCapture({ blob, url: URL.createObjectURL(blob), type: 'image' });
          },
          'image/jpeg',
          0.92,
        );
      };
      runAfterTimer(run);
    } finally {
      setBusy(false);
    }
  };

  const startRecord = () => {
    const stream = streamRef.current;
    if (!stream || recording) return;
    chunksRef.current = [];
    const mime =
      typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/webm';
    const rec = new MediaRecorder(stream, { mimeType: mime });
    recorderRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    rec.onstop = async () => {
      setBusy(true);
      try {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        if (mode === 'boomerang') {
          try {
            const boom = await makeBoomerangBlob(blob);
            onCapture({ blob: boom.blob, url: boom.url, type: 'video', durationMs: 3000 });
            return;
          } catch {
            /* fall through to normal video */
          }
        }
        const url = URL.createObjectURL(blob);
        const video = document.createElement('video');
        video.src = url;
        const done = (durationMs: number) => {
          onCapture({
            blob,
            url,
            type: 'video',
            durationMs: Math.min(durationMs, 60_000),
          });
        };
        video.onloadedmetadata = () => {
          const ms = Math.round((video.duration || 3) * 1000);
          done(Number.isFinite(ms) && ms > 0 ? ms : 3000);
        };
        video.onerror = () => done(3000);
      } catch {
        /* fallback silent */
      } finally {
        setBusy(false);
      }
    };
    rec.start();
    setRecording(true);
    if (handsFree || mode === 'handsfree') {
      handsFreeTimerRef.current = setTimeout(() => stopRecord(), 15_000);
    }
    if (mode === 'boomerang') {
      handsFreeTimerRef.current = setTimeout(() => stopRecord(), 1200);
    }
  };

  const stopRecord = () => {
    if (handsFreeTimerRef.current) {
      clearTimeout(handsFreeTimerRef.current);
      handsFreeTimerRef.current = null;
    }
    recorderRef.current?.stop();
    setRecording(false);
  };

  const toggleHandsFreeRecord = () => {
    if (recording) stopRecord();
    else runAfterTimer(startRecord);
  };

  const saveLastToRoll = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob((b) => r(b), 'image/jpeg', 0.92),
    );
    if (blob) await downloadBlob(blob, `story-${Date.now()}.jpg`);
  };

  const cycleMode = () => {
    const order: CameraMode[] = ['normal', 'boomerang', 'superzoom', 'handsfree'];
    const i = order.indexOf(mode);
    setMode(order[(i + 1) % order.length]!);
    setHandsFree(false);
  };

  const modeLabel =
    mode === 'boomerang'
      ? 'بوومرنگ'
      : mode === 'superzoom'
        ? 'زوم'
        : mode === 'handsfree'
          ? 'دست‌آزاد'
          : 'عادی';

  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-black">
      <video
        ref={videoRef}
        className="size-full object-cover transition-transform duration-100"
        style={{
          transform: mode === 'superzoom' ? `scale(${superzoom})` : undefined,
        }}
        playsInline
        muted
      />
      {countdown !== null ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/40 text-6xl font-bold text-white">
          {countdown}
        </div>
      ) : null}
      {busy ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/30 text-sm text-white">
          در حال پردازش…
        </div>
      ) : null}
      {cameraError ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center text-sm text-white">
          <p>{cameraError}</p>
          <button
            type="button"
            className="rounded-full bg-white/15 px-4 py-2 text-xs font-medium"
            onClick={onGallery}
          >
            انتخاب از گالری
          </button>
        </div>
      ) : null}

      <div className="absolute inset-x-0 top-3 z-10 flex items-center justify-between px-3">
        <div className="flex gap-1">
          <IconButton
            aria-label="تعویض دوربین"
            variant="ghost"
            className="text-white"
            icon={<RotateCcw className="size-5" />}
            onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
          />
          <IconButton
            aria-label="فلاش"
            variant="ghost"
            className={cn('text-white', torchOn && 'text-yellow-300')}
            icon={<Zap className="size-5" />}
            onClick={() => setTorchOn((t) => !t)}
          />
          <IconButton
            aria-label="ذخیره در گالری"
            variant="ghost"
            className="text-white"
            icon={<Download className="size-5" />}
            onClick={() => void saveLastToRoll()}
          />
        </div>
        <button
          type="button"
          className={cn('rounded-full px-2 py-1 text-xs text-white', timerSec > 0 && 'bg-primary')}
          onClick={() => setTimerSec((t) => (t === 0 ? 3 : t === 3 ? 5 : t === 5 ? 10 : 0))}
        >
          <Timer className="inline size-4" /> {timerSec || 'تایمر'}
        </button>
      </div>

      <div className="absolute inset-x-0 top-14 z-10 flex justify-center">
        <button
          type="button"
          onClick={cycleMode}
          className="rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white"
        >
          {mode === 'boomerang' ? (
            <Infinity className="inline size-3.5" />
          ) : mode === 'superzoom' ? (
            <ZoomIn className="inline size-3.5" />
          ) : (
            <Camera className="inline size-3.5" />
          )}{' '}
          {modeLabel}
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-4">
        <button type="button" onClick={onGallery} className="text-xs text-white/90">
          گالری
        </button>
        {onLayout ? (
          <button type="button" onClick={onLayout} className="text-white/90" aria-label="کلاژ">
            <Grid2x2 className="size-6" />
          </button>
        ) : null}

        {mode === 'handsfree' || handsFree ? (
          <button
            type="button"
            aria-label={recording ? 'توقف ضبط' : 'شروع ضبط'}
            onClick={toggleHandsFreeRecord}
            className={cn(
              'size-16 rounded-full border-4',
              recording ? 'border-red-500 bg-red-500/40' : 'border-white bg-white/20',
            )}
          />
        ) : mode === 'superzoom' || mode === 'normal' ? (
          <button
            type="button"
            aria-label="عکس"
            onClick={() => void capturePhoto()}
            className="size-16 rounded-full border-4 border-white bg-white/20"
          />
        ) : null}

        {mode === 'normal' || mode === 'boomerang' ? (
          <button
            type="button"
            aria-label="ویدیو"
            className="text-white"
            onPointerDown={() => {
              if (handsFree) return;
              runAfterTimer(startRecord);
            }}
            onPointerUp={() => {
              if (!handsFree && recording) stopRecord();
            }}
            onPointerLeave={() => {
              if (!handsFree && recording) stopRecord();
            }}
          >
            <Video className={cn('size-8', recording && 'text-red-500')} />
          </button>
        ) : (
          <span className="w-8" />
        )}
      </div>

      {mode === 'normal' ? (
        <button
          type="button"
          className="absolute bottom-16 end-4 z-10 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white"
          onClick={() => setHandsFree((h) => !h)}
        >
          {handsFree ? 'دست‌آزاد ✓' : 'دست‌آزاد'}
        </button>
      ) : null}
    </div>
  );
}
