'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdSlot } from '@agahiram/shared';
import { Button, Input, Label, Spinner, Textarea, toast } from '@agahiram/ui';
import { RequireAuth } from '@/features/advertising/components/require-auth';
import { PromoteHeader } from '@/features/advertising/components/promote-header';
import { AdMediaUpload } from '@/features/advertising/components/ad-media-upload';
import { AdSlotPicker } from '@/features/advertising/components/ad-slot-picker';
import { useCreateAd } from '@/features/advertising/hooks/useMyAds';
import { buildAdCreatePayload } from '@/features/advertising/lib/ads-utils';

export default function NewAdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = use(params);
  const router = useRouter();
  const create = useCreateAd();
  const [form, setForm] = useState({
    title: '',
    description: '',
    mediaUrl: '',
    redirectUrl: '',
    slot: AdSlot.EXPLORE_FEED,
  });

  const submit = () => {
    if (!form.mediaUrl.trim()) {
      toast.error('تصویر تبلیغ الزامی است');
      return;
    }
    const payload = buildAdCreatePayload(campaignId, form);
    create.mutate(payload as never, {
      onSuccess: (ad) => {
        toast.success('تبلیغ ثبت شد — در انتظار بررسی');
        router.push(`/promote/ads/${ad.id}`);
      },
      onError: (e) => toast.error((e as Error).message),
    });
  };

  return (
    <RequireAuth>
      <div className="bg-background min-h-svh pb-8">
        <PromoteHeader title="تبلیغ جدید" />
        <div className="mx-auto max-w-2xl px-4 py-4 space-y-5">
          <AdSlotPicker
            value={form.slot}
            onChange={(slot) => setForm({ ...form, slot })}
            previewUrl={form.mediaUrl || undefined}
          />

          <div className="space-y-1">
            <Label>تصویر</Label>
            <AdMediaUpload
              value={form.mediaUrl}
              onChange={(url) => setForm({ ...form, mediaUrl: url })}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="title">عنوان (اختیاری)</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={100}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">توضیح (اختیاری)</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="redirectUrl">لینک مقصد (اختیاری)</Label>
            <Input
              id="redirectUrl"
              type="url"
              dir="ltr"
              value={form.redirectUrl}
              onChange={(e) => setForm({ ...form, redirectUrl: e.target.value })}
              placeholder="https://"
            />
          </div>

          <Button
            variant="brand"
            fullWidth
            disabled={create.isPending || !form.mediaUrl}
            onClick={submit}
          >
            {create.isPending ? <Spinner className="size-4" /> : 'ارسال برای بررسی'}
          </Button>
        </div>
      </div>
    </RequireAuth>
  );
}
