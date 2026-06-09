'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
      const r = await apiClient.post('/shops', {
        shopType: 'SHOP',
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
    <div className="max-w-lg mx-auto space-y-5">
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
          />
        </div>
        <div>
          <Label htmlFor="slug">نام کاربری فروشگاه *</Label>
          <Input
            id="slug"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))}
            placeholder="مثلاً: rezaei-store"
            dir="ltr"
          />
        </div>
        <div>
          <Label htmlFor="description">توضیحات</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="کوتاه درباره فروشگاه بنویسید…"
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="contactPhone">شماره تماس</Label>
          <Input
            id="contactPhone"
            value={form.contactPhone}
            onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
            placeholder="09..."
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
          />
        </div>
      </div>

      <Button
        className="w-full"
        disabled={!form.name.trim() || !form.slug.trim() || createMutation.isPending}
        onClick={() => createMutation.mutate()}
      >
        {createMutation.isPending ? <Loader2 className="size-4 animate-spin me-2" /> : null}
        ایجاد فروشگاه
      </Button>
    </div>
  );
}

function ShopDashboard({ shop }: { shop: ShopData }) {
  const qc = useQueryClient();
  const router = useRouter();
  const { uploadFile } = useUploadManager();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

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
        toast.error('خطا');
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

  const deleteShopMutation = useMutation({
    mutationFn: async () => {
      const r = await apiClient.delete(`/shops/${shop.id}`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('فروشگاه با موفقیت حذف شد');
      qc.invalidateQueries({ queryKey: ['my-shop'] });
      setDeleteOpen(false);
      router.refresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const verificationMap = new Map((verificationsQuery.data ?? []).map((v) => [v.type, v.status]));
  const approvedCount = (verificationsQuery.data ?? []).filter(
    (v) => v.status === 'APPROVED',
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{shop.name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">@{shop.slug}</p>
        </div>
      </div>

      <Card>
        <CardContent className="!p-4">
          <TrustScoreBar score={shop.trustScore} tier={shop.trustTier as TrustTierValue} />
        </CardContent>
      </Card>

      <div className="rounded-xl border border-border bg-surface-elevated p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">پیشرفت احراز هویت</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatPersianNumber(approvedCount)} از {formatPersianNumber(VERIFICATION_TYPES.length)}{' '}
            تایید
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{
              width: `${VERIFICATION_TYPES.length > 0 ? (approvedCount / VERIFICATION_TYPES.length) * 100 : 0}%`,
            }}
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

      {/* Delete shop */}
      <div className="border-t border-border pt-4 mt-4">
        <Button
          variant="outline"
          className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
          leftIcon={<Trash2 className="size-4" />}
          onClick={() => setDeleteOpen(true)}
        >
          حذف فروشگاه
        </Button>
        <p className="text-[11px] text-muted-foreground mt-2 text-center">
          با حذف فروشگاه، تمام آگهی‌ها و اطلاعات آن پاک می‌شود
        </p>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>حذف فروشگاه</DialogTitle>
            <DialogDescription>
              این عملیات قابل بازگشت نیست. نام فروشگاه را برای تأیید وارد کنید:
            </DialogDescription>
          </DialogHeader>
          <Input
            dir="ltr"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={shop.slug}
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteConfirm('');
              }}
            >
              انصراف
            </Button>
            <Button
              variant="destructive"
              isLoading={deleteShopMutation.isPending}
              disabled={deleteConfirm !== shop.slug}
              onClick={() => deleteShopMutation.mutate()}
            >
              حذف فروشگاه
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    <div className="bg-background min-h-svh pb-8">
      <div className="glass sticky top-[var(--header-height)] z-20 flex items-center gap-2 border-b border-border-subtle px-3 py-4">
        <IconButton
          aria-label="بازگشت"
          icon={<IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} aria-hidden />}
          variant="ghost"
          onClick={() => router.back()}
        />
        <h1 className="text-lg font-bold">فروشگاه من</h1>
      </div>
      <div className="mx-auto max-w-lg px-4 py-6">
        {shopQuery.data ? (
          <ShopDashboard shop={shopQuery.data} />
        ) : (
          <ShopCreationWizard onCreated={() => qc.invalidateQueries({ queryKey: ['my-shop'] })} />
        )}
      </div>
    </div>
  );
}
