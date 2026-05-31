/** Client-side story media helpers (boomerang, download, superzoom export). */

export async function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** ~1s forward + reverse loop encoded as webm from a short capture. */
export async function makeBoomerangBlob(sourceBlob: Blob): Promise<{ blob: Blob; url: string }> {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  const src = URL.createObjectURL(sourceBlob);
  video.src = src;

  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error('خواندن ویدیو ناموفق'));
  });

  const w = video.videoWidth || 720;
  const h = video.videoHeight || 1280;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');

  const frameCount = 12;
  const frames: ImageData[] = [];
  const duration = Math.min(video.duration || 1, 1.2);
  video.currentTime = 0.01;

  for (let i = 0; i < frameCount; i++) {
    video.currentTime = (duration * i) / frameCount;
    await new Promise<void>((r) => {
      video.onseeked = () => r();
    });
    ctx.drawImage(video, 0, 0, w, h);
    frames.push(ctx.getImageData(0, 0, w, h));
  }

  URL.revokeObjectURL(src);

  const stream = canvas.captureStream(24);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };

  const playFrames = async (list: ImageData[], delayMs: number) => {
    for (const frame of list) {
      ctx.putImageData(frame, 0, 0);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve({ blob, url: URL.createObjectURL(blob) });
    };
    recorder.onerror = () => reject(new Error('ضبط بوومرنگ ناموفق'));
    recorder.start();
    void (async () => {
      await playFrames(frames, 80);
      await playFrames([...frames].reverse(), 80);
      recorder.stop();
    })();
  });
}

/** Composite grid cells into 9:16 JPEG. */
export async function compositeLayoutCollage(
  cells: Array<{ url: string; type: 'image' | 'video' }>,
  layout: 2 | 3 | 4 | 6,
): Promise<{ blob: Blob; url: string }> {
  const w = 1080;
  const h = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  const grids: Record<number, Array<{ x: number; y: number; cw: number; ch: number }>> = {
    2: [
      { x: 0, y: 0, cw: w, ch: h / 2 },
      { x: 0, y: h / 2, cw: w, ch: h / 2 },
    ],
    3: [
      { x: 0, y: 0, cw: w, ch: h / 2 },
      { x: 0, y: h / 2, cw: w / 2, ch: h / 2 },
      { x: w / 2, y: h / 2, cw: w / 2, ch: h / 2 },
    ],
    4: [
      { x: 0, y: 0, cw: w / 2, ch: h / 2 },
      { x: w / 2, y: 0, cw: w / 2, ch: h / 2 },
      { x: 0, y: h / 2, cw: w / 2, ch: h / 2 },
      { x: w / 2, y: h / 2, cw: w / 2, ch: h / 2 },
    ],
    6: [
      { x: 0, y: 0, cw: w / 2, ch: h / 3 },
      { x: w / 2, y: 0, cw: w / 2, ch: h / 3 },
      { x: 0, y: h / 3, cw: w / 2, ch: h / 3 },
      { x: w / 2, y: h / 3, cw: w / 2, ch: h / 3 },
      { x: 0, y: (2 * h) / 3, cw: w / 2, ch: h / 3 },
      { x: w / 2, y: (2 * h) / 3, cw: w / 2, ch: h / 3 },
    ],
  };

  const slots = grids[layout] ?? grids[2];

  const loadImage = (url: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('بارگذاری تصویر ناموفق'));
      img.src = url;
    });

  for (let i = 0; i < Math.min(cells.length, slots.length); i++) {
    const cell = cells[i]!;
    const slot = slots[i]!;
    if (cell.type === 'image') {
      const img = await loadImage(cell.url);
      const scale = Math.max(slot.cw / img.width, slot.ch / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = slot.x + (slot.cw - dw) / 2;
      const dy = slot.y + (slot.ch - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    }
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('رندر ناموفق'))), 'image/jpeg', 0.92);
  });
  return { blob, url: URL.createObjectURL(blob) };
}

/** Capture current video frame with zoom factor as JPEG. */
export async function captureSuperzoomFrame(
  video: HTMLVideoElement,
  zoom: number,
): Promise<{ blob: Blob; url: string }> {
  const w = video.videoWidth || 720;
  const h = video.videoHeight || 1280;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  const sw = w / zoom;
  const sh = h / zoom;
  const sx = (w - sw) / 2;
  const sy = (h - sh) / 2;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('رندر ناموفق'))), 'image/jpeg', 0.92);
  });
  return { blob, url: URL.createObjectURL(blob) };
}

import type { StoryOverlayDocument } from '@agahiram/shared';
import { storyOverlayDocumentSchema } from '@agahiram/shared';

export function parseStoryOverlay(json: unknown) {
  const parsed = storyOverlayDocumentSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

export function getStoryFilterCss(overlay: StoryOverlayDocument | null | undefined): string {
  const filterLayer = overlay?.layers?.find((l) => l.type === 'filter');
  if (filterLayer?.type !== 'filter') return 'none';
  return STORY_FILTER_PRESETS.find((f) => f.id === filterLayer.name)?.css ?? 'none';
}

export const STORY_FILTER_PRESETS: Array<{ id: string; label: string; css: string }> = [
  { id: 'none', label: 'عادی', css: 'none' },
  { id: 'warm', label: 'گرم', css: 'sepia(0.35) saturate(1.2)' },
  { id: 'cool', label: 'سرد', css: 'hue-rotate(200deg) saturate(0.9)' },
  { id: 'bw', label: 'سیاه‌سفید', css: 'grayscale(1)' },
  { id: 'vivid', label: 'زنده', css: 'saturate(1.6) contrast(1.1)' },
  { id: 'fade', label: 'محو', css: 'contrast(0.85) brightness(1.1) saturate(0.8)' },
];
