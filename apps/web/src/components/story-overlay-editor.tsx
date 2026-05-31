'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { StoryOverlayDocument, StoryOverlayLayer } from '@agahiram/shared';
import { Button } from '@agahiram/ui';
import { parseStoryOverlay } from '@/features/stories/story-media-utils';
import {
  StoryOverlayCanvas,
  StoryOverlayTools,
  type DrawTool,
} from '@/features/stories/story-overlay-canvas';
import type { PublishSticker } from '@/features/stories/story-composer';

export type { StoryOverlayLayer, StoryOverlayDocument };
export { parseStoryOverlay };

export type StoryOverlayEditorHandle = {
  getDocument: () => StoryOverlayDocument;
};

function layersFromDefault(doc?: StoryOverlayDocument): StoryOverlayLayer[] {
  return doc?.layers?.filter((l) => l.type !== 'filter') ?? [];
}

function filterFromDefault(doc?: StoryOverlayDocument): string {
  const f = doc?.layers?.find((l) => l.type === 'filter');
  return f?.type === 'filter' ? f.name : 'none';
}

export const StoryOverlayEditor = forwardRef<
  StoryOverlayEditorHandle,
  {
    previewUrl: string;
    mediaType: 'image' | 'video';
    onPublish?: (overlay: StoryOverlayDocument) => void;
    onCancel?: () => void;
    isPublishing?: boolean;
    /** When true, parent provides publish/cancel (e.g. StoryComposer). */
    embedMode?: boolean;
    stickers?: PublishSticker[];
    onStickersChange?: (s: PublishSticker[]) => void;
    filterId?: string;
    onFilterChange?: (id: string) => void;
    onChange?: (doc: StoryOverlayDocument) => void;
    defaultOverlay?: StoryOverlayDocument;
  }
>(function StoryOverlayEditor(
  {
    previewUrl,
    mediaType,
    onPublish,
    onCancel,
    isPublishing,
    embedMode = false,
    stickers = [],
    onStickersChange,
    filterId: filterIdProp,
    onFilterChange,
    onChange,
    defaultOverlay,
  },
  ref,
) {
  const [layers, setLayers] = useState<StoryOverlayLayer[]>(() =>
    layersFromDefault(defaultOverlay),
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [filterId, setFilterId] = useState(() => filterIdProp ?? filterFromDefault(defaultOverlay));
  const [tool, setTool] = useState<'text' | 'sticker' | 'draw'>('text');
  const [drawTool, setDrawTool] = useState<DrawTool>('pen');
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(4);
  const drawingRef = useRef(false);
  const currentPathRef = useRef<Array<{ x: number; y: number }>>([]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const activeFilter = filterIdProp ?? filterId;
  const setFilter = onFilterChange ?? setFilterId;

  const buildDocument = useCallback((): StoryOverlayDocument => {
    const doc: StoryOverlayDocument = { layers };
    if (activeFilter && activeFilter !== 'none') {
      doc.layers = [...layers, { type: 'filter', name: activeFilter }];
    }
    return doc;
  }, [layers, activeFilter]);

  useImperativeHandle(ref, () => ({ getDocument: buildDocument }), [buildDocument]);

  useEffect(() => {
    if (defaultOverlay?.layers?.length) {
      setLayers(layersFromDefault(defaultOverlay));
      if (!filterIdProp) setFilterId(filterFromDefault(defaultOverlay));
    }
  }, [defaultOverlay, filterIdProp]);

  useEffect(() => {
    onChangeRef.current?.(buildDocument());
  }, [layers, activeFilter, buildDocument]);

  const strokeColor =
    drawTool === 'eraser' ? 'eraser' : drawTool === 'neon' ? `neon-${color}` : color;

  const handleDrawPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool !== 'draw') return;
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const width = drawTool === 'eraser' ? 16 : drawTool === 'marker' ? brushSize * 2.5 : brushSize;

    if (e.type === 'pointerdown') {
      drawingRef.current = true;
      currentPathRef.current = [{ x, y }];
      setLayers((prev) => [
        ...prev,
        { type: 'draw', paths: [{ color: strokeColor, width, points: [{ x, y }] }] },
      ]);
    } else if (e.type === 'pointermove' && drawingRef.current) {
      currentPathRef.current.push({ x, y });
      setLayers((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.type === 'draw') {
          const paths = [...last.paths];
          paths[paths.length - 1] = {
            ...paths[paths.length - 1]!,
            points: [...currentPathRef.current],
          };
          next[next.length - 1] = { type: 'draw', paths };
        }
        return next;
      });
    } else if (e.type === 'pointerup') {
      drawingRef.current = false;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <StoryOverlayCanvas
          previewUrl={previewUrl}
          mediaType={mediaType}
          layers={layers}
          onLayersChange={setLayers}
          stickers={stickers}
          onStickersChange={onStickersChange}
          filterId={activeFilter}
          onFilterChange={setFilter}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          drawMode={tool === 'draw'}
          onDrawPointer={handleDrawPointer}
        />
      </div>

      <StoryOverlayTools
        layers={layers}
        onLayersChange={setLayers}
        selectedIndex={selectedIndex}
        onSelectIndex={setSelectedIndex}
        tool={tool}
        onToolChange={setTool}
        drawTool={drawTool}
        onDrawToolChange={setDrawTool}
        color={color}
        onColorChange={setColor}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
      />

      {!embedMode && onPublish && onCancel ? (
        <div className="flex gap-2">
          <Button variant="outline" fullWidth onClick={onCancel}>
            لغو
          </Button>
          <Button
            variant="brand"
            fullWidth
            isLoading={isPublishing}
            onClick={() => onPublish(buildDocument())}
          >
            انتشار
          </Button>
        </div>
      ) : null}
    </div>
  );
});

StoryOverlayEditor.displayName = 'StoryOverlayEditor';

/** Expose document builder for embed mode parent publish */
export function useStoryOverlayState() {
  const [layers, setLayers] = useState<StoryOverlayLayer[]>([]);
  const [filterId, setFilterId] = useState('none');
  const build = (): StoryOverlayDocument => ({
    layers: filterId !== 'none' ? [...layers, { type: 'filter', name: filterId }] : layers,
  });
  return { layers, setLayers, filterId, setFilterId, build };
}
