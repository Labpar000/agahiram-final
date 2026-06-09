import { MAX_VOICE_DURATION_MS } from '@agahiram/shared';

export const VOICE_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
  'audio/ogg;codecs=opus',
  'audio/ogg',
] as const;

export const MIN_VOICE_DURATION_MS = 500;
export const MIN_VOICE_BLOB_BYTES = 100;

export function pickVoiceMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  for (const mime of VOICE_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return undefined;
}

export function mimeToExtension(mime: string): string {
  const base = mime.split(';')[0]?.trim() ?? mime;
  if (base.includes('mp4') || base.includes('aac')) return 'm4a';
  if (base.includes('ogg')) return 'ogg';
  return 'webm';
}

export function normalizeVoiceContentType(mime: string): string {
  return mime.split(';')[0]?.trim() ?? mime;
}

export type VoiceRecordingResult = {
  blob: Blob;
  mimeType: string;
  extension: string;
  durationMs: number;
};

export class VoiceRecorderSession {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private startedAt = 0;
  private mimeType = 'audio/webm';
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private onTick: ((elapsedMs: number) => void) | null = null;
  private tickId: ReturnType<typeof setInterval> | null = null;

  async start(onTick?: (elapsedMs: number) => void, onMaxDuration?: () => void): Promise<void> {
    this.onTick = onTick ?? null;
    // Avoid forcing sampleRate/channelCount — mismatched hardware rates cause
    // pitch-shifted playback. Let the browser pick native capture settings.
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    const picked = pickVoiceMimeType();
    this.mimeType = picked ?? 'audio/webm';
    const recorderOptions: MediaRecorderOptions = picked ? { mimeType: picked } : {};
    if (picked) {
      recorderOptions.audioBitsPerSecond = 48_000;
    }
    this.recorder = new MediaRecorder(this.stream, recorderOptions);
    this.chunks = [];
    this.startedAt = Date.now();

    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.recorder.start(250);
    this.onTick?.(0);
    this.tickId = setInterval(() => {
      this.onTick?.(Date.now() - this.startedAt);
    }, 250);

    this.timerId = setTimeout(() => {
      onMaxDuration?.();
    }, MAX_VOICE_DURATION_MS);
  }

  async stop(maxDurationReached = false): Promise<VoiceRecordingResult | null> {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.tickId) {
      clearInterval(this.tickId);
      this.tickId = null;
    }

    const recorder = this.recorder;
    const stream = this.stream;
    if (!recorder || recorder.state === 'inactive') {
      stream?.getTracks().forEach((t) => t.stop());
      this.cleanup();
      return null;
    }

    const durationMs = Date.now() - this.startedAt;

    const normalizedType = normalizeVoiceContentType(this.mimeType);
    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: normalizedType }));
      };
      if (recorder.state === 'recording') {
        try {
          recorder.requestData();
        } catch {
          /* optional — not all browsers expose requestData */
        }
      }
      recorder.stop();
    });

    stream?.getTracks().forEach((t) => t.stop());
    this.cleanup();

    if (durationMs < MIN_VOICE_DURATION_MS || blob.size < MIN_VOICE_BLOB_BYTES) {
      return null;
    }

    return {
      blob,
      mimeType: normalizedType,
      extension: mimeToExtension(this.mimeType),
      durationMs: maxDurationReached ? MAX_VOICE_DURATION_MS : durationMs,
    };
  }

  cancel(): void {
    if (this.timerId) clearTimeout(this.timerId);
    if (this.tickId) clearInterval(this.tickId);
    this.recorder?.stop();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.cleanup();
  }

  private cleanup(): void {
    this.recorder = null;
    this.stream = null;
    this.chunks = [];
    this.onTick = null;
  }
}

export function formatVoiceDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}
