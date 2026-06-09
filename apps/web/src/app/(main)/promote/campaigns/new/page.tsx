'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BidType, formatPersianNumber, formatPersianPrice } from '@agahiram/shared';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  toast,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { RequireAuth } from '@/features/advertising/components/require-auth';
import { PromoteHeader } from '@/features/advertising/components/promote-header';
import { useCreateCampaign } from '@/features/advertising/hooks/useMyCampaigns';

type Category = { id: string; name: string; children?: Category[] };
type Province = { id: string; name: string };
type City = { id: string; name: string };

function flattenCategories(nodes: Category[], out: Category[] = []): Category[] {
  for (const n of nodes) {
    out.push({ id: n.id, name: n.name });
    if (n.children?.length) flattenCategories(n.children, out);
  }
  return out;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const create = useCreateCampaign();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    budget: '100000',
    dailyBudget: '',
    bidType: BidType.CPM,
    bidAmount: '5000',
    startDate: new Date().toISOString().slice(0, 16),
    endDate: '',
    provinceId: '',
    cityIds: [] as string[],
    categoryIds: [] as string[],
  });

  const { data: categories } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: async () => {
      const r = await apiClient.get<Category[]>('/categories/tree');
      return flattenCategories(r.data ?? []);
    },
  });

  const { data: provinces } = useQuery({
    queryKey: ['locations', 'provinces'],
    queryFn: async () => {
      const r = await apiClient.get<Province[]>('/locations/provinces');
      return r.data ?? [];
    },
  });

  const { data: cities } = useQuery({
    queryKey: ['locations', 'cities', form.provinceId],
    queryFn: async () => {
      const r = await apiClient.get<City[]>(`/locations/provinces/${form.provinceId}/cities`);
      return r.data ?? [];
    },
    enabled: Boolean(form.provinceId),
  });

  const estImpressions =
    form.bidType === BidType.CPM && Number(form.bidAmount) > 0
      ? Math.floor((Number(form.budget) / Number(form.bidAmount)) * 1000)
      : 0;
  const estClicks =
    form.bidType === BidType.CPC && Number(form.bidAmount) > 0
      ? Math.floor(Number(form.budget) / Number(form.bidAmount))
      : 0;

  const toggleCity = (id: string) => {
    setForm((f) => ({
      ...f,
      cityIds: f.cityIds.includes(id) ? f.cityIds.filter((x) => x !== id) : [...f.cityIds, id],
    }));
  };

  const toggleCategory = (id: string) => {
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id)
        ? f.categoryIds.filter((x) => x !== id)
        : [...f.categoryIds, id],
    }));
  };

  const submit = () => {
    create.mutate(
      {
        name: form.name.trim(),
        budget: Number(form.budget),
        dailyBudget: form.dailyBudget ? Number(form.dailyBudget) : undefined,
        bidType: form.bidType,
        bidAmount: Number(form.bidAmount),
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        targeting:
          form.cityIds.length || form.categoryIds.length
            ? {
                cityIds: form.cityIds.length ? form.cityIds : undefined,
                categoryIds: form.categoryIds.length ? form.categoryIds : undefined,
              }
            : undefined,
      },
      {
        onSuccess: (data) => {
          toast.success('کمپین ایجاد شد — حالا تبلیغ خود را بسازید');
          router.push(`/promote/campaigns/${data.id}/ads/new`);
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  return (
    <RequireAuth>
      <div className="bg-background min-h-svh pb-8">
        <PromoteHeader title="کمپین جدید" />
        <div className="mx-auto max-w-2xl px-4 py-4 space-y-6">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-brand' : 'bg-muted'}`}
              />
            ))}
          </div>

          {step === 1 ? (
            <div className="space-y-4">
              <h2 className="font-semibold">اطلاعات پایه</h2>
              <div className="space-y-1">
                <Label htmlFor="name">نام کمپین</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثلاً: تابستان ۱۴۰۵"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="budget">بودجه کل (تومان)</Label>
                <Input
                  id="budget"
                  type="number"
                  min={10000}
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dailyBudget">بودجه روزانه (اختیاری)</Label>
                <Input
                  id="dailyBudget"
                  type="number"
                  min={10000}
                  value={form.dailyBudget}
                  onChange={(e) => setForm({ ...form, dailyBudget: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="startDate">شروع</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="endDate">پایان (اختیاری)</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <h2 className="font-semibold">قیمت‌گذاری</h2>
              <div className="space-y-1">
                <Label>نوع</Label>
                <Select
                  value={form.bidType}
                  onValueChange={(v) => setForm({ ...form, bidType: v as BidType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BidType.CPM}>CPM — به ازای ۱٬۰۰۰ نمایش</SelectItem>
                    <SelectItem value={BidType.CPC}>CPC — به ازای هر کلیک</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="bidAmount">مبلغ bid (تومان)</Label>
                <Input
                  id="bidAmount"
                  type="number"
                  min={100}
                  value={form.bidAmount}
                  onChange={(e) => setForm({ ...form, bidAmount: e.target.value })}
                />
              </div>
              {form.bidType === BidType.CPM && estImpressions > 0 ? (
                <p className="text-xs text-muted-foreground">
                  تخمین نمایش: حدود {formatPersianNumber(estImpressions)} بار
                </p>
              ) : null}
              {form.bidType === BidType.CPC && estClicks > 0 ? (
                <p className="text-xs text-muted-foreground">
                  تخمین کلیک: حدود {formatPersianNumber(estClicks)} بار
                </p>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <h2 className="font-semibold">هدف‌گیری (اختیاری)</h2>
              <div className="space-y-1">
                <Label>استان</Label>
                <Select
                  value={form.provinceId}
                  onValueChange={(v) => setForm({ ...form, provinceId: v, cityIds: [] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب استان" />
                  </SelectTrigger>
                  <SelectContent>
                    {(provinces ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.provinceId && cities?.length ? (
                <div className="space-y-2">
                  <Label>شهرها</Label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {cities.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCity(c.id)}
                        className={`rounded-full px-3 py-1 text-xs border ${
                          form.cityIds.includes(c.id)
                            ? 'border-brand bg-brand/10 text-brand'
                            : 'border-border'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {categories?.length ? (
                <div className="space-y-2">
                  <Label>دسته‌بندی‌ها</Label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {categories.slice(0, 40).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCategory(c.id)}
                        className={`rounded-full px-3 py-1 text-xs border ${
                          form.categoryIds.includes(c.id)
                            ? 'border-brand bg-brand/10 text-brand'
                            : 'border-border'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-3 rounded-xl border border-border bg-surface p-4 text-sm">
              <h2 className="font-semibold">مرور نهایی</h2>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">نام</dt>
                  <dd className="font-medium">{form.name || '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">بودجه</dt>
                  <dd>{formatPersianPrice(Number(form.budget))} تومان</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">نوع</dt>
                  <dd>
                    {form.bidType} · {formatPersianPrice(Number(form.bidAmount))}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">شهرها</dt>
                  <dd>{form.cityIds.length ? formatPersianNumber(form.cityIds.length) : 'همه'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">دسته‌ها</dt>
                  <dd>
                    {form.categoryIds.length ? formatPersianNumber(form.categoryIds.length) : 'همه'}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          <div className="flex gap-2">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                قبلی
              </Button>
            ) : null}
            {step < 4 ? (
              <Button
                variant="brand"
                className="flex-1"
                disabled={step === 1 && !form.name.trim()}
                onClick={() => setStep((s) => s + 1)}
              >
                بعدی
              </Button>
            ) : (
              <Button
                variant="brand"
                className="flex-1"
                disabled={create.isPending || !form.name.trim()}
                onClick={submit}
              >
                {create.isPending ? <Spinner className="size-4" /> : 'ایجاد کمپین'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
