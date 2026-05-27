'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Megaphone, Send } from 'lucide-react';
import { formatPersianNumber } from '@agahiram/shared';
import { Badge, Button, Card, CardContent, Input, Label, Textarea, toast } from '@agahiram/ui';
import Shell from '../layout-shell';
import { PageHeader } from '@/components/page-header';
import { apiClient } from '@/lib/api';

type Audience = 'all' | 'verified' | 'business' | 'banned' | 'city';

interface City {
  id: string;
  name: string;
  province: { name: string };
}

const AUDIENCE_LABEL: Record<Audience, string> = {
  all: 'همه‌ی کاربران فعال',
  verified: 'فقط کاربران تأییدشده',
  business: 'فقط کاربران فروشگاهی',
  banned: 'فقط کاربران مسدودشده',
  city: 'کاربران یک شهر',
};

export default function BroadcastPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [cityId, setCityId] = useState('');
  const [lastResult, setLastResult] = useState<{
    sent: number;
    audienceCount: number;
    dryRun: boolean;
  } | null>(null);

  const cities = useQuery({
    queryKey: ['admin', 'cities-all'],
    queryFn: async () => (await apiClient.get<City[]>('/admin/cities')).data ?? [],
    enabled: audience === 'city',
  });

  const submit = useMutation({
    mutationFn: async (dryRun: boolean) => {
      const r = await apiClient.post<{ sent: number; audienceCount: number; dryRun: boolean }>(
        '/admin/broadcast',
        {
          title: title.trim(),
          body: body.trim(),
          audience,
          cityId: audience === 'city' ? cityId : null,
          dryRun,
        },
      );
      if (!r.success) throw new Error(r.error ?? 'خطا');
      return { ...(r.data ?? { sent: 0, audienceCount: 0, dryRun }), dryRun };
    },
    onSuccess: (r) => {
      setLastResult(r);
      if (r.dryRun) {
        toast.success(`نتیجه‌ی آزمایشی: ${formatPersianNumber(r.audienceCount)} گیرنده`);
      } else {
        toast.success(`ارسال شد به ${formatPersianNumber(r.sent)} نفر`);
        setTitle('');
        setBody('');
      }
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const canSubmit =
    title.trim().length >= 3 && body.trim().length >= 3 && (audience !== 'city' || cityId);

  return (
    <Shell>
      <PageHeader
        title="اعلان همگانی"
        description="ارسال نوتیفیکیشن گروهی به یک سگمنت از کاربران"
      />

      <div className="mx-auto max-w-3xl grid grid-cols-1 gap-4">
        <Card>
          <CardContent className="!p-5 space-y-4">
            <div>
              <Label required>عنوان</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="مثلاً: تخفیف ویژه‌ی پلن نردبان"
              />
              <div className="mt-1 text-[11px] text-muted-foreground tabular-nums text-end">
                {formatPersianNumber(title.length)} / ۱۲۰
              </div>
            </div>
            <div>
              <Label required>متن پیام</Label>
              <Textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={500}
                placeholder="آنچه می‌خواهید کاربران ببینند…"
              />
              <div className="mt-1 text-[11px] text-muted-foreground tabular-nums text-end">
                {formatPersianNumber(body.length)} / ۵۰۰
              </div>
            </div>
            <div>
              <Label required>مخاطبان</Label>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 mt-1">
                {(Object.keys(AUDIENCE_LABEL) as Audience[]).map((a) => (
                  <label
                    key={a}
                    className={
                      'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ' +
                      (audience === a
                        ? 'border-primary bg-accent text-accent-foreground'
                        : 'border-border hover:bg-muted/50')
                    }
                  >
                    <input
                      type="radio"
                      name="audience"
                      value={a}
                      checked={audience === a}
                      onChange={() => setAudience(a)}
                      className="sr-only"
                    />
                    <span>{AUDIENCE_LABEL[a]}</span>
                  </label>
                ))}
              </div>
            </div>
            {audience === 'city' ? (
              <div>
                <Label required>شهر</Label>
                <select
                  className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={cityId}
                  onChange={(e) => setCityId(e.target.value)}
                >
                  <option value="">یک شهر انتخاب کنید</option>
                  {(cities.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.province?.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {lastResult ? (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                {lastResult.dryRun ? (
                  <>
                    <div className="inline-flex items-center gap-2 font-semibold">
                      <AlertTriangle className="size-4 text-warning-foreground" />
                      اجرای آزمایشی
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      این اعلان به{' '}
                      <Badge tone="brand">{formatPersianNumber(lastResult.audienceCount)}</Badge>{' '}
                      کاربر ارسال خواهد شد.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center gap-2 font-semibold text-success">
                      <Megaphone className="size-4" />
                      ارسال شد
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {formatPersianNumber(lastResult.sent)} اعلان ارسال شد.
                    </p>
                  </>
                )}
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="md"
                onClick={() => submit.mutate(true)}
                isLoading={submit.isPending && submit.variables === true}
                disabled={!canSubmit}
              >
                اجرای آزمایشی
              </Button>
              <Button
                variant="brand"
                size="md"
                leftIcon={<Send className="size-4" />}
                onClick={() => submit.mutate(false)}
                isLoading={submit.isPending && submit.variables === false}
                disabled={!canSubmit}
              >
                ارسال اعلان
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
