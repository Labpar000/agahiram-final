'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { prependExplorePost, prependFeedPost, prependReelsPost } from '@/lib/query-cache-posts';
import {
  Button,
  IconButton,
  IgArrowBack,
  IgCheck,
  IgChevron,
  IgClose,
  IgImagePlus,
  IgLocation,
  IgTag,
  IgText,
  IgWallet,
  Input,
  Label,
  Progress,
  Spinner,
  Textarea,
  toast,
} from '@agahiram/ui';
import dynamic from 'next/dynamic';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useUploadManager } from '@/lib/upload-manager';
import { ImageEditor } from '@/components/image-editor';
import { ResponsiveSelect } from '@/components/responsive-select';
import {
  normalizeImageFile,
  resolveContentType,
  resolveFileExtension,
  resolveVideoUploadType,
} from '@/lib/normalize-image-file';
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
const STEP_LABELS = ['موقعیت', 'دسته‌بندی', 'عکس و ویدیو', 'عنوان و قیمت', 'مشخصات'];
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

  // Track whether auto-advance already fired so going back to a completed step
  // doesn't immediately re-trigger it.
  const autoAdvancedRef = useRef<Record<Step, boolean>>({
    0: false,
    1: false,
    2: false,
    3: false,
    4: false,
  });

  const advance = useCallback(() => {
    if (step < 4) {
      autoAdvancedRef.current[step] = false;
      setStep((step + 1) as Step);
    }
  }, [step]);

  const goBack = useCallback(() => {
    if (step === 0) {
      router.back();
    } else {
      const prev = (step - 1) as Step;
      autoAdvancedRef.current[step] = false;
      autoAdvancedRef.current[prev] = false;
      setStep(prev);
    }
  }, [step, router]);

  // ---- Auto-advance: Step 0 (city) ----
  useEffect(() => {
    if (step === 0 && !!cityId && !autoAdvancedRef.current[0]) {
      autoAdvancedRef.current[0] = true;
      const t = setTimeout(() => advance(), 400);
      return () => clearTimeout(t);
    }
  }, [step, cityId, advance]);

  // ---- Auto-advance: Step 1 (category leaf) ----
  useEffect(() => {
    if (
      step === 1 &&
      !!categoryId &&
      !!category &&
      (!category.children || category.children.length === 0) &&
      !autoAdvancedRef.current[1]
    ) {
      autoAdvancedRef.current[1] = true;
      const t = setTimeout(() => advance(), 400);
      return () => clearTimeout(t);
    }
  }, [step, categoryId, category, advance]);

  // ---- Auto-advance: Step 2 (media) ----
  useEffect(() => {
    if (step === 2 && media.length > 0 && !uploading && !autoAdvancedRef.current[2]) {
      autoAdvancedRef.current[2] = true;
      const t = setTimeout(() => advance(), 500);
      return () => clearTimeout(t);
    }
  }, [step, media.length, uploading, advance]);

  // Restore draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('agahiram_post_draft');
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.title) setTitle(draft.title);
      if (draft.description) setDescription(draft.description);
      if (draft.priceType) setPriceType(draft.priceType);
      if (draft.price) setPrice(draft.price);
      if (draft.cityId) setCityId(draft.cityId);
      if (draft.provinceId) setProvinceId(draft.provinceId);
      if (draft.attributes && typeof draft.attributes === 'object') setAttributes(draft.attributes);
    } catch {
      /* ignore */
    }
  }, []);

  // Save draft whenever form fields change
  useEffect(() => {
    if (step === 0 && !cityId && !title && !categoryId) return;
    const draft = {
      title,
      description,
      categoryId,
      attributes,
      priceType,
      price,
      cityId,
      provinceId,
    };
    try {
      localStorage.setItem('agahiram_post_draft', JSON.stringify(draft));
    } catch {
      /* ignore quota errors */
    }
  }, [title, description, categoryId, attributes, priceType, price, cityId, provinceId, step]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      media.forEach((m) => {
        try {
          URL.revokeObjectURL(m.preview);
        } catch {
          /* ignore */
        }
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    data: cats,
    isPending: catsLoading,
    isError: catsError,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await apiClient.get<Category[]>('/categories/tree')).data ?? [],
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

  const priceSuggestionReady =
    !!categoryId && !!cityId && priceType === 'fixed' && !!price && Number(price) > 0;

  const { data: priceSuggestion, isFetching: priceSuggestionLoading } = useQuery({
    queryKey: ['suggest-price', categoryId, cityId, attributes, price],
    queryFn: async () => {
      const r = await apiClient.post<{
        suggestedPrice: number | null;
        minPrice?: number;
        maxPrice?: number;
        sampleSize: number;
        note: string;
      }>('/ai/suggest-price', {
        categoryId,
        attributes: Object.fromEntries(
          Object.entries(attributes).filter(([k, v]) => k !== 'price' && v?.trim()),
        ),
      });
      if (!r.success) throw new Error(r.error ?? 'خطا در پیشنهاد قیمت');
      return r.data;
    },
    enabled: priceSuggestionReady,
    staleTime: 30_000,
  });

  const uploadSingle = async (file: File): Promise<boolean> => {
    try {
      const extension = resolveFileExtension(file);
      const contentType = resolveContentType(file);
      const isVideo = contentType.startsWith('video/');

      const allowed = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
      const allowedByExt =
        !isVideo && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'].includes(extension);
      const allowedVideoByExt = isVideo && ['mp4', 'mov', 'webm', 'quicktime'].includes(extension);
      if (
        !(allowed as readonly string[]).includes(contentType) &&
        !allowedByExt &&
        !allowedVideoByExt
      ) {
        toast.error(`فرمت «${file.name}» پشتیبانی نمی‌شود`);
        return false;
      }
      const uploadType = (allowed as readonly string[]).includes(contentType)
        ? contentType
        : isVideo
          ? resolveVideoUploadType(file)
          : 'image/jpeg';

      const maxBytes = isVideo ? MAX_VIDEO_UPLOAD_BYTES : MAX_IMAGE_UPLOAD_BYTES;
      if (file.size > maxBytes) {
        const maxMb = Math.round(maxBytes / (1024 * 1024));
        toast.error(`حجم «${file.name}» بیش از حد مجاز است (حداکثر ${toFa(maxMb)} مگابایت)`);
        return false;
      }

      const presign = await apiClient.post<{ uploadUrl: string; key: string; publicUrl: string }>(
        '/media/presign',
        { folder: 'posts', fileName: file.name, contentType: uploadType, extension },
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
        contentType: uploadType,
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
    for (const raw of Array.from(files)) {
      const ct = resolveContentType(raw);
      if (ct.startsWith('video/')) {
        videos.push(raw);
      } else {
        images.push(await normalizeImageFile(raw));
      }
    }

    if (videos.length > 0) {
      setUploading(true);
      for (const v of videos) await uploadSingle(v);
      setUploadProgress(0);
      setUploading(false);
    }

    if (images.length > 0) {
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
      if (!post) {
        router.replace('/create/success');
        return;
      }
      try {
        localStorage.removeItem('agahiram_post_draft');
      } catch {
        /* ignore */
      }
      const enrichedPost = { ...post, status: post.status ?? PostStatus.PENDING_REVIEW };
      prependFeedPost(qc, enrichedPost);
      prependExplorePost(qc, enrichedPost);
      if (enrichedPost.type === 'reel') {
        prependReelsPost(qc, enrichedPost);
      }
      if (myUsername) {
        prependProfilePost(qc, myUsername, enrichedPost);
      }
      router.replace(`/create/success?id=${encodeURIComponent(post.id)}`);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const stepValid = () => {
    if (step === 0) return !!cityId;
    if (step === 1) return !!categoryId && !!category;
    if (step === 2) return media.length > 0;
    if (step === 3) return title.length >= 3 && (priceType !== 'fixed' || !!price);
    if (step === 4) {
      const requiredAttrs = (category?.attributes ?? []).filter(
        (a) => a.required && a.key !== 'price',
      );
      if (requiredAttrs.length === 0) return true;
      return requiredAttrs.every((a) => !!attributes[a.key]);
    }
    return false;
  };

  const rootCategories = cats ?? [];
  const selectedParent = categoryPath[categoryPath.length - 1] ?? null;
  const visibleCategories = selectedParent?.children?.length
    ? selectedParent.children
    : rootCategories;

  // Only show fixed bottom bar on steps that require explicit user action
  const showBottomBar = step >= 3;

  return (
    <div
      className="bg-background"
      style={{
        paddingBottom: showBottomBar
          ? 'calc(var(--bottom-nav) + var(--safe-bottom) + 4.5rem)'
          : 'calc(var(--bottom-nav) + var(--safe-bottom) + 1rem)',
      }}
    >
      {/* Header */}
      <div className="glass sticky top-[var(--header-height)] z-20 border-b border-border-subtle px-3 py-2">
        <div className="flex items-center gap-2">
          <IconButton
            aria-label={step === 0 ? 'انصراف' : 'مرحله قبل'}
            icon={
              step === 0 ? (
                <IgClose className="size-5" strokeWidth={1.75} aria-hidden />
              ) : (
                <IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} aria-hidden />
              )
            }
            variant="ghost"
            onClick={goBack}
          />
          <div className="flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">{STEP_LABELS[step]}</span>
              <span className="text-ig-meta">مرحله {toFa(step + 1)} از ۵</span>
            </div>
            <Progress className="mt-1.5 h-0.5" tone="brand" value={((step + 1) / 5) * 100} />
            {/* Step dots */}
            <div className="mt-1.5 flex justify-center gap-1" aria-hidden>
              {([0, 1, 2, 3, 4] as Step[]).map((s) => (
                <div
                  key={s}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    s === step
                      ? 'w-4 bg-primary'
                      : s < step
                        ? 'w-1.5 bg-primary/50'
                        : 'w-1.5 bg-muted-foreground/25',
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-5 p-4">
        {/* ──── Step 0: City ──── */}
        {step === 0 && (
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <h2 className="flex items-center gap-2 text-h3 font-bold tracking-tight">
              <IgLocation className="size-5" strokeWidth={1.75} aria-hidden /> موقعیت مکانی
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">شهر آگهی شما کجاست؟</p>
            <div className="mt-4 max-h-[min(24rem,65svh)] overflow-hidden rounded-2xl border border-border">
              <CityLocationPicker
                embedded
                currentCityId={cityId || undefined}
                currentProvinceId={provinceId || undefined}
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
          </section>
        )}

        {/* ──── Step 1: Category ──── */}
        {step === 1 && (
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <h2 className="flex items-center gap-2 text-h3 font-bold tracking-tight">
              <IgTag className="size-5" strokeWidth={1.75} aria-hidden /> دسته‌بندی
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              موضوع اصلی را انتخاب کنید، سپس زیرموضوع دقیق را مشخص کنید.
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
                  <IgChevron direction="right" className="size-3.5" aria-hidden /> تغییر موضوع اصلی
                </button>
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-accent text-primary">
                    <IgTag className="size-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div>
                    <div className="text-xs text-muted-foreground">مسیر دسته‌بندی</div>
                    <div className="font-bold">{selectedParent.name}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {catsLoading ? (
              <div className="mt-6 flex justify-center">
                <Spinner size="md" label="در حال بارگذاری دسته‌بندی‌ها…" />
              </div>
            ) : catsError ? (
              <p className="mt-4 text-sm text-destructive">
                خطا در بارگذاری دسته‌بندی‌ها. لطفاً صفحه را مجدداً بارگذاری کنید.
              </p>
            ) : (
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
                        <IgTag className="size-5" strokeWidth={1.75} aria-hidden />
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
                        <IgChevron
                          className="size-5 text-muted-foreground rtl:rotate-180"
                          aria-hidden
                        />
                      ) : selected ? (
                        <IgCheck className="size-5 text-ig-link" strokeWidth={1.75} aria-hidden />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ──── Step 2: Media ──── */}
        {step === 2 && (
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <h2 className="text-h3 font-bold tracking-tight">عکس و ویدیو</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              حداکثر {toFa(MAX_MEDIA)} مورد می‌توانید اضافه کنید
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
                    onClick={() => {
                      const item = media[i];
                      if (item?.preview) URL.revokeObjectURL(item.preview);
                      setMedia((arr) => arr.filter((_, j) => j !== i));
                    }}
                    className="absolute end-1 top-1 grid size-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <IgClose className="size-4" strokeWidth={1.75} aria-hidden />
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
                    accept="image/*,video/mp4,video/quicktime,video/webm"
                    multiple
                    onChange={(e) => {
                      const picked = e.target.files;
                      if (picked) void handleFiles(picked);
                      e.target.value = '';
                    }}
                    className="absolute inset-0 z-10 cursor-pointer opacity-0 [font-size:0]"
                    disabled={uploading}
                  />
                  <div className="pointer-events-none relative z-0 flex flex-col items-center gap-1">
                    {uploading ? (
                      <Spinner size="md" />
                    ) : (
                      <IgImagePlus
                        className="size-7 text-muted-foreground group-hover/upload:text-primary"
                        aria-hidden
                      />
                    )}
                  </div>
                  <span className="pointer-events-none absolute bottom-2 z-0 text-[11px] text-muted-foreground">
                    {uploading
                      ? uploadProgress > 0
                        ? `در حال آپلود ${toFa(uploadProgress)}٪`
                        : 'در حال آپلود'
                      : 'افزودن'}
                  </span>
                </label>
              )}
            </div>
            {/* Manual continue if auto-advance was blocked (user navigated back) */}
            {media.length > 0 && !uploading && (
              <div className="mt-5">
                <Button
                  fullWidth
                  size="lg"
                  variant="brand"
                  onClick={() => advance()}
                  className="text-base font-bold"
                >
                  ادامه
                </Button>
              </div>
            )}
          </section>
        )}

        {/* ──── Step 3: Title + Price ──── */}
        {step === 3 && (
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <h2 className="flex items-center gap-2 text-h3 font-bold tracking-tight">
              <IgText className="size-5" strokeWidth={1.75} aria-hidden /> عنوان و قیمت
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
                  enterKeyHint="next"
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
                  <IgWallet className="size-4" strokeWidth={1.75} aria-hidden /> نوع قیمت
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
                    pattern="[0-9]*"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    enterKeyHint="next"
                  />
                  {price ? (
                    <p className="text-xs font-semibold gradient-text-brand">
                      {formatPersianPrice(Number(price))}
                    </p>
                  ) : null}
                  {priceSuggestionReady ? (
                    <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs">
                      {priceSuggestionLoading && !priceSuggestion ? (
                        <span className="text-muted-foreground">در حال بررسی بازار…</span>
                      ) : priceSuggestion?.suggestedPrice ? (
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground">
                            بازه پیشنها��ی:{' '}
                            {priceSuggestion.minPrice != null && priceSuggestion.maxPrice != null
                              ? `${formatPersianPrice(priceSuggestion.minPrice)} تا ${formatPersianPrice(priceSuggestion.maxPrice)}`
                              : formatPersianPrice(priceSuggestion.suggestedPrice)}
                          </p>
                          <p className="text-muted-foreground">{priceSuggestion.note}</p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          {priceSuggestion?.note ?? 'داده کافی برای پیشنهاد قیمت وجود ندارد'}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        )}

        {/* ──── Step 4: Attributes (Final) ──── */}
        {step === 4 && (
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <h2 className="text-h3 font-bold tracking-tight">مشخصات</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {category?.attributes?.filter((a) => a.required && a.key !== 'price').length
                ? 'ویژگی‌های ضروری را پر کنید'
                : 'این دسته ویژگی ضروری خاصی ندارد'}
            </p>
            <div className="mt-4 space-y-3">
              {category?.attributes
                ?.filter((a) => a.required && a.key !== 'price')
                .map((a) => (
                  <div key={a.id} className="space-y-2">
                    <Label htmlFor={a.key} required={a.required}>
                      {a.label}
                    </Label>
                    {a.type === 'select' ? (
                      <ResponsiveSelect
                        id={a.key}
                        value={attributes[a.key] ?? ''}
                        onValueChange={(v) => setAttributes({ ...attributes, [a.key]: v })}
                        placeholder="انتخاب کنید"
                        options={a.options}
                      />
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

            {/* Preview card */}
            <div className="mt-5 rounded-2xl border border-border bg-muted/40 p-4">
              <h3 className="text-sm font-semibold">پیش‌نمایش</h3>
              <p className="mt-1 text-sm">{title || '—'}</p>
              <p className="text-sm font-bold gradient-text-brand">
                {priceType === 'free'
                  ? 'رایگان'
                  : priceType === 'callForPrice'
                    ? 'تماس بگیرید'
                    : formatPersianPrice(price ? Number(price) : null)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {category?.name ?? '—'} &middot;{' '}
                {selectedCity ? `${selectedCity.name}` : cityId ? '—' : 'مشخص نشده'}
              </p>
            </div>
          </section>
        )}
      </div>

      {/* Fixed bottom bar — only on steps that require explicit user action */}
      {showBottomBar && (
        <div
          className="fixed inset-x-0 z-50 border-t border-border bg-surface/95 px-3 py-3 shadow-floating backdrop-blur-md"
          style={{ bottom: 'calc(var(--bottom-nav) + var(--safe-bottom))' }}
        >
          <div className="mx-auto max-w-2xl">
            <Button
              fullWidth
              size="lg"
              variant="brand"
              disabled={!stepValid() || submit.isPending}
              isLoading={submit.isPending}
              onClick={() => (step === 3 ? advance() : submit.mutate())}
              rightIcon={
                step === 3 ? (
                  <IgChevron direction="left" className="size-5 rtl:rotate-180" aria-hidden />
                ) : undefined
              }
            >
              {step === 3 ? 'ادامه' : 'ثبت آگهی'}
            </Button>
          </div>
        </div>
      )}
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

function toFa(n: number) {
  return new Intl.NumberFormat('fa-IR').format(n).replace(/,/g, '٬');
}
