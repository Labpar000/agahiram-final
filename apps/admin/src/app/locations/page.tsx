'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { formatPersianNumber } from '@agahiram/shared';
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
  IconButton,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@agahiram/ui';
import Shell from '../layout-shell';
import { PageHeader } from '@/components/page-header';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { apiClient } from '@/lib/api';

interface Province {
  id: string;
  name: string;
  slug: string;
  _count: { cities: number };
}
interface City {
  id: string;
  name: string;
  slug: string;
  provinceId: string;
  province: { name: string };
  lat?: number | null;
  lng?: number | null;
  _count: { posts: number };
}
interface Neighborhood {
  id: string;
  name: string;
  slug: string;
  cityId: string;
}

export default function LocationsPage() {
  return (
    <Shell adminOnly>
      <PageHeader title="مناطق" description="مدیریت استان‌ها، شهرها و محله‌ها" />
      <Tabs defaultValue="provinces">
        <TabsList className="mb-4">
          <TabsTrigger value="provinces">استان‌ها</TabsTrigger>
          <TabsTrigger value="cities">شهرها</TabsTrigger>
          <TabsTrigger value="neighborhoods">محله‌ها</TabsTrigger>
        </TabsList>
        <TabsContent value="provinces">
          <ProvincesTab />
        </TabsContent>
        <TabsContent value="cities">
          <CitiesTab />
        </TabsContent>
        <TabsContent value="neighborhoods">
          <NeighborhoodsTab />
        </TabsContent>
      </Tabs>
    </Shell>
  );
}

function ProvincesTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState<{ id?: string; name: string; slug: string } | null>(null);
  const [del, setDel] = useState<Province | null>(null);

  const list = useQuery({
    queryKey: ['admin', 'provinces'],
    queryFn: async () => (await apiClient.get<Province[]>('/admin/provinces')).data ?? [],
  });

  const save = useMutation({
    mutationFn: async (f: { id?: string; name: string; slug: string }) => {
      const body = { name: f.name.trim(), slug: f.slug.trim() };
      const r = f.id
        ? await apiClient.patch(`/admin/provinces/${f.id}`, body)
        : await apiClient.post('/admin/provinces', body);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('ذخیره شد');
      setForm(null);
      qc.invalidateQueries({ queryKey: ['admin', 'provinces'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.delete(`/admin/provinces/${id}`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('حذف شد');
      setDel(null);
      qc.invalidateQueries({ queryKey: ['admin', 'provinces'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card>
      <CardContent className="!p-4">
        <div className="mb-4 flex justify-end">
          <Button
            variant="brand"
            leftIcon={<Plus className="size-4" />}
            onClick={() => setForm({ name: '', slug: '' })}
          >
            استان جدید
          </Button>
        </div>
        {list.isLoading ? (
          <div className="text-sm text-muted-foreground py-4 text-center">در حال بارگذاری…</div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            {(list.data ?? []).map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground" dir="ltr">
                    {p.slug}
                  </div>
                </div>
                <Badge tone="neutral" size="sm">
                  {formatPersianNumber(p._count.cities)} شهر
                </Badge>
                <IconButton
                  aria-label="ویرایش"
                  size="sm"
                  variant="ghost"
                  icon={<Pencil className="size-4" />}
                  onClick={() => setForm({ id: p.id, name: p.name, slug: p.slug })}
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
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{form?.id ? 'ویرایش استان' : 'استان جدید'}</DialogTitle>
          </DialogHeader>
          {form ? (
            <div className="space-y-3">
              <div>
                <Label required>نام</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label required>Slug</Label>
                <Input
                  dir="ltr"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
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
              disabled={!form?.name || !form?.slug}
            >
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title="حذف استان"
        description={del ? `استان «${del.name}» حذف شود؟` : null}
        confirmLabel="حذف"
        tone="destructive"
        isLoading={remove.isPending}
        onConfirm={() => del && remove.mutate(del.id)}
      />
    </Card>
  );
}

function CitiesTab() {
  const qc = useQueryClient();
  const [provinceId, setProvinceId] = useState<string>('');
  const [q, setQ] = useState('');
  const [form, setForm] = useState<{
    id?: string;
    name: string;
    slug: string;
    provinceId: string;
    lat?: string;
    lng?: string;
  } | null>(null);
  const [del, setDel] = useState<City | null>(null);

  const provinces = useQuery({
    queryKey: ['admin', 'provinces'],
    queryFn: async () => (await apiClient.get<Province[]>('/admin/provinces')).data ?? [],
  });

  const list = useQuery({
    queryKey: ['admin', 'cities', provinceId, q],
    queryFn: async () =>
      (
        await apiClient.get<City[]>('/admin/cities', {
          provinceId: provinceId || undefined,
          q: q || undefined,
        })
      ).data ?? [],
  });

  const save = useMutation({
    mutationFn: async (f: {
      id?: string;
      name: string;
      slug: string;
      provinceId: string;
      lat?: string;
      lng?: string;
    }) => {
      const body = {
        name: f.name.trim(),
        slug: f.slug.trim(),
        provinceId: f.provinceId,
        lat: f.lat?.trim() ? Number(f.lat) : null,
        lng: f.lng?.trim() ? Number(f.lng) : null,
      };
      const r = f.id
        ? await apiClient.patch(`/admin/cities/${f.id}`, body)
        : await apiClient.post('/admin/cities', body);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('ذخیره شد');
      setForm(null);
      qc.invalidateQueries({ queryKey: ['admin', 'cities'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.delete(`/admin/cities/${id}`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('حذف شد');
      setDel(null);
      qc.invalidateQueries({ queryKey: ['admin', 'cities'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const provinceMap = useMemo(
    () => new Map((provinces.data ?? []).map((p) => [p.id, p])),
    [provinces.data],
  );

  return (
    <Card>
      <CardContent className="!p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={provinceId}
            onChange={(e) => setProvinceId(e.target.value)}
          >
            <option value="">همه‌ی استان‌ها</option>
            {(provinces.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="flex-1 min-w-[200px]">
            <Input
              size="sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجو نام شهر…"
              leadingIcon={<Search className="size-4" />}
            />
          </div>
          <Button
            variant="brand"
            size="sm"
            leftIcon={<Plus className="size-4" />}
            onClick={() =>
              setForm({
                name: '',
                slug: '',
                provinceId: provinceId || (provinces.data?.[0]?.id ?? ''),
                lat: '',
                lng: '',
              })
            }
          >
            شهر جدید
          </Button>
        </div>

        {list.isLoading ? (
          <div className="text-sm text-muted-foreground py-4 text-center">در حال بارگذاری…</div>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {(list.data ?? []).map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <MapPin className="size-4 text-muted-foreground" aria-hidden />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {provinceMap.get(c.provinceId)?.name ?? c.province?.name}
                  </div>
                </div>
                <Badge tone="neutral" size="sm">
                  {formatPersianNumber(c._count.posts)} آگهی
                </Badge>
                <IconButton
                  aria-label="ویرایش"
                  size="sm"
                  variant="ghost"
                  icon={<Pencil className="size-4" />}
                  onClick={() =>
                    setForm({
                      id: c.id,
                      name: c.name,
                      slug: c.slug,
                      provinceId: c.provinceId,
                      lat: c.lat != null ? String(c.lat) : '',
                      lng: c.lng != null ? String(c.lng) : '',
                    })
                  }
                />
                <IconButton
                  aria-label="حذف"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  icon={<Trash2 className="size-4" />}
                  onClick={() => setDel(c)}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{form?.id ? 'ویرایش شهر' : 'شهر جدید'}</DialogTitle>
          </DialogHeader>
          {form ? (
            <div className="space-y-3">
              <div>
                <Label required>نام</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label required>Slug</Label>
                <Input
                  dir="ltr"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
              <div>
                <Label required>استان</Label>
                <select
                  className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={form.provinceId}
                  onChange={(e) => setForm({ ...form, provinceId: e.target.value })}
                >
                  {(provinces.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>عرض جغرافیایی (lat)</Label>
                  <Input
                    dir="ltr"
                    type="number"
                    step="any"
                    value={form.lat ?? ''}
                    onChange={(e) => setForm({ ...form, lat: e.target.value })}
                    placeholder="35.6892"
                  />
                </div>
                <div>
                  <Label>طول جغرافیایی (lng)</Label>
                  <Input
                    dir="ltr"
                    type="number"
                    step="any"
                    value={form.lng ?? ''}
                    onChange={(e) => setForm({ ...form, lng: e.target.value })}
                    placeholder="51.3890"
                  />
                </div>
              </div>
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
              disabled={!form?.name || !form?.slug || !form?.provinceId}
            >
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title="حذف شهر"
        description={del ? `شهر «${del.name}» حذف شود؟` : null}
        confirmLabel="حذف"
        tone="destructive"
        isLoading={remove.isPending}
        onConfirm={() => del && remove.mutate(del.id)}
      />
    </Card>
  );
}

function NeighborhoodsTab() {
  const qc = useQueryClient();
  const [cityId, setCityId] = useState<string>('');
  const [form, setForm] = useState<{
    id?: string;
    name: string;
    slug: string;
    cityId: string;
  } | null>(null);
  const [del, setDel] = useState<Neighborhood | null>(null);

  const cities = useQuery({
    queryKey: ['admin', 'cities-all'],
    queryFn: async () => (await apiClient.get<City[]>('/admin/cities')).data ?? [],
  });

  const list = useQuery({
    queryKey: ['admin', 'neighborhoods', cityId],
    queryFn: async () =>
      cityId
        ? ((await apiClient.get<Neighborhood[]>('/admin/neighborhoods', { cityId })).data ?? [])
        : [],
    enabled: !!cityId,
  });

  const save = useMutation({
    mutationFn: async (f: { id?: string; name: string; slug: string; cityId: string }) => {
      const body = { name: f.name.trim(), slug: f.slug.trim(), cityId: f.cityId };
      const r = f.id
        ? await apiClient.patch(`/admin/neighborhoods/${f.id}`, body)
        : await apiClient.post('/admin/neighborhoods', body);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('ذخیره شد');
      setForm(null);
      qc.invalidateQueries({ queryKey: ['admin', 'neighborhoods'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.delete(`/admin/neighborhoods/${id}`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('حذف شد');
      setDel(null);
      qc.invalidateQueries({ queryKey: ['admin', 'neighborhoods'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card>
      <CardContent className="!p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
          >
            <option value="">یک شهر انتخاب کنید</option>
            {(cities.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.province?.name ?? ''}
              </option>
            ))}
          </select>
          <Button
            variant="brand"
            size="sm"
            leftIcon={<Plus className="size-4" />}
            disabled={!cityId}
            onClick={() => setForm({ name: '', slug: '', cityId })}
          >
            محله‌ی جدید
          </Button>
        </div>

        {!cityId ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            ابتدا یک شهر را انتخاب کنید.
          </div>
        ) : list.isLoading ? (
          <div className="text-sm text-muted-foreground py-4 text-center">در حال بارگذاری…</div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            {(list.data ?? []).map((n) => (
              <div
                key={n.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{n.name}</div>
                  <div className="text-[11px] text-muted-foreground" dir="ltr">
                    {n.slug}
                  </div>
                </div>
                <IconButton
                  aria-label="ویرایش"
                  size="sm"
                  variant="ghost"
                  icon={<Pencil className="size-4" />}
                  onClick={() =>
                    setForm({ id: n.id, name: n.name, slug: n.slug, cityId: n.cityId })
                  }
                />
                <IconButton
                  aria-label="حذف"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  icon={<Trash2 className="size-4" />}
                  onClick={() => setDel(n)}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{form?.id ? 'ویرایش محله' : 'محله‌ی جدید'}</DialogTitle>
          </DialogHeader>
          {form ? (
            <div className="space-y-3">
              <div>
                <Label required>نام</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label required>Slug</Label>
                <Input
                  dir="ltr"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
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
              disabled={!form?.name || !form?.slug}
            >
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title="حذف محله"
        description={del ? `محله «${del.name}» حذف شود؟` : null}
        confirmLabel="حذف"
        tone="destructive"
        isLoading={remove.isPending}
        onConfirm={() => del && remove.mutate(del.id)}
      />
    </Card>
  );
}
