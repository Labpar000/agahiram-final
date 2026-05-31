'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { StoryOverlayDocument, StoryOverlayLayer } from '@/components/story-overlay-editor';

export function StoryOverlayView({
  overlay,
  className,
}: {
  overlay: StoryOverlayDocument | null | undefined;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !overlay?.layers?.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const layer of overlay.layers) {
      drawLayer(ctx, canvas.width, canvas.height, layer);
    }
  }, [overlay]);

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

  if (!overlay?.layers?.length) return null;

  return (
    <canvas ref={canvasRef} className={className} aria-hidden style={{ pointerEvents: 'none' }} />
  );
}

function drawLayer(ctx: CanvasRenderingContext2D, w: number, h: number, layer: StoryOverlayLayer) {
  if (layer.type === 'text') {
    ctx.fillStyle = layer.color;
    ctx.font =
      layer.font === 'neon'
        ? 'bold 28px sans-serif'
        : layer.font === 'modern'
          ? '600 24px sans-serif'
          : '24px serif';
    ctx.textAlign = 'center';
    ctx.fillText(layer.text, layer.x * w, layer.y * h);
  } else if (layer.type === 'sticker') {
    ctx.font = `${layer.scale * 32}px serif`;
    ctx.textAlign = 'center';
    ctx.fillText(layer.emoji, layer.x * w, layer.y * h);
  } else if (layer.type === 'draw') {
    for (const path of layer.paths) {
      if (path.points.length < 2) continue;
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(path.points[0]!.x * w, path.points[0]!.y * h);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i]!.x * w, path.points[i]!.y * h);
      }
      ctx.stroke();
    }
  }
}

export function parseStoryOverlay(raw: unknown): StoryOverlayDocument | null {
  if (!raw || typeof raw !== 'object') return null;
  const doc = raw as StoryOverlayDocument;
  if (!Array.isArray(doc.layers)) return null;
  return doc;
}
