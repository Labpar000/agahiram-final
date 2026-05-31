'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { StoryOverlayDocument, StoryOverlayLayer, StoryTextFont } from '@agahiram/shared';
import { getStoryFilterCss, parseStoryOverlay } from '@/features/stories/story-media-utils';

export { parseStoryOverlay, getStoryFilterCss };

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

export function StoryOverlayView({
  overlay,
  className,
}: {
  overlay: StoryOverlayDocument | null | undefined;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawLayers = overlay?.layers?.filter((l) => l.type !== 'filter') ?? [];

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || drawLayers.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const layer of drawLayers) {
      drawLayer(ctx, canvas.width, canvas.height, layer);
    }
  }, [drawLayers]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(() => {
      const rect = parent.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      canvas.width = rect.width;
      canvas.height = rect.height;
      redraw();
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, [redraw]);

  if (drawLayers.length === 0) return null;

  return (
    <canvas ref={canvasRef} className={className} aria-hidden style={{ pointerEvents: 'none' }} />
  );
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
      if (path.color === 'eraser') continue;
      ctx.strokeStyle = path.color.startsWith('neon-') ? path.color.slice(5) : path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      if (path.width > 8) ctx.globalAlpha = 0.45;
      if (path.color.startsWith('neon-')) {
        ctx.shadowColor = path.color.slice(5);
        ctx.shadowBlur = 10;
      }
      ctx.beginPath();
      ctx.moveTo(path.points[0]!.x * w, path.points[0]!.y * h);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i]!.x * w, path.points[i]!.y * h);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
  }
}
