'use client';

/**
 * Lightweight image editor used in the create-post flow.
 *
 * Features:
 *  - Crop with aspect presets (free / 1:1 / 4:5 / 16:9)
 *  - Rotate 90 degrees CW
 *  - Filters: brightness, contrast, saturation
 *  - Outputs a JPEG `File` that replaces the user's original (never modifies it
 *    in-place; the original blob is left untouched).
 *
 * Implementation notes: pure DOM/Canvas. No external deps. The crop handle is
 * a draggable rectangle laid over the preview image. The processed image is
 * produced by drawing the rotated/filtered source onto an offscreen canvas
 * then exporting `image/jpeg` at quality 0.92.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, RotateCw, X } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogTitle } from '@agahiram/ui';

type AspectKey = 'free' | '1:1' | '4:5' | '16:9';

const ASPECTS: Array<{ key: AspectKey; label: string; value: number | null }> = [
  { key: 'free', label: 'آزاد', value: null },
  { key: '1:1', label: '۱:۱', value: 1 },
  { key: '4:5', label: '۴:۵', value: 4 / 5 },
  { key: '16:9', label: '۱۶:۹', value: 16 / 9 },
];

interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function ImageEditor({
  file,
  open,
  onCancel,
  onApply,
}: {
  file: File;
  open: boolean;
  onCancel: () => void;
  onApply: (out: File) => void;
}) {
  const [src, setSrc] = useState<string>('');
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [aspect, setAspect] = useState<AspectKey>('free');
  const [crop, setCrop] = useState<CropBox | null>(null);
  const [processing, setProcessing] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Load preview URL from file
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Reset state when the dialog opens with a new file
  useEffect(() => {
    if (open) {
      setRotation(0);
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setAspect('free');
      setCrop(null);
    }
  }, [open, file]);

  const onImageLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  // Reset crop when aspect or rotation changes so user can re-draw cleanly
  useEffect(() => {
    setCrop(null);
  }, [aspect, rotation]);

  // Compute the rotated dimensions of the source image (post-rotation natural).
  const rotated = useMemo(() => {
    if (!naturalSize) return null;
    const swap = rotation === 90 || rotation === 270;
    return swap ? { w: naturalSize.h, h: naturalSize.w } : { w: naturalSize.w, h: naturalSize.h };
  }, [naturalSize, rotation]);

  const filterStyle = useMemo(
    () => ({
      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
      transform: `rotate(${rotation}deg)`,
    }),
    [brightness, contrast, saturation, rotation],
  );

  // ---- Crop interaction (drag to create) ----
  const dragRef = useRef<{ startX: number; startY: number; bounds: DOMRect } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    const bounds = stageRef.current.getBoundingClientRect();
    const startX = e.clientX - bounds.left;
    const startY = e.clientY - bounds.top;
    dragRef.current = { startX, startY, bounds };
    setCrop({ x: startX, y: startY, w: 0, h: 0 });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (!d) return;
      const x = Math.max(0, Math.min(d.bounds.width, e.clientX - d.bounds.left));
      const y = Math.max(0, Math.min(d.bounds.height, e.clientY - d.bounds.top));
      let w = x - d.startX;
      let h = y - d.startY;
      const aspectVal = ASPECTS.find((a) => a.key === aspect)?.value ?? null;
      if (aspectVal != null) {
        // Lock height by width sign-preserving
        const sign = Math.sign(w) || 1;
        h = (Math.abs(w) / aspectVal) * Math.sign(h || 1);
        // Ensure box stays in stage
        const targetH = Math.abs(h);
        if (
          d.startY + Math.sign(h) * targetH < 0 ||
          d.startY + Math.sign(h) * targetH > d.bounds.height
        ) {
          h = Math.sign(h) * Math.min(targetH, Math.abs(d.startY - (h > 0 ? d.bounds.height : 0)));
          w = sign * Math.abs(h) * aspectVal;
        }
      }
      const nx = w >= 0 ? d.startX : d.startX + w;
      const ny = h >= 0 ? d.startY : d.startY + h;
      setCrop({ x: nx, y: ny, w: Math.abs(w), h: Math.abs(h) });
    },
    [aspect],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const apply = useCallback(async () => {
    if (!naturalSize || !rotated) return;
    setProcessing(true);
    try {
      // 1) Create source canvas with rotation + filters baked in
      const img = imgRef.current;
      if (!img) return;
      const out = document.createElement('canvas');
      out.width = rotated.w;
      out.height = rotated.h;
      const ctx = out.getContext('2d');
      if (!ctx) return;

      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      ctx.translate(out.width / 2, out.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -naturalSize.w / 2, -naturalSize.h / 2);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.filter = 'none';

      // 2) If user drew a crop, map screen coords to rotated-image coords
      let final = out;
      const stage = stageRef.current;
      if (crop && crop.w > 4 && crop.h > 4 && stage) {
        const sb = stage.getBoundingClientRect();
        // Image is rendered at object-contain inside stage. Find display rect.
        const stageAspect = sb.width / sb.height;
        const rAspect = rotated.w / rotated.h;
        let dispW = sb.width;
        let dispH = sb.height;
        let offX = 0;
        let offY = 0;
        if (rAspect > stageAspect) {
          dispH = sb.width / rAspect;
          offY = (sb.height - dispH) / 2;
        } else {
          dispW = sb.height * rAspect;
          offX = (sb.width - dispW) / 2;
        }
        const cx = Math.max(0, (crop.x - offX) / dispW) * rotated.w;
        const cy = Math.max(0, (crop.y - offY) / dispH) * rotated.h;
        const cw = Math.min(rotated.w - cx, (crop.w / dispW) * rotated.w);
        const ch = Math.min(rotated.h - cy, (crop.h / dispH) * rotated.h);
        if (cw > 4 && ch > 4) {
          const c2 = document.createElement('canvas');
          c2.width = Math.round(cw);
          c2.height = Math.round(ch);
          const c2x = c2.getContext('2d');
          c2x?.drawImage(out, cx, cy, cw, ch, 0, 0, cw, ch);
          final = c2;
        }
      }

      // 3) Export as JPEG and wrap into a File
      final.toBlob(
        (blob) => {
          if (!blob) {
            setProcessing(false);
            return;
          }
          const renamed = file.name.replace(/\.[^./]+$/, '') + '_edited.jpg';
          onApply(new File([blob], renamed, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.92,
      );
    } finally {
      setProcessing(false);
    }
  }, [brightness, contrast, crop, file.name, naturalSize, onApply, rotated, rotation, saturation]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-2xl" aria-describedby={undefined}>
        <DialogTitle className="sr-only">ویرایش تصویر</DialogTitle>
        <div className="space-y-4">
          <header className="flex items-center justify-between">
            <h2 className="text-h3 font-bold">ویرایش تصویر</h2>
            <button
              type="button"
              aria-label="بستن"
              onClick={onCancel}
              className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="size-5" aria-hidden />
            </button>
          </header>

          <div
            ref={stageRef}
            className="relative mx-auto aspect-square w-full max-h-[60vh] select-none overflow-hidden rounded-xl bg-black"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {src ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                ref={imgRef}
                src={src}
                alt=""
                onLoad={onImageLoad}
                draggable={false}
                style={filterStyle}
                className="pointer-events-none absolute inset-0 m-auto h-full max-h-full w-full max-w-full object-contain"
              />
            ) : null}
            {crop && crop.w > 2 && crop.h > 2 ? (
              <div
                className="pointer-events-none absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]"
                style={{
                  left: crop.x,
                  top: crop.y,
                  width: crop.w,
                  height: crop.h,
                }}
              />
            ) : (
              <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] text-white/80">
                برای برش، روی تصویر بکشید
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">نسبت برش:</span>
            {ASPECTS.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => setAspect(a.key)}
                className={
                  'rounded-full border px-3 py-1 text-xs font-semibold transition-colors ' +
                  (aspect === a.key
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-surface text-foreground hover:bg-muted')
                }
              >
                {a.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="ms-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold hover:bg-muted"
            >
              <RotateCw className="size-3.5" aria-hidden />
              چرخش ۹۰°
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SliderRow label="روشنایی" value={brightness} onChange={setBrightness} />
            <SliderRow label="کنتراست" value={contrast} onChange={setContrast} />
            <SliderRow label="اشباع رنگ" value={saturation} onChange={setSaturation} />
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-border pt-3">
            <Button variant="ghost" onClick={onCancel}>
              لغو
            </Button>
            <Button
              variant="brand"
              leftIcon={<Check className="size-4" />}
              onClick={() => void apply()}
              isLoading={processing}
            >
              اعمال
            </Button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums text-muted-foreground">{value}٪</span>
      </div>
      <input
        type="range"
        min={0}
        max={200}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[var(--primary)]"
      />
    </label>
  );
}
