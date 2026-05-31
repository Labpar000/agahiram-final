'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ImagePlus,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Tag,
  Type,
  Wallet,
  X,
} from 'lucide-react';
import {
  cn,
  formatPersianPrice,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
  PostStatus,
  type PostSummary,
} from '@agahiram/shared';
import { prependProfilePost } from '@/lib/query-cache-profile';
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
import dynamic from 'next/dynamic';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useUploadManager } from '@/lib/upload-manager';
import { ImageEditor } from '@/components/image-editor';
import { CityLocationPicker } from '@/components/search-filters';
import type { PickedLocation } from '@/components/maps/location-picker';

// Map picker pulls in maplibre-gl; it only appears on the last step of the
// create flow, so load it on demand instead of in the initial page bundle.
const LocationPicker = dynamic(
  () => import('@/components/maps/location-picker').then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full animate-pulse rounded-2xl bg-muted" />,
  },
);

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
  const qc = useQueryClient();
  const myUsername = useAuthStore((s) => s.user?.username);
  const { uploadFile } = useUploadManager();
  const [step, setStep] = useState<Step>(0);
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [categoryPath, setCategoryPath] = useState<Category[]>([]);
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
  // Editor queue: image files awaiting crop/filter/rotate before upload.
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const [editorQueue, setEditorQueue] = useState<File[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const last = localStorage.getItem('agahiram_last_city_id');
        if (!last) return;
        const r = await apiClient.get<{ id: string; provinceId: string }>(
          `/locations/city/${last}`,
        );
        if (r.success && r.data) {
          setCityId(r.data.id);
          setProvinceId(r.data.provinceId);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

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

  const uploadSingle = async (file: File): Promise<boolean> => {
    try {
      const extension = getFileExtension(file);
      const contentType = file.type || getContentTypeFromExtension(extension);
      const isVideo = contentType.startsWith('video/');

      const allowed = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
      if (!(allowed as readonly string[]).includes(contentType)) {
        toast.error(`فرمت «${file.name}» پشتیبانی نمی‌شود`);
        return false;
      }

      const maxBytes = isVideo ? MAX_VIDEO_UPLOAD_BYTES : MAX_IMAGE_UPLOAD_BYTES;
      if (file.size > maxBytes) {
        const maxMb = Math.round(maxBytes / (1024 * 1024));
        toast.error(`حجم «${file.name}» بیش از حد مجاز است (حداکثر ${toFa(maxMb)} مگابایت)`);
        return false;
      }

      const presign = await apiClient.post<{ uploadUrl: string; key: string; publicUrl: string }>(
        '/media/presign',
        { folder: 'posts', fileName: file.name, contentType, extension },
      );
      if (!presign.success || !presign.data) {
        toast.error('خطا در دریافت لینک آپلود');
        return false;
      }

      setUploadProgress(0);
      const ok = await uploadFile({
        label: file.name,
        url: presign.data.uploadUrl,
        file,
        contentType,
      });
      setUploadProgress(100);
      if (!ok) {
        toast.error(`آپلود «${file.name}» ناموفق بود`);
        return false;
      }

      const confirmRes = await apiClient.post('/media/confirm', { key: presign.data.key });
      if (!confirmRes.success) {
        toast.error(confirmRes.error ?? `تأیید «${file.name}» ناموفق بود`);
        return false;
      }

      const preview = URL.createObjectURL(file);
      setMedia((m) => [
        ...m,
        {
          key: presign.data!.key,
          url: presign.data!.publicUrl,
          type: isVideo ? 'video' : 'image',
          preview,
        },
      ]);
      return true;
    } catch (e) {
      toast.error(`خطا در آپلود: ${(e as Error).message}`);
      return false;
    }
  };

  // Route image files through the editor (one at a time). Videos upload directly.
  const handleFiles = async (files: FileList) => {
    if (media.length + files.length > MAX_MEDIA) {
      toast.error(`حداکثر ${MAX_MEDIA} مورد مجاز است`);
      return;
    }
    const images: File[] = [];
    const videos: File[] = [];
    for (const f of Array.from(files)) {
      const ct = f.type || getContentTypeFromExtension(getFileExtension(f));
      if (ct.startsWith('video/')) videos.push(f);
      else images.push(f);
    }

    if (videos.length > 0) {
      setUploading(true);
      for (const v of videos) await uploadSingle(v);
      setUploadProgress(0);
      setUploading(false);
    }

    if (images.length > 0) {
      // Show editor for first image; rest queue up.
      setEditorFile(images[0]!);
      setEditorQueue(images.slice(1));
    }
  };

  const onEditorApply = async (out: File) => {
    setEditorFile(null);
    setUploading(true);
    await uploadSingle(out);
    setUploadProgress(0);
    setUploading(false);
    // Dequeue next
    const next = editorQueue[0] ?? null;
    setEditorQueue((q) => q.slice(1));
    if (next) setEditorFile(next);
  };

  const onEditorCancel = () => {
    setEditorFile(null);
    // Drop the rest of the queue too on cancel — user can re-pick.
    setEditorQueue([]);
  };

  const submit = useMutation({
    mutationFn: async () => {
      const r = await apiClient.post<PostSummary>('/posts', {
        title,
        description: description || undefined,
        categoryId,
        price: priceType === 'fixed' && price ? Number(price) : null,
        priceType,
        cityId,
        type: media.length === 1 && media[0]?.type === 'video' ? 'reel' : 'post',
        attributes:
          Object.keys(attributes).filter((k) => k !== 'price').length > 0
            ? Object.fromEntries(Object.entries(attributes).filter(([k]) => k !== 'price'))
            : undefined,
        mediaKeys: media.map((m, i) => ({ key: m.key, type: m.type, order: i })),
        lat: pickedLocation?.lat ?? null,
        lng: pickedLocation?.lng ?? null,
        hideExactLocation,
      });
      if (!r.success) throw new Error(r.error ?? 'خطا در ثبت آگهی');
      return r.data;
    },
    onSuccess: (post) => {
      void qc.invalidateQueries({ queryKey: ['feed'] });
      void qc.invalidateQueries({ queryKey: ['explore'] });
      void qc.invalidateQueries({ queryKey: ['reels'] });
      if (myUsername && post) {
        prependProfilePost(qc, myUsername, {
          ...post,
          status: post.status ?? PostStatus.PENDING_REVIEW,
        });
      }
      router.replace(`/create/success?id=${encodeURIComponent(post?.id ?? '')}`);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const stepValid = () => {
    if (step === 0) return media.length > 0;
    if (step === 1) return !!categoryId && !!category;
    if (step === 2)
      return (category?.attributes ?? [])
        .filter((a) => a.required && a.key !== 'price')
        .every((a) => !!attributes[a.key]);
    if (step === 3) return title.length >= 3 && (priceType !== 'fixed' || !!price);
    if (step === 4) return !!cityId;
    return false;
  };

  const rootCategories = cats ?? [];
  const selectedParent = categoryPath[categoryPath.length - 1] ?? null;
  const visibleCategories = selectedParent?.children?.length
    ? selectedParent.children
    : rootCategories;

  return (
    <div className="bg-background pb-32">
      <div className="sticky top-[var(--header-height)] z-20 border-b border-border bg-background/95 px-3 py-2 backdrop-blur-md">
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

      <div className="mx-auto max-w-2xl space-y-5 p-4">
        {step === 0 && (
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <h2 className="text-h3 font-bold tracking-tight">عکس و ویدیو</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              حداکثر {toFa(MAX_MEDIA)} مورد می‌توانید اضافه کنید
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              ابعاد پیشنهادی: پست ۱۰۸۰×۱۰۸۰ پیکسل، استوری ۱۰۸۰×۱۹۲۰ پیکسل
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
              {media.map((m, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-xl bg-muted ring-1 ring-border"
                >
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
                    className="absolute end-1 top-1 grid size-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              ))}
              {media.length < MAX_MEDIA && (
                <label
                  className={cn(
                    'group/upload relative grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed text-center transition-[background-color,border-color,transform] focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-surface',
                    uploading
                      ? 'border-primary bg-accent/40'
                      : 'border-border hover:border-primary hover:bg-accent/30 active:scale-[0.98]',
                  )}
                >
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/webm"
                    multiple
                    onChange={(e) => e.target.files && void handleFiles(e.target.files)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    disabled={uploading}
                  />
                  {uploading ? (
                    <Spinner size="md" />
                  ) : (
                    <ImagePlus
                      className="size-7 text-muted-foreground group-hover/upload:text-primary"
                      aria-hidden
                    />
                  )}
                  <span className="absolute bottom-2 text-[11px] text-muted-foreground">
                    {uploading
                      ? uploadProgress > 0
                        ? `در حال آپلود ${toFa(uploadProgress)}٪`
                        : 'در حال آپلود'
                      : 'افزودن'}
                  </span>
                </label>
              )}
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <h2 className="flex items-center gap-2 text-h3 font-bold tracking-tight">
              <Tag className="size-5" aria-hidden /> دسته‌بندی
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              اول موضوع اصلی را انتخاب کنید، بعد زیرموضوع دقیق را مثل دیوار مشخص کنید.
            </p>
            {selectedParent ? (
              <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-3">
                <button
                  type="button"
                  onClick={() => {
                    const nextPath = categoryPath.slice(0, -1);
                    setCategoryPath(nextPath);
                    setCategoryId('');
                    setCategory(null);
                    setAttributes({});
                  }}
                  className="mb-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronRight className="size-3.5" aria-hidden /> تغییر موضوع اصلی
                </button>
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-accent text-primary">
                    <Tag className="size-5" aria-hidden />
                  </span>
                  <div>
                    <div className="text-xs text-muted-foreground">مسیر دسته‌بندی</div>
                    <div className="font-bold">{selectedParent.name}</div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              {visibleCategories.map((c) => {
                const hasChildren = !!c.children?.length;
                const selected = categoryId === c.id && category?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      if (hasChildren) {
                        setCategoryPath((p) => [...p, c]);
                        setCategoryId('');
                        setCategory(null);
                      } else {
                        setCategoryId(c.id);
                        setCategory(c);
                      }
                      setAttributes({});
                    }}
                    className={cn(
                      'flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 text-start shadow-xs tap-none',
                      'transition-[background-color,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                      selected ? 'border-primary bg-accent' : 'border-input hover:bg-muted',
                    )}
                  >
                    <span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground">
                      <Tag className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{c.name}</span>
                      {hasChildren ? (
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {toFa(c.children!.length)} زیرموضوع
                        </span>
                      ) : null}
                    </span>
                    {hasChildren ? (
                      <ChevronLeft
                        className="size-5 text-muted-foreground rtl:rotate-180"
                        aria-hidden
                      />
                    ) : selected ? (
                      <Check className="size-5 text-primary" aria-hidden />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <h2 className="text-h3 font-bold tracking-tight">مشخصات</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {category?.attributes?.length
                ? 'ویژگی‌های زیر را پر کنید'
                : 'این دسته ویژگی خاصی ندارد — مرحله بعد را بزنید'}
            </p>
            <div className="mt-4 space-y-3">
              {category?.attributes
                .filter((a) => a.key !== 'price')
                .map((a) => (
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
                              'h-11 rounded-lg border text-sm font-medium tap-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
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
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
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
                        'h-11 rounded-lg border text-sm font-medium tap-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
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
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <h2 className="flex items-center gap-2 text-h3 font-bold tracking-tight">
              <MapPin className="size-5" aria-hidden /> موقعیت مکانی
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">شهر آگهی شما در کجاست؟</p>
            <div className="mt-4 h-80 overflow-hidden rounded-2xl border border-border">
              <CityLocationPicker
                currentCityId={cityId}
                currentProvinceId={provinceId}
                onPickProvince={(p) => {
                  setProvinceId(p.id);
                  setCityId('');
                }}
                onPickCity={(c, p) => {
                  setCityId(c.id);
                  setProvinceId(p.id);
                  try {
                    localStorage.setItem('agahiram_last_city_id', c.id);
                  } catch {
                    /* ignore */
                  }
                }}
                onPickProvinceOnly={(p) => setProvinceId(p.id)}
                onClear={() => {
                  setProvinceId('');
                  setCityId('');
                }}
              />
            </div>

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

            <div className="rounded-2xl border border-border bg-muted/40 p-4">
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
          </section>
        )}
      </div>

      <div
        className="fixed inset-x-0 z-30 border-t border-border bg-surface/95 px-3 py-3 shadow-floating backdrop-blur-md"
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
      {editorFile ? (
        <ImageEditor
          file={editorFile}
          open
          onCancel={onEditorCancel}
          onApply={(out) => void onEditorApply(out)}
        />
      ) : null}
    </div>
  );
}

function getFileExtension(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName) return fromName;
  return file.type.split('/').pop()?.toLowerCase() ?? 'bin';
}

function getContentTypeFromExtension(extension: string) {
  const types: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    quicktime: 'video/quicktime',
  };
  return types[extension] ?? 'application/octet-stream';
}

function toFa(n: number) {
  return new Intl.NumberFormat('fa-IR').format(n).replace(/,/g, '٬');
}
