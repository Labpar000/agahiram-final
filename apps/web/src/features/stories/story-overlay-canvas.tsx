'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn, type StoryOverlayLayer, type StoryTextFont } from '@agahiram/shared';
import { Button, Input } from '@agahiram/ui';
import { STORY_FILTER_PRESETS, parseStoryOverlay } from './story-media-utils';
import type { PublishSticker } from './story-composer';

export { parseStoryOverlay };

export type DrawTool = 'pen' | 'marker' | 'neon' | 'eraser';

const FONTS: Array<{ id: StoryTextFont; label: string }> = [
  { id: 'classic', label: 'کلاسیک' },
  { id: 'modern', label: 'مدرن' },
  { id: 'neon', label: 'نئون' },
  { id: 'typewriter', label: 'ماشین' },
  { id: 'bold', label: 'ضخیم' },
  { id: 'script', label: 'خطی' },
];

// FIXED: expanded color palette for text/drawing (12 colors)
const COLORS = [
  '#ffffff',
  '#000000',
  '#f43f5e',
  '#e11d48', // reds
  '#22c55e',
  '#16a34a', // greens
  '#3b82f6',
  '#2563eb', // blues
  '#eab308',
  '#ca8a04', // yellows
  '#a855f7',
  '#9333ea', // purples
];
const EMOJI_STICKERS = ['😀', '🔥', '⭐', '💯', '🎉', '❤️'];

function fontCss(font: StoryTextFont, size = 24): string {
  switch (font) {
    case 'neon':
      return `bold ${size + 4}px sans-serif`;
    case 'modern':
      return `600 ${size}px sans-serif`;
    case 'typewriter':
      return `${size}px monospace`;
    case 'bold':
      return `800 ${size + 2}px sans-serif`;
    case 'script':
      return `italic ${size}px cursive`;
    default:
      return `${size}px serif`;
  }
}

function drawLayer(ctx: CanvasRenderingContext2D, w: number, h: number, layer: StoryOverlayLayer) {
  if (layer.type === 'text') {
    const size = 24 * (layer.scale ?? 1);
    ctx.save();
    ctx.translate(layer.x * w, layer.y * h);
    if (layer.rotation) ctx.rotate((layer.rotation * Math.PI) / 180);
    if (layer.bgColor) {
      ctx.fillStyle = layer.bgColor;
      const m = ctx.measureText(layer.text);
      ctx.fillRect(-m.width / 2 - 8, -size, m.width + 16, size + 12);
    }
    ctx.fillStyle = layer.color;
    ctx.font = fontCss(layer.font, size);
    ctx.textAlign = layer.align ?? 'center';
    if (layer.font === 'neon') {
      ctx.shadowColor = layer.color;
      ctx.shadowBlur = 12;
    }
    ctx.fillText(layer.text, 0, 0);
    ctx.restore();
  } else if (layer.type === 'sticker') {
    ctx.save();
    ctx.translate(layer.x * w, layer.y * h);
    if (layer.rotation) ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.font = `${layer.scale * 32}px serif`;
    ctx.textAlign = 'center';
    ctx.fillText(layer.emoji, 0, 0);
    ctx.restore();
  } else if (layer.type === 'draw') {
    for (const path of layer.paths) {
      if (path.points.length < 2) continue;
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      if (path.color === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else if (path.width > 8) {
        ctx.globalAlpha = 0.45;
      } else if (path.color.includes('neon')) {
        ctx.shadowColor = path.color.replace('neon-', '');
        ctx.shadowBlur = 10;
        ctx.strokeStyle = path.color.replace('neon-', '');
      }
      ctx.beginPath();
      ctx.moveTo(path.points[0]!.x * w, path.points[0]!.y * h);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i]!.x * w, path.points[i]!.y * h);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur = 0;
    }
  } else if (layer.type === 'filter') {
    /* applied via CSS on preview */
  }
}

export function StoryOverlayCanvas({
  previewUrl,
  mediaType,
  layers,
  onLayersChange,
  stickers = [],
  onStickersChange,
  filterId = 'none',
  onFilterChange,
  selectedIndex,
  onSelectIndex,
  drawMode = false,
  onDrawPointer,
}: {
  previewUrl: string;
  mediaType: 'image' | 'video';
  layers: StoryOverlayLayer[];
  onLayersChange: (layers: StoryOverlayLayer[]) => void;
  stickers?: PublishSticker[];
  onStickersChange?: (s: PublishSticker[]) => void;
  filterId?: string;
  onFilterChange?: (id: string) => void;
  selectedIndex: number | null;
  onSelectIndex: (i: number | null) => void;
  drawMode?: boolean;
  onDrawPointer?: (e: React.PointerEvent<HTMLCanvasElement>) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{
    index: number;
    startX: number;
    startY: number;
    ox: number;
    oy: number;
  } | null>(null);

  const filterCss = STORY_FILTER_PRESETS.find((f) => f.id === filterId)?.css ?? 'none';

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const layer of layers) {
      if (layer.type !== 'filter') drawLayer(ctx, canvas.width, canvas.height, layer);
    }
  }, [layers]);

  useEffect(() => {
    redraw();
  }, [layers, redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(() => {
      const rect = parent.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height);
      redraw();
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, [redraw]);

  const moveLayer = (index: number, x: number, y: number) => {
    onLayersChange(
      layers.map((l, i) => {
        if (i !== index) return l;
        if (l.type === 'draw') return l;
        return { ...l, x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
      }),
    );
  };

  const onPointerDownLayer = (e: React.PointerEvent, index: number) => {
    const layer = layers[index];
    if (!layer || layer.type === 'draw') return;
    e.stopPropagation();
    onSelectIndex(index);
    const canvas = canvasRef.current;
    if (!canvas) return;
    dragRef.current = {
      index,
      startX: e.clientX,
      startY: e.clientY,
      ox: 'x' in layer ? layer.x : 0.5,
      oy: 'y' in layer ? layer.y : 0.5,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMoveLayer = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dx = (e.clientX - d.startX) / rect.width;
    const dy = (e.clientY - d.startY) / rect.height;
    moveLayer(d.index, d.ox + dx, d.oy + dy);
  };

  const onPointerUpLayer = () => {
    dragRef.current = null;
  };

  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-black">
      {mediaType === 'video' ? (
        <video
          src={previewUrl}
          className="size-full object-cover"
          style={{ filter: filterCss }}
          muted
          playsInline
          autoPlay
          loop
        />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={previewUrl}
          alt=""
          className="size-full object-cover"
          style={{ filter: filterCss }}
        />
      )}
      <canvas
        ref={canvasRef}
        width={360}
        height={640}
        className={cn(
          'absolute inset-0 size-full touch-none',
          drawMode && 'z-[4] cursor-crosshair',
        )}
        onPointerDown={onDrawPointer}
        onPointerMove={onDrawPointer}
        onPointerUp={onDrawPointer}
        onPointerLeave={onDrawPointer}
      />
      {layers.map((layer, i) => {
        if (layer.type === 'draw') return null;
        const x = 'x' in layer ? layer.x : 0.5;
        const y = 'y' in layer ? layer.y : 0.5;
        const label =
          layer.type === 'text'
            ? layer.text.slice(0, 20)
            : layer.type === 'sticker'
              ? layer.emoji
              : '';
        return (
          <button
            key={`layer-${i}`}
            type="button"
            aria-label="جابجایی لایه"
            className={cn(
              'absolute z-[2] min-h-8 min-w-8 -translate-x-1/2 -translate-y-1/2 rounded border-2 border-transparent p-1 text-center',
              selectedIndex === i && 'border-primary',
              drawMode && 'pointer-events-none',
            )}
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
            }}
            onPointerDown={(e) => onPointerDownLayer(e, i)}
            onPointerMove={onPointerMoveLayer}
            onPointerUp={onPointerUpLayer}
          >
            <span className="pointer-events-none text-lg drop-shadow-md">{label}</span>
          </button>
        );
      })}
      {stickers.map((s, i) => (
        <button
          key={`st-${i}`}
          type="button"
          className="absolute z-[2] min-h-10 min-w-10 -translate-x-1/2 -translate-y-1/2 opacity-0"
          aria-hidden
          style={{
            left: `${(s.x ?? 0.5) * 100}%`,
            top: `${(s.y ?? 0.5) * 100}%`,
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (!onStickersChange) return;
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const startX = e.clientX;
            const startY = e.clientY;
            const ox = s.x ?? 0.5;
            const oy = s.y ?? 0.5;
            const onMove = (ev: PointerEvent) => {
              const dx = (ev.clientX - startX) / rect.width;
              const dy = (ev.clientY - startY) / rect.height;
              onStickersChange(
                stickers.map((st, j) =>
                  j === i
                    ? {
                        ...st,
                        x: Math.min(1, Math.max(0, ox + dx)),
                        y: Math.min(1, Math.max(0, oy + dy)),
                      }
                    : st,
                ),
              );
            };
            const onUp = () => {
              window.removeEventListener('pointermove', onMove);
              window.removeEventListener('pointerup', onUp);
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
          }}
        >
          {s.type}
        </button>
      ))}
      {onFilterChange ? (
        <div className="absolute bottom-2 inset-x-2 z-[3] flex gap-1 overflow-x-auto scrollbar-hide">
          {STORY_FILTER_PRESETS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange(f.id)}
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px]',
                filterId === f.id ? 'bg-primary text-primary-foreground' : 'bg-black/50 text-white',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function StoryOverlayTools({
  layers,
  onLayersChange,
  selectedIndex,
  onSelectIndex,
  tool,
  onToolChange,
  drawTool,
  onDrawToolChange,
  color,
  onColorChange,
  brushSize,
  onBrushSizeChange,
}: {
  layers: StoryOverlayLayer[];
  onLayersChange: (layers: StoryOverlayLayer[]) => void;
  selectedIndex: number | null;
  onSelectIndex: (i: number | null) => void;
  tool: 'text' | 'sticker' | 'draw';
  onToolChange: (t: 'text' | 'sticker' | 'draw') => void;
  drawTool: DrawTool;
  onDrawToolChange: (t: DrawTool) => void;
  color: string;
  onColorChange: (c: string) => void;
  brushSize: number;
  onBrushSizeChange: (n: number) => void;
}) {
  const [textInput, setTextInput] = useState('');
  const [font, setFont] = useState<StoryTextFont>('classic');
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('center');

  const addText = () => {
    if (!textInput.trim()) return;
    onLayersChange([
      ...layers,
      {
        type: 'text',
        text: textInput.trim(),
        x: 0.5,
        y: 0.5,
        color,
        font,
        align,
        scale: 1,
      },
    ]);
    setTextInput('');
    onSelectIndex(layers.length);
  };

  const addSticker = (emoji: string) => {
    onLayersChange([
      ...layers,
      { type: 'sticker', emoji, x: 0.5, y: 0.4, scale: 1.2, rotation: 0 },
    ]);
    onSelectIndex(layers.length);
  };

  const deleteSelected = () => {
    if (selectedIndex === null) return;
    onLayersChange(layers.filter((_, i) => i !== selectedIndex));
    onSelectIndex(null);
  };

  const clearDrawLayers = () => {
    onLayersChange(layers.filter((l) => l.type !== 'draw'));
    onSelectIndex(null);
  };

  const rotateSelected = () => {
    if (selectedIndex === null) return;
    onLayersChange(
      layers.map((l, i) => {
        if (i !== selectedIndex || l.type === 'draw' || l.type === 'filter') return l;
        const rot = ((l.rotation ?? 0) + 15) % 360;
        return { ...l, rotation: rot };
      }),
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {(['text', 'sticker', 'draw'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onToolChange(t)}
            className={cn(
              'flex-1 rounded-lg border py-2 text-xs font-medium',
              tool === t ? 'border-primary bg-accent' : 'border-border',
            )}
          >
            {t === 'text' ? 'متن' : t === 'sticker' ? 'استیکر' : 'نقاشی'}
          </button>
        ))}
        {selectedIndex !== null ? (
          <>
            <Button size="sm" variant="outline" onClick={rotateSelected}>
              چرخش
            </Button>
            <Button size="sm" variant="destructive" onClick={deleteSelected}>
              حذف
            </Button>
          </>
        ) : null}
      </div>

      {tool === 'text' ? (
        <div className="space-y-2">
          {/* FIXED: Instagram-style inline text editing.
              User types in the input, and the text appears live on the canvas.
              No animation/bg options — removed per user request.
              When user taps "تثبیت متن" the layer is finalized. */}
          <Input
            value={textInput}
            onChange={(e) => {
              const v = e.target.value;
              setTextInput(v);
              if (v.trim()) {
                const liveLayer: StoryOverlayLayer = {
                  type: 'text',
                  text: v.trim(),
                  x: 0.5,
                  y: 0.45,
                  color,
                  font,
                  align: align as 'left' | 'center' | 'right',
                  scale: 1,
                };
                // Update existing live text layer or add new one
                const textLayerIndices = layers
                  .map((l, i) => (l.type === 'text' ? i : -1))
                  .filter((i) => i >= 0);
                if (textLayerIndices.length > 0) {
                  const lastIdx = textLayerIndices[textLayerIndices.length - 1]!;
                  onLayersChange(layers.map((l, i) => (i === lastIdx ? liveLayer : l)));
                } else {
                  onLayersChange([...layers, liveLayer]);
                  onSelectIndex(layers.length);
                }
              } else {
                // Remove live text layer when input is cleared
                onLayersChange(layers.filter((l) => l.type !== 'text'));
                onSelectIndex(null);
              }
            }}
            placeholder="روی تصویر کلیک کنید و متن را بنویسید..."
          />
          <div className="flex flex-wrap gap-1">
            {FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFont(f.id)}
                className={cn(
                  'rounded-md border px-2 py-1 text-xs',
                  font === f.id && 'border-primary',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {(['right', 'center', 'left'] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAlign(a)}
                className={cn(
                  'flex-1 rounded border py-1 text-xs',
                  align === a && 'border-primary',
                )}
              >
                {a === 'center' ? 'وسط' : a === 'right' ? 'راست' : 'چپ'}
              </button>
            ))}
          </div>
          <Button size="sm" variant="secondary" onClick={addText}>
            تثبیت متن
          </Button>
        </div>
      ) : null}

      {tool === 'sticker' ? (
        <div className="flex flex-wrap gap-2">
          {EMOJI_STICKERS.map((e) => (
            <button key={e} type="button" className="text-2xl" onClick={() => addSticker(e)}>
              {e}
            </button>
          ))}
        </div>
      ) : null}

      {tool === 'draw' ? (
        <div className="space-y-2">
          {/* FIXED: add undo button for drawing — removes last draw path */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const drawLayers = layers
                  .map((l, i) => (l.type === 'draw' ? i : -1))
                  .filter((i) => i >= 0);
                if (drawLayers.length === 0) return;
                const lastIdx = drawLayers[drawLayers.length - 1]!;
                const lastLayer = layers[lastIdx];
                if (lastLayer?.type === 'draw' && lastLayer.paths.length > 1) {
                  onLayersChange(
                    layers.map((l, i) =>
                      i === lastIdx
                        ? { ...l, type: 'draw' as const, paths: lastLayer.paths.slice(0, -1) }
                        : l,
                    ),
                  );
                } else {
                  onLayersChange(layers.filter((_, i) => i !== lastIdx));
                }
                onSelectIndex(null);
              }}
            >
              ↶ برگشت
            </Button>
            <Button size="sm" variant="outline" onClick={clearDrawLayers}>
              پاک کردن همه
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ['pen', 'قلم'],
                ['marker', 'هایلایت'],
                ['neon', 'نئون'],
                ['eraser', 'پاک‌کن'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onDrawToolChange(id)}
                className={cn(
                  'rounded border px-2 py-1 text-xs',
                  drawTool === id && 'border-primary',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">ضخامت</label>
            <input
              type="range"
              min={2}
              max={12}
              value={brushSize}
              onChange={(e) => onBrushSizeChange(Number(e.target.value))}
              className="flex-1"
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            onClick={() => onColorChange(c)}
            className={cn('size-7 rounded-full border-2', color === c && 'border-primary')}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}
