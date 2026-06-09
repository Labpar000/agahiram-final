'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { formatPersianNumber, formatPersianPrice } from '@agahiram/shared';
import {
  Button,
  Card,
  CardContent,
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
import Shell from '../../../layout-shell';
import { apiClient } from '@/lib/api';

type UserRow = { id: string; username: string | null; name: string | null };

export default function NewCampaignPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    advertiserId: '',
    name: '',
    budget: '100000',
    dailyBudget: '',
    bidType: 'CPM',
    bidAmount: '5000',
    startDate: new Date().toISOString().slice(0, 16),
    endDate: '',
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users', 'picker'],
    queryFn: async () => {
      const r = await apiClient.get<{ data: UserRow[] }>('/admin/users', {
        page: 1,
        pageSize: 50,
      });
      return r.data?.data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const r = await apiClient.post('/ads/admin/campaigns', {
        advertiserId: form.advertiserId,
        name: form.name,
        budget: Number(form.budget),
        dailyBudget: form.dailyBudget ? Number(form.dailyBudget) : undefined,
        bidType: form.bidType,
        bidAmount: Number(form.bidAmount),
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      });
      if (!r.success) throw new Error(r.error ?? 'خطا');
      return r.data as { id: string };
    },
    onSuccess: (data) => {
      toast.success('کمپین ایجاد شد');
      router.push(`/ads/campaigns/${data.id}`);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const estImpressions =
    form.bidType === 'CPM' && Number(form.bidAmount) > 0
      ? Math.floor((Number(form.budget) / Number(form.bidAmount)) * 1000)
      : 0;

  return (
    <Shell adminOnly>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/ads/campaigns" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5 rtl:rotate-180" />
        </Link>
        <div>
          <h1 className="text-h2 font-extrabold tracking-tight">کمپین جدید</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ایجاد کمپین تبلیغاتی برای تبلیغ‌دهنده
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardContent className="!p-6 space-y-4">
          <div className="space-y-1">
            <Label>تبلیغ‌دهنده</Label>
            {usersLoading ? (
              <Spinner className="size-5" />
            ) : (
              <Select
                value={form.advertiserId}
                onValueChange={(v) => setForm({ ...form, advertiserId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب کاربر" />
                </SelectTrigger>
                <SelectContent>
                  {(users ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name ?? u.username ?? u.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="name">نام کمپین</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="مثلاً کمپین بهاره ۱۴۰۵"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="budget">بودجه کل (تومان)</Label>
              <Input
                id="budget"
                type="number"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dailyBudget">بودجه روزانه (اختیاری)</Label>
              <Input
                id="dailyBudget"
                type="number"
                value={form.dailyBudget}
                onChange={(e) => setForm({ ...form, dailyBudget: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>نوع قیمت</Label>
              <Select value={form.bidType} onValueChange={(v) => setForm({ ...form, bidType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CPM">CPM (به ازای ۱۰۰۰ نمایش)</SelectItem>
                  <SelectItem value="CPC">CPC (به ازای کلیک)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="bidAmount">مبلغ پیشنهادی (تومان)</Label>
              <Input
                id="bidAmount"
                type="number"
                value={form.bidAmount}
                onChange={(e) => setForm({ ...form, bidAmount: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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

          {form.bidType === 'CPM' && estImpressions > 0 ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              تخمین نمایش: حدود {formatPersianNumber(estImpressions)} بار با بودجه{' '}
              {formatPersianPrice(Number(form.budget))} تومان
            </p>
          ) : null}

          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            قبل از فعال‌سازی کمپین، کیف پول تبلیغ‌دهنده را از صفحه کاربر شارژ کنید. هزینه تبلیغات از
            موجودی کیف پول کسر می‌شود.
          </p>

          <div className="flex gap-2 pt-2">
            <Button
              variant="brand"
              disabled={!form.advertiserId || !form.name}
              isLoading={create.isPending}
              onClick={() => create.mutate()}
            >
              ایجاد کمپین
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/ads/campaigns">انصراف</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </Shell>
  );
}
