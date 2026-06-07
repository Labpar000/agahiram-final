'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CheckCircle2, Loader2, ShoppingBag, Store, User } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  IconButton,
  IgArrowBack,
  Input,
  Label,
  Spinner,
  Textarea,
  VerificationCard,
  TrustScoreBar,
  toast,
} from '@agahiram/ui';
import type { TrustTierValue, VerificationTypeValue, VerificationStatusValue } from '@agahiram/ui';
import { formatPersianNumber } from '@agahiram/shared';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useUploadManager } from '@/lib/upload-manager';

type ShopTypeKey = 'PERSONAL' | 'ONLINE_STORE' | 'PHYSICAL_STORE' | 'BRAND';

const SHOP_TYPES: Array<{
  key: ShopTypeKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: 'PERSONAL', label: 'فروشنده شخصی', description: 'برای فروش اقلام شخصی', icon: User },
  {
    key: 'ONLINE_STORE',
    label: 'فروشگاه آنلاین',
    description: 'فروشگاه اینترنتی',
    icon: ShoppingBag,
  },
  { key: 'PHYSICAL_STORE', label: 'فروشگاه فیزیکی', description: 'با آدرس فیزیکی', icon: Store },
  { key: 'BRAND', label: 'برند', description: 'برند یا شرکت ثبت‌شده', icon: Building2 },
];

const SHOP_TYPE_LABELS: Record<ShopTypeKey, string> = {
  PERSONAL: 'فروشنده شخصی',
  ONLINE_STORE: 'فروشگاه آنلاین',
  PHYSICAL_STORE: 'فروشگاه فیزیکی',
  BRAND: 'برند',
};

interface VerificationStatus {
  id: string;
  type: string;
  status: string;
}

interface ShopData {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  shopType: string;
  trustScore: number;
  trustTier: string;
  badges: Array<{ id: string; type: string }>;
}

const VERIFICATION_TYPES: VerificationTypeValue[] = [
  'PHONE',
  'NATIONAL_ID',
  'BUSINESS_LICENSE',
  'COMPANY_REG',
  'ENAMAD',
  'ADDRESS',
  'BANK_ACCOUNT',
];

function ShopCreationWizard({ onCreated }: { onCreated: () => void }) {
  const [step, setStep] = useState(1);
  const [shopType, setShopType] = useState<ShopTypeKey | null>(null);
  const [form, setForm] = useState({
    slug: '',
    name: '',
    description: '',
    category: '',
    contactPhone: '',
    address: '',
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!shopType) throw new Error('نوع فروشگاه را انتخاب کنید');
      const r = await apiClient.post('/shops', {
        shopType,
        slug: form.slug,
        name: form.name,
        description: form.description || undefined,
        category: form.category || undefined,
        contactPhone: form.contactPhone || undefined,
        address: form.address || undefined,
      });
      if (!r.success) throw new Error(r.error ?? 'خطا در ایجاد فروشگاه');
      return r.data;
    },
    onSuccess: () => {
      toast.success('فروشگاه با موفقیت ایجاد شد!');
      onCreated();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`size-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {step > s ? <CheckCircle2 className="size-4" /> : s}
            </div>
            {s < 2 && <div className={`h-px w-12 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">نوع فروشگاه را انتخاب کنید</h2>
            <p className="text-sm text-muted-foreground mt-1">این انتخاب بعداً قابل تغییر است</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {SHOP_TYPES.map(({ key, label, description, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setShopType(key)}
                className={`rounded-xl border-2 p-4 text-start transition-all ${
                  shopType === key
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/40'
                }`}
              >
                <Icon
                  className={`size-6 mb-2 ${shopType === key ? 'text-primary' : 'text-muted-foreground'}`}
                />
                <div className="font-semibold text-sm">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
              </button>
            ))}
          </div>
          <Button className="w-full" disabled={!shopType} onClick={() => setStep(2)}>
            بعدی
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">اطلاعات فروشگاه</h2>
            <p className="text-sm text-muted-foreground mt-1">مشخصات فروشگاه خود را وارد کنید</p>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="name">نام فروشگاه *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="مثلاً: فروشگاه آنلاین رضایی"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="slug">نام کاربری فروشگاه *</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))}
                placeholder="مثلاً: rezaei-store"
                className="mt-1"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground mt-1">
                فقط حروف انگلیسی، اعداد، خط تیره و زیرخط
              </p>
            </div>

            <div>
              <Label htmlFor="description">توضیحات</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="کوتاه درباره فروشگاه بنویسید…"
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="category">دسته‌بندی</Label>
              <Input
                id="category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="مثلاً: لوازم الکترونیکی"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="contactPhone">شماره تماس</Label>
              <Input
                id="contactPhone"
                value={form.contactPhone}
                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                placeholder="09..."
                className="mt-1"
                dir="ltr"
              />
            </div>

            <div>
              <Label htmlFor="address">آدرس</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="آدرس محل کسب‌وکار"
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
              قبلی
            </Button>
            <Button
              className="flex-1"
              disabled={!form.name.trim() || !form.slug.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? <Loader2 className="size-4 animate-spin me-2" /> : null}
              ایجاد فروشگاه
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ShopDashboard({ shop }: { shop: ShopData }) {
  const qc = useQueryClient();
  const { uploadFile } = useUploadManager();

  const verificationsQuery = useQuery({
    queryKey: ['my-verifications'],
    queryFn: async () => {
      const r = await apiClient.get<VerificationStatus[]>('/verifications/status');
      return r.data ?? [];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async ({ type, documentKeys }: { type: string; documentKeys?: string[] }) => {
      const r = await apiClient.post('/verifications/submit', {
        type,
        documents: documentKeys?.length ? documentKeys : undefined,
      });
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('درخواست ارسال شد');
      qc.invalidateQueries({ queryKey: ['my-verifications'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const [uploadingType, setUploadingType] = useState<string | null>(null);

  const handleDocumentUpload = async (type: string, file: File) => {
    setUploadingType(type);
    try {
      const presign = await apiClient.post<{ uploadUrl: string; key: string; publicUrl: string }>(
        '/media/presign',
        { folder: 'temp', fileName: file.name, contentType: file.type },
      );
      if (!presign.success || !presign.data) {
        toast.error('خطا در دریافت لینک آپلود');
        return;
      }
      await uploadFile({
        label: file.name,
        url: presign.data.uploadUrl,
        file,
        contentType: file.type,
      });
      await apiClient.post('/media/confirm', { key: presign.data.key });
      await submitMutation.mutateAsync({ type, documentKeys: [presign.data.key] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploadingType(null);
    }
  };

  const verificationMap = new Map((verificationsQuery.data ?? []).map((v) => [v.type, v.status]));
  const approvedCount = (verificationsQuery.data ?? []).filter(
    (v) => v.status === 'APPROVED',
  ).length;
  const totalTypes = VERIFICATION_TYPES.length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{shop.name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">@{shop.slug}</p>
        </div>
        <Badge tone="brand" size="sm">
          {SHOP_TYPE_LABELS[shop.shopType as ShopTypeKey] ?? shop.shopType}
        </Badge>
      </div>

      <Card>
        <CardContent className="!p-4">
          <TrustScoreBar score={shop.trustScore} tier={shop.trustTier as TrustTierValue} />
        </CardContent>
      </Card>

      {/* Verification progress tracker */}
      <div className="rounded-xl border border-border bg-surface-elevated p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">پیشرفت احراز هویت</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatPersianNumber(approvedCount)} از {formatPersianNumber(totalTypes)} تایید
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${totalTypes > 0 ? (approvedCount / totalTypes) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">مرکز تأییدیه</h3>
        <p className="text-sm text-muted-foreground mb-4">
          با تأیید هویت و مدارک کسب‌وکار، امتیاز اعتماد فروشگاهتان را افزایش دهید
        </p>
        <div className="space-y-2">
          {verificationsQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-5" />
            </div>
          ) : (
            VERIFICATION_TYPES.map((type) => {
              const status = (verificationMap.get(type) as VerificationStatusValue) ?? null;
              return (
                <VerificationCard
                  key={type}
                  type={type}
                  status={status}
                  onSubmit={() => submitMutation.mutate({ type })}
                  onUpload={(file) => {
                    void handleDocumentUpload(type, file);
                  }}
                  isUploading={uploadingType === type}
                  isLoading={submitMutation.isPending && submitMutation.variables?.type === type}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function ShopSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();

  const shopQuery = useQuery({
    queryKey: ['my-shop'],
    queryFn: async () => {
      const r = await apiClient.get<ShopData>('/shops/me', undefined, { silent401: true });
      if (!r.success) return null;
      return r.data ?? null;
    },
    enabled: !!user,
  });

  const handleShopCreated = () => {
    qc.invalidateQueries({ queryKey: ['my-shop'] });
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <p className="text-center text-muted-foreground">برای ادامه وارد شوید</p>
      </div>
    );
  }

  if (shopQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-7" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <IconButton
          aria-label="بازگشت"
          icon={<IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} aria-hidden />}
          variant="ghost"
          onClick={() => router.back()}
        />
        <div>
          <h1 className="text-xl font-bold">فروشگاه من</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {shopQuery.data ? 'مدیریت فروشگاه و تأییدیه‌ها' : 'فروشگاه جدید ایجاد کنید'}
          </p>
        </div>
      </div>

      {shopQuery.data ? (
        <ShopDashboard shop={shopQuery.data} />
      ) : (
        <ShopCreationWizard onCreated={handleShopCreated} />
      )}
    </div>
  );
}
