'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Coins, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { formatPersianNumber, formatPersianPrice } from '@agahiram/shared';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  IconButton,
  Input,
  Label,
  Switch,
  Textarea,
  toast,
} from '@agahiram/ui';
import Shell from '../layout-shell';
import { PageHeader } from '@/components/page-header';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { apiClient } from '@/lib/api';

interface BoostPlan {
  id: string;
  name: string;
  durationHours: number;
  price: string | number; // BigInt comes as string from API
  description: string | null;
  isActive: boolean;
  _count: { payments: number };
}

interface FormState {
  id?: string;
  name: string;
  durationHours: number;
  price: number;
  description: string;
  isActive: boolean;
}

export default function BoostPlansPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [del, setDel] = useState<BoostPlan | null>(null);

  const list = useQuery({
    queryKey: ['admin', 'boost-plans'],
    queryFn: async () => (await apiClient.get<BoostPlan[]>('/admin/boost-plans')).data ?? [],
  });

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const body = {
        name: f.name.trim(),
        durationHours: f.durationHours,
        price: f.price,
        description: f.description.trim() || null,
        isActive: f.isActive,
      };
      const r = f.id
        ? await apiClient.patch(`/admin/boost-plans/${f.id}`, body)
        : await apiClient.post('/admin/boost-plans', body);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('ذخیره شد');
      setForm(null);
      qc.invalidateQueries({ queryKey: ['admin', 'boost-plans'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.delete(`/admin/boost-plans/${id}`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('حذف شد');
      setDel(null);
      qc.invalidateQueries({ queryKey: ['admin', 'boost-plans'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Shell adminOnly>
      <PageHeader
        title="پلن‌های نردبان"
        description="پلن‌های ارتقاء آگهی که در زمان پرداخت به کاربر نمایش داده می‌شوند"
        actions={
          <Button
            variant="brand"
            leftIcon={<Plus className="size-4" />}
            onClick={() =>
              setForm({
                name: '',
                durationHours: 24,
                price: 0,
                description: '',
                isActive: true,
              })
            }
          >
            پلن جدید
          </Button>
        }
      />

      {list.isLoading ? (
        <Card>
          <CardContent className="!p-6 text-center text-sm text-muted-foreground">
            در حال بارگذاری…
          </CardContent>
        </Card>
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Sparkles className="size-7" />}
          title="هیچ پلنی تعریف نشده"
          description="با کلیک روی «پلن جدید» اولین پلن نردبان را اضافه کنید."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(list.data ?? []).map((p) => (
            <Card key={p.id} className={!p.isActive ? 'opacity-60' : ''}>
              <CardContent className="!p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base truncate">{p.name}</h3>
                      {!p.isActive ? (
                        <Badge tone="neutral" size="sm">
                          غیرفعال
                        </Badge>
                      ) : (
                        <Badge tone="success" size="sm">
                          فعال
                        </Badge>
                      )}
                    </div>
                    {p.description ? (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {p.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-1">
                    <IconButton
                      aria-label="ویرایش"
                      size="sm"
                      variant="ghost"
                      icon={<Pencil className="size-4" />}
                      onClick={() =>
                        setForm({
                          id: p.id,
                          name: p.name,
                          durationHours: p.durationHours,
                          price: Number(p.price),
                          description: p.description ?? '',
                          isActive: p.isActive,
                        })
                      }
                    />
                    <IconButton
                      aria-label="حذف"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      icon={<Trash2 className="size-4" />}
                      onClick={() => setDel(p)}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Coins className="size-3.5" aria-hidden />
                    <span className="font-extrabold text-foreground tabular-nums">
                      {formatPersianPrice(Number(p.price))}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Clock className="size-3.5" aria-hidden />
                    <span className="tabular-nums">
                      {formatPersianNumber(p.durationHours)} ساعت
                    </span>
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {formatPersianNumber(p._count.payments)} پرداخت
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{form?.id ? 'ویرایش پلن' : 'پلن جدید نردبان'}</DialogTitle>
          </DialogHeader>
          {form ? (
            <div className="space-y-3">
              <div>
                <Label required>نام پلن</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثلاً: نردبان ۳ روزه"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label required>مدت (ساعت)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.durationHours}
                    onChange={(e) => setForm({ ...form, durationHours: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label required>قیمت (تومان)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label>توضیحات</Label>
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="آنچه کاربر باید بداند…"
                />
              </div>
              <label className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <span className="text-sm">پلن فعال است</span>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
              </label>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setForm(null)}>
              انصراف
            </Button>
            <Button
              variant="brand"
              isLoading={save.isPending}
              onClick={() => form && save.mutate(form)}
              disabled={!form?.name || !form?.durationHours || form?.price < 0}
            >
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title="حذف پلن"
        description={
          del
            ? del._count.payments > 0
              ? `پلن «${del.name}» در ${formatPersianNumber(del._count.payments)} پرداخت استفاده شده؛ به جای حذف غیرفعال می‌شود.`
              : `پلن «${del.name}» حذف شود؟`
            : null
        }
        confirmLabel={del && del._count.payments > 0 ? 'غیرفعال‌سازی' : 'حذف'}
        tone="destructive"
        isLoading={remove.isPending}
        onConfirm={() => del && remove.mutate(del.id)}
      />
    </Shell>
  );
}
