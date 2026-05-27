'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Camera, Check, ChevronLeft, MapPin, Tag, Type, Wallet, X } from 'lucide-react';
import { cn, formatPersianPrice } from '@agahiram/shared';
import {
  Button,
  IconButton,
  Input,
  Label,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Textarea,
  toast,
} from '@agahiram/ui';
import { apiClient } from '@/lib/api';
import { LocationPicker, type PickedLocation } from '@/components/maps/location-picker';

type Step = 0 | 1 | 2 | 3 | 4;
const STEP_LABELS = ['عکس و ویدیو', 'دسته‌بندی', 'مشخصات', 'عنوان و قیمت', 'موقعیت'];
const MAX_MEDIA = 10;

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  attributes: Array<{
    id: string;
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'bool';
    options: string[];
    required: boolean;
  }>;
  children?: Category[];
}

interface UploadedMedia {
  key: string;
  url: string;
  type: 'image' | 'video';
  preview: string;
}

type PriceType = 'fixed' | 'negotiable' | 'free' | 'callForPrice';

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [categoryId, setCategoryId] = useState<string>('');
  const [category, setCategory] = useState<Category | null>(null);
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [priceType, setPriceType] = useState<PriceType>('fixed');
  const [provinceId, setProvinceId] = useState('');
  const [cityId, setCityId] = useState('');
  const [pickedLocation, setPickedLocation] = useState<PickedLocation | null>(null);
  const [hideExactLocation, setHideExactLocation] = useState(false);

  const { data: cats } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await apiClient.get<Category[]>('/categories/tree')).data ?? [],
  });

  const { data: provinces } = useQuery({
    queryKey: ['provinces'],
    queryFn: async () =>
      (await apiClient.get<Array<{ id: string; name: string }>>('/locations/provinces')).data ?? [],
  });

  const { data: cities } = useQuery({
    queryKey: ['cities', provinceId],
    queryFn: async () =>
      (
        await apiClient.get<
          Array<{ id: string; name: string; lat?: number | null; lng?: number | null }>
        >(`/locations/provinces/${provinceId}/cities`)
      ).data ?? [],
    enabled: !!provinceId,
  });

  const selectedCity = (cities ?? []).find((c) => c.id === cityId);
  const cityCenter =
    selectedCity?.lat != null && selectedCity?.lng != null
      ? { lat: selectedCity.lat, lng: selectedCity.lng }
      : undefined;

  const handleFiles = async (files: FileList) => {
    if (media.length + files.length > MAX_MEDIA) {
      toast.error(`حداکثر ${MAX_MEDIA} مورد مجاز است`);
      return;
    }
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const presign = await apiClient.post<{ uploadUrl: string; key: string; publicUrl: string }>(
          '/media/presign',
          { folder: 'POSTS', fileName: file.name, contentType: file.type },
        );
        if (!presign.success || !presign.data) {
          toast.error('خطا در دریافت لینک آپلود');
          continue;
        }
        const res = await fetch(presign.data.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        }).catch(() => null);

        const isVideo = file.type.startsWith('video/');
        const preview = URL.createObjectURL(file);
        setMedia((m) => [
          ...m,
          {
            key: presign.data!.key,
            url: presign.data!.publicUrl,
            type: isVideo ? 'video' : 'image',
            preview: res?.ok ? presign.data!.publicUrl : preview,
          },
        ]);
      } catch (e) {
        toast.error(`خطا در آپلود: ${(e as Error).message}`);
      }
    }
    setUploading(false);
  };

  const submit = useMutation({
    mutationFn: async () => {
      const r = await apiClient.post<{ id: string }>('/posts', {
        title,
        description: description || undefined,
        categoryId,
        price: priceType === 'fixed' && price ? Number(price) : null,
        priceType,
        cityId,
        type: 'post',
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
        mediaKeys: media.map((m, i) => ({ key: m.key, type: m.type, order: i })),
        lat: pickedLocation?.lat ?? null,
        lng: pickedLocation?.lng ?? null,
        hideExactLocation,
      });
      if (!r.success) throw new Error(r.error ?? 'خطا در ثبت آگهی');
      return r.data;
    },
    onSuccess: (data) => {
      toast.success('آگهی شما ثبت شد و در انتظار تأیید است');
      router.push(`/post/${data?.id ?? ''}`);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const stepValid = () => {
    if (step === 0) return media.length > 0;
    if (step === 1) return !!categoryId;
    if (step === 2)
      return (category?.attributes ?? [])
        .filter((a) => a.required)
        .every((a) => !!attributes[a.key]);
    if (step === 3) return title.length >= 3 && (priceType !== 'fixed' || !!price);
    if (step === 4) return !!cityId;
    return false;
  };

  const allCats = (cats ?? []).flatMap((c) =>
    c.children && c.children.length > 0 ? c.children : [c],
  );

  return (
    <div className="bg-background pb-32">
      <div className="sticky top-[var(--header-height)] z-20 border-b border-border bg-background/90 px-3 py-2 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <IconButton
            aria-label={step === 0 ? 'انصراف' : 'مرحله قبل'}
            icon={
              step === 0 ? (
                <X className="size-5" aria-hidden />
              ) : (
                <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden />
              )
            }
            variant="ghost"
            onClick={() => (step === 0 ? router.back() : setStep((step - 1) as Step))}
          />
          <div className="flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">{STEP_LABELS[step]}</span>
              <span className="text-[11px] text-muted-foreground">مرحله {toFa(step + 1)} از ۵</span>
            </div>
            <Progress className="mt-1.5" tone="brand" value={((step + 1) / 5) * 100} />
          </div>
        </div>
      </div>

      <div className="space-y-5 p-4">
        {step === 0 && (
          <section>
            <h2 className="text-h3 font-bold tracking-tight">عکس و ویدیو</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              حداکثر {toFa(MAX_MEDIA)} مورد می‌توانید اضافه کنید
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {media.map((m, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                  {m.type === 'video' ? (
                    <video src={m.preview} className="size-full object-cover" muted playsInline />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={m.preview} alt="" className="size-full object-cover" />
                  )}
                  <button
                    type="button"
                    aria-label="حذف"
                    onClick={() => setMedia((arr) => arr.filter((_, j) => j !== i))}
                    className="absolute end-1 top-1 grid size-7 place-items-center rounded-full bg-black/60 text-white tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              ))}
              {media.length < MAX_MEDIA && (
                <label
                  className={cn(
                    'group/upload relative grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed text-center transition-colors',
                    uploading
                      ? 'border-primary bg-accent/40'
                      : 'border-border hover:border-primary',
                  )}
                >
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={(e) => e.target.files && void handleFiles(e.target.files)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    disabled={uploading}
                  />
                  {uploading ? (
                    <Spinner size="md" />
                  ) : (
                    <Camera
                      className="size-7 text-muted-foreground group-hover/upload:text-primary"
                      aria-hidden
                    />
                  )}
                  <span className="absolute bottom-2 text-[11px] text-muted-foreground">
                    {uploading ? 'در حال آپلود' : 'افزودن'}
                  </span>
                </label>
              )}
            </div>
          </section>
        )}

        {step === 1 && (
          <section>
            <h2 className="flex items-center gap-2 text-h3 font-bold tracking-tight">
              <Tag className="size-5" aria-hidden /> دسته‌بندی
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              دسته‌ای که بیشتر به آگهی شما مرتبط است
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2">
              {allCats.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCategoryId(c.id);
                    setCategory(c as Category);
                  }}
                  className={cn(
                    'flex h-14 items-center gap-3 rounded-xl border px-3 text-start tap-none',
                    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    categoryId === c.id
                      ? 'border-primary bg-accent'
                      : 'border-input hover:bg-muted',
                  )}
                >
                  <span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <Tag className="size-5" aria-hidden />
                  </span>
                  <span className="flex-1 font-medium">{c.name}</span>
                  {categoryId === c.id ? (
                    <Check className="size-5 text-primary" aria-hidden />
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h2 className="text-h3 font-bold tracking-tight">مشخصات</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {category?.attributes?.length
                ? 'ویژگی‌های زیر را پر کنید'
                : 'این دسته ویژگی خاصی ندارد — مرحله بعد را بزنید'}
            </p>
            <div className="mt-4 space-y-3">
              {category?.attributes.map((a) => (
                <div key={a.id} className="space-y-2">
                  <Label htmlFor={a.key} required={a.required}>
                    {a.label}
                  </Label>
                  {a.type === 'select' ? (
                    <Select
                      value={attributes[a.key] ?? ''}
                      onValueChange={(v) => setAttributes({ ...attributes, [a.key]: v })}
                    >
                      <SelectTrigger id={a.key}>
                        <SelectValue placeholder="انتخاب کنید" />
                      </SelectTrigger>
                      <SelectContent>
                        {a.options.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : a.type === 'bool' ? (
                    <div className="grid grid-cols-2 gap-2">
                      {['دارد', 'ندارد'].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setAttributes({ ...attributes, [a.key]: v })}
                          className={cn(
                            'h-11 rounded-lg border text-sm font-medium tap-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            attributes[a.key] === v
                              ? 'border-primary bg-accent text-accent-foreground'
                              : 'border-input hover:bg-muted',
                          )}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Input
                      id={a.key}
                      type={a.type === 'number' ? 'number' : 'text'}
                      inputMode={a.type === 'number' ? 'numeric' : 'text'}
                      value={attributes[a.key] ?? ''}
                      onChange={(e) => setAttributes({ ...attributes, [a.key]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h2 className="flex items-center gap-2 text-h3 font-bold tracking-tight">
              <Type className="size-5" aria-hidden /> عنوان و قیمت
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">عنوان واضح + قیمت دقیق = آگهی موفق</p>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" required>
                  عنوان آگهی
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثلاً: آیفون ۱۵ پرو ۲۵۶ گیگ گلوبال"
                  maxLength={100}
                />
                <p className="text-[11px] text-muted-foreground">{toFa(title.length)} / ۱۰۰</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">توضیحات</Label>
                <Textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="جزئیات بیشتر، شرایط فروش…"
                  autoGrow
                  rows={4}
                  maxLength={2000}
                />
              </div>
              <div className="space-y-2">
                <Label className="inline-flex items-center gap-1">
                  <Wallet className="size-4" aria-hidden /> نوع قیمت
                </Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { v: 'fixed' as const, l: 'ثابت' },
                    { v: 'negotiable' as const, l: 'توافقی' },
                    { v: 'free' as const, l: 'رایگان' },
                    { v: 'callForPrice' as const, l: 'تماس بگیرید' },
                  ].map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setPriceType(o.v)}
                      className={cn(
                        'h-11 rounded-lg border text-sm font-medium tap-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        priceType === o.v
                          ? 'border-primary bg-accent text-accent-foreground'
                          : 'border-input hover:bg-muted',
                      )}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
              {priceType === 'fixed' ? (
                <div className="space-y-2">
                  <Label htmlFor="price" required>
                    قیمت (تومان)
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    inputMode="numeric"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                  />
                  {price ? (
                    <p className="text-xs font-semibold gradient-text-brand">
                      {formatPersianPrice(Number(price))}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        )}

        {step === 4 && (
          <section>
            <h2 className="flex items-center gap-2 text-h3 font-bold tracking-tight">
              <MapPin className="size-5" aria-hidden /> موقعیت مکانی
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">شهر آگهی شما در کجاست؟</p>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="province" required>
                  استان
                </Label>
                <Select
                  value={provinceId}
                  onValueChange={(v) => {
                    setProvinceId(v);
                    setCityId('');
                  }}
                >
                  <SelectTrigger id="province">
                    <SelectValue placeholder="انتخاب کنید" />
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
              {provinceId ? (
                <div className="space-y-2">
                  <Label htmlFor="city" required>
                    شهر
                  </Label>
                  <Select value={cityId} onValueChange={setCityId}>
                    <SelectTrigger id="city">
                      <SelectValue placeholder="انتخاب کنید" />
                    </SelectTrigger>
                    <SelectContent>
                      {(cities ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {cityId ? (
                <div className="space-y-2">
                  <Label>موقعیت دقیق روی نقشه (اختیاری)</Label>
                  <p className="text-[11px] text-muted-foreground">
                    نقشه را جابه‌جا کنید تا پین روی محل دقیق آگهی قرار گیرد. این کمک می‌کند خریداران
                    فاصله را ببینند.
                  </p>
                  <LocationPicker
                    value={pickedLocation}
                    onChange={setPickedLocation}
                    hideExact={hideExactLocation}
                    onHideExactChange={setHideExactLocation}
                    defaultCenter={cityCenter}
                  />
                </div>
              ) : null}

              <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
                <h3 className="text-sm font-semibold">پیش‌نمایش</h3>
                <p className="mt-1 text-sm">{title || '—'}</p>
                <p className="text-sm font-bold gradient-text-brand">
                  {priceType === 'free'
                    ? 'رایگان'
                    : priceType === 'callForPrice'
                      ? 'تماس بگیرید'
                      : formatPersianPrice(price ? Number(price) : null)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">دسته: {category?.name ?? '—'}</p>
              </div>
            </div>
          </section>
        )}
      </div>

      <div
        className="fixed inset-x-0 z-30 border-t border-border bg-surface/95 backdrop-blur-md px-3 py-3"
        style={{ bottom: 'calc(var(--bottom-nav) + var(--safe-bottom))' }}
      >
        <div className="mx-auto max-w-2xl">
          <Button
            fullWidth
            size="lg"
            variant="brand"
            disabled={!stepValid() || submit.isPending}
            isLoading={submit.isPending}
            onClick={() => (step < 4 ? setStep((step + 1) as Step) : submit.mutate())}
            rightIcon={
              step < 4 ? <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden /> : undefined
            }
          >
            {step < 4 ? 'ادامه' : 'ثبت آگهی'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function toFa(n: number) {
  return new Intl.NumberFormat('fa-IR').format(n).replace(/,/g, '٬');
}
