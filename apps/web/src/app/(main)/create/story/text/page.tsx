'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, IconButton, IgArrowBack, Input, toast } from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { cn, STORY_CREATE_BACKGROUNDS, type StoryTextFont } from '@agahiram/shared';
import { useUploadManager } from '@/lib/upload-manager';
import { StoryStickerEditorPanel } from '@/features/stories/stickers/story-sticker-editor-panel';
import { StoryStickerComposerPreview } from '@/features/stories/stickers/story-sticker-composer-preview';

const FONTS: Array<{ id: StoryTextFont; label: string }> = [
  { id: 'classic', label: 'کلاسیک' },
  { id: 'modern', label: 'مدرن' },
  { id: 'neon', label: 'نئون' },
  { id: 'typewriter', label: 'ماشین' },
  { id: 'bold', label: 'ضخیم' },
  { id: 'script', label: 'خطی' },
];

const TEXT_COLORS = ['#ffffff', '#000000', '#f43f5e', '#fef08a', '#86efac'];

export default function CreateTextStoryPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { uploadFile } = useUploadManager();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bgIndex, setBgIndex] = useState(0);
  const [text, setText] = useState('');
  const [font, setFont] = useState<StoryTextFont>('bold');
  const [color, setColor] = useState('#ffffff');
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('center');
  const [animation, setAnimation] = useState<'none' | 'bounce'>('none');
  const [stickers, setStickers] = useState<
    Array<{
      type: string;
      payload: Record<string, unknown>;
      x?: number;
      y?: number;
      scale?: number;
      rotation?: number;
    }>
  >([]);

  const bg = STORY_CREATE_BACKGROUNDS[bgIndex]!;

  const publish = useMutation({
    mutationFn: async () => {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('خطا در رندر');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('خطا در رندر');
      const w = 1080;
      const h = 1920;
      canvas.width = w;
      canvas.height = h;
      if (bg.startsWith('linear')) {
        const grd = ctx.createLinearGradient(0, 0, w, h);
        grd.addColorStop(0, '#db2777');
        grd.addColorStop(1, '#7c3aed');
        ctx.fillStyle = grd;
      } else {
        ctx.fillStyle = bg;
      }
      ctx.fillRect(0, 0, w, h);
      if (text.trim()) {
        ctx.fillStyle = color;
        const size = font === 'bold' ? 72 : font === 'neon' ? 80 : font === 'script' ? 64 : 56;
        ctx.font =
          font === 'neon'
            ? `bold ${size}px sans-serif`
            : font === 'modern'
              ? `600 ${size}px sans-serif`
              : font === 'typewriter'
                ? `${size}px monospace`
                : font === 'script'
                  ? `italic ${size}px cursive`
                  : `${size}px serif`;
        ctx.textAlign = align;
        const tx = align === 'left' ? w * 0.1 : align === 'right' ? w * 0.9 : w / 2;
        if (font === 'neon') {
          ctx.shadowColor = color;
          ctx.shadowBlur = 20;
        }
        ctx.fillText(text.trim(), tx, h / 2);
      }
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('رندر ناموفق'))),
          'image/jpeg',
          0.92,
        );
      });
      const presign = await apiClient.post<{ uploadUrl: string; key: string }>('/media/presign', {
        folder: 'stories',
        fileName: 'story-text.jpg',
        contentType: 'image/jpeg',
        extension: 'jpg',
      });
      if (!presign.success || !presign.data) throw new Error('خطا در آپلود');
      const ok = await uploadFile({
        label: 'آپلود استوری متنی',
        url: presign.data.uploadUrl,
        file: new File([blob], 'story-text.jpg', { type: 'image/jpeg' }),
        contentType: 'image/jpeg',
      });
      if (!ok) throw new Error('آپلود ناموفق');
      await apiClient.post('/media/confirm', { key: presign.data.key });
      const r = await apiClient.post('/stories', {
        mediaKey: presign.data.key,
        type: 'image',
        overlayJson: {
          layers: text.trim()
            ? [
                {
                  type: 'text',
                  text: text.trim(),
                  x: 0.5,
                  y: 0.5,
                  color,
                  font,
                  align,
                  animation: animation === 'bounce' ? 'bounce' : undefined,
                },
              ]
            : [],
          backgroundColor: bg,
        },
        stickers,
      });
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['stories', 'feed'] });
      toast.success('استوری منتشر شد');
      router.push('/feed');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="bg-background p-4">
      <div className="mb-4 flex items-center gap-2">
        <IconButton
          aria-label="بازگشت"
          icon={<IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} />}
          variant="ghost"
          onClick={() => router.back()}
        />
        <h1 className="text-lg font-bold">استوری متنی (Create Mode)</h1>
      </div>
      <div
        className={cn(
          'relative mb-4 aspect-[9/16] overflow-hidden rounded-2xl',
          animation === 'bounce' && 'animate-pulse',
        )}
        style={{ background: bg }}
      >
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 grid place-items-center p-6">
          <p
            className={cn(
              'w-full whitespace-pre-wrap text-center drop-shadow-md',
              font === 'neon' && 'font-bold tracking-wide',
              font === 'script' && 'font-serif italic',
              font === 'typewriter' && 'font-mono',
              font === 'bold' && 'text-2xl font-extrabold',
              font === 'modern' && 'text-xl font-semibold',
              font === 'classic' && 'text-xl',
            )}
            style={{ color, textAlign: align }}
          >
            {text || 'متن شما'}
          </p>
        </div>
        <StoryStickerComposerPreview stickers={stickers} />
      </div>
      <button
        type="button"
        className="mb-3 text-xs text-ig-link"
        onClick={() => setBgIndex((i) => (i + 1) % STORY_CREATE_BACKGROUNDS.length)}
      >
        تغییر پس‌زمینه ({bgIndex + 1}/{STORY_CREATE_BACKGROUNDS.length})
      </button>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="متن استوری"
        className="mb-3"
      />
      <div className="mb-3 flex flex-wrap gap-1">
        {FONTS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFont(f.id)}
            className={cn(
              'rounded-md border px-2 py-1 text-xs',
              font === f.id && 'border-primary bg-accent',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="mb-3 flex gap-1">
        {TEXT_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={cn('size-8 rounded-full border-2', color === c && 'border-primary')}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="mb-3 flex gap-1">
        {(['right', 'center', 'left'] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAlign(a)}
            className={cn('flex-1 rounded border py-1 text-xs', align === a && 'border-primary')}
          >
            {a === 'center' ? 'وسط' : a === 'right' ? 'راست' : 'چپ'}
          </button>
        ))}
      </div>
      <label className="mb-3 flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={animation === 'bounce'}
          onChange={(e) => setAnimation(e.target.checked ? 'bounce' : 'none')}
        />
        انیمیشن پرش
      </label>
      <StoryStickerEditorPanel onAdd={(s) => setStickers((p) => [...p, s])} />
      <Button
        variant="brand"
        fullWidth
        className="mt-4"
        isLoading={publish.isPending}
        onClick={() => publish.mutate()}
      >
        انتشار
      </Button>
    </div>
  );
}
