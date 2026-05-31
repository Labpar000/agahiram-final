'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@agahiram/shared';
import { Button, Input } from '@agahiram/ui';

export type StoryOverlayLayer =
  | {
      type: 'text';
      text: string;
      x: number;
      y: number;
      color: string;
      font: 'classic' | 'modern' | 'neon';
    }
  | { type: 'sticker'; emoji: string; x: number; y: number; scale: number }
  | {
      type: 'draw';
      paths: Array<{ color: string; width: number; points: Array<{ x: number; y: number }> }>;
    };

export interface StoryOverlayDocument {
  layers: StoryOverlayLayer[];
}

const FONTS = [
  { id: 'classic' as const, label: 'کلاسیک' },
  { id: 'modern' as const, label: 'مدرن' },
  { id: 'neon' as const, label: 'نئون' },
];

const COLORS = ['#ffffff', '#000000', '#f43f5e', '#22c55e', '#3b82f6', '#eab308'];

const STICKERS = ['😀', '🔥', '⭐', '💯', '🎉', '❤️'];

export function StoryOverlayEditor({
  previewUrl,
  mediaType,
  onPublish,
  onCancel,
  isPublishing,
}: {
  previewUrl: string;
  mediaType: 'image' | 'video';
  onPublish: (overlay: StoryOverlayDocument) => void;
  onCancel: () => void;
  isPublishing?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [layers, setLayers] = useState<StoryOverlayLayer[]>([]);
  const [tool, setTool] = useState<'text' | 'sticker' | 'draw'>('text');
  const [textInput, setTextInput] = useState('');
  const [color, setColor] = useState('#ffffff');
  const [font, setFont] = useState<'classic' | 'modern' | 'neon'>('classic');
  const [brushSize, setBrushSize] = useState(4);
  const drawingRef = useRef(false);
  const currentPathRef = useRef<Array<{ x: number; y: number }>>([]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const layer of layers) {
      if (layer.type === 'text') {
        ctx.fillStyle = layer.color;
        ctx.font =
          layer.font === 'neon'
            ? 'bold 28px sans-serif'
            : layer.font === 'modern'
              ? '600 24px sans-serif'
              : '24px serif';
        ctx.textAlign = 'center';
        ctx.fillText(layer.text, layer.x * canvas.width, layer.y * canvas.height);
      } else if (layer.type === 'sticker') {
        ctx.font = `${layer.scale * 32}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText(layer.emoji, layer.x * canvas.width, layer.y * canvas.height);
      } else if (layer.type === 'draw') {
        for (const path of layer.paths) {
          if (path.points.length < 2) continue;
          ctx.strokeStyle = path.color;
          ctx.lineWidth = path.width;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(path.points[0]!.x * canvas.width, path.points[0]!.y * canvas.height);
          for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i]!.x * canvas.width, path.points[i]!.y * canvas.height);
          }
          ctx.stroke();
        }
      }
    }
  }, [layers]);

  useEffect(() => {
    redraw();
  }, [layers, redraw]);

  const onCanvasPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (e.type === 'pointerdown') {
      drawingRef.current = true;
      currentPathRef.current = [{ x, y }];
      setLayers((prev) => [
        ...prev,
        {
          type: 'draw',
          paths: [{ color, width: brushSize, points: [{ x, y }] }],
        },
      ]);
    } else if (e.type === 'pointermove' && drawingRef.current) {
      currentPathRef.current.push({ x, y });
      setLayers((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.type === 'draw' && last.paths.length > 0) {
          const paths = [...last.paths];
          paths[paths.length - 1] = {
            ...paths[paths.length - 1]!,
            points: [...currentPathRef.current],
          };
          next[next.length - 1] = { type: 'draw', paths };
        } else {
          next.push({
            type: 'draw',
            paths: [{ color, width: brushSize, points: [...currentPathRef.current] }],
          });
        }
        return next;
      });
    } else if (e.type === 'pointerup') {
      drawingRef.current = false;
      redraw();
    }
  };

  const addText = () => {
    if (!textInput.trim()) return;
    setLayers((prev) => [
      ...prev,
      { type: 'text', text: textInput.trim(), x: 0.5, y: 0.5, color, font },
    ]);
    setTextInput('');
    setTimeout(redraw, 0);
  };

  const addSticker = (emoji: string) => {
    setLayers((prev) => [...prev, { type: 'sticker', emoji, x: 0.5, y: 0.4, scale: 1.2 }]);
    setTimeout(redraw, 0);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-black">
        {mediaType === 'video' ? (
          <video
            src={previewUrl}
            className="size-full object-cover"
            muted
            playsInline
            autoPlay
            loop
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={previewUrl} alt="" className="size-full object-cover" />
        )}
        <canvas
          ref={canvasRef}
          width={360}
          height={640}
          className="absolute inset-0 size-full touch-none"
          onPointerDown={onCanvasPointer}
          onPointerMove={onCanvasPointer}
          onPointerUp={onCanvasPointer}
          onPointerLeave={onCanvasPointer}
        />
      </div>

      <div className="flex gap-2">
        {(['text', 'sticker', 'draw'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTool(t)}
            className={cn(
              'flex-1 rounded-lg border py-2 text-xs font-medium',
              tool === t ? 'border-primary bg-accent' : 'border-border',
            )}
          >
            {t === 'text' ? 'متن' : t === 'sticker' ? 'استیکر' : 'نقاشی'}
          </button>
        ))}
      </div>

      {tool === 'text' ? (
        <div className="space-y-2">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="متن استوری"
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
          <Button size="sm" variant="secondary" onClick={addText}>
            افزودن متن
          </Button>
        </div>
      ) : null}

      {tool === 'sticker' ? (
        <div className="flex flex-wrap gap-2">
          {STICKERS.map((e) => (
            <button key={e} type="button" className="text-2xl" onClick={() => addSticker(e)}>
              {e}
            </button>
          ))}
        </div>
      ) : null}

      {tool === 'draw' ? (
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">ضخامت</label>
          <input
            type="range"
            min={2}
            max={12}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="flex-1"
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            onClick={() => setColor(c)}
            className={cn('size-7 rounded-full border-2', color === c && 'border-primary')}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" fullWidth onClick={onCancel}>
          لغو
        </Button>
        <Button
          variant="brand"
          fullWidth
          isLoading={isPublishing}
          onClick={() => onPublish({ layers })}
        >
          انتشار
        </Button>
      </div>
    </div>
  );
}
