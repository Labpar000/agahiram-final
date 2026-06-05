'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Folder, Pencil, Plus, Trash2, X } from 'lucide-react';
import { cn, formatPersianNumber } from '@agahiram/shared';
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
  EmptyState,
  ErrorState,
  IconButton,
  Input,
  Label,
  Switch,
  toast,
} from '@agahiram/ui';
import Shell from '../layout-shell';
import { PageHeader } from '@/components/page-header';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { apiClient } from '@/lib/api';

interface Attribute {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'bool';
  options: string[];
  required: boolean;
  order: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  icon: string | null;
  order: number;
  attributes: Attribute[];
  _count: { posts: number };
}

interface CategoryFormState {
  id?: string;
  name: string;
  slug: string;
  parentId: string | null;
  icon: string;
  order: number;
}

interface AttributeFormState {
  id?: string;
  categoryId: string;
  key: string;
  label: string;
  type: Attribute['type'];
  options: string;
  required: boolean;
  order: number;
}

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [catForm, setCatForm] = useState<CategoryFormState | null>(null);
  const [attrForm, setAttrForm] = useState<AttributeFormState | null>(null);
  const [delCat, setDelCat] = useState<Category | null>(null);
  const [delAttr, setDelAttr] = useState<{ id: string; label: string } | null>(null);

  const list = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => (await apiClient.get<Category[]>('/admin/categories')).data ?? [],
  });

  const tree = useMemo(() => {
    const all = list.data ?? [];
    const byParent = new Map<string | null, Category[]>();
    for (const c of all) {
      const k = c.parentId;
      if (!byParent.has(k)) byParent.set(k, []);
      byParent.get(k)!.push(c);
    }
    return byParent;
  }, [list.data]);

  const saveCat = useMutation({
    mutationFn: async (f: CategoryFormState) => {
      const body = {
        name: f.name.trim(),
        slug: f.slug.trim(),
        parentId: f.parentId,
        icon: f.icon.trim() || null,
        order: f.order,
      };
      const r = f.id
        ? await apiClient.patch(`/admin/categories/${f.id}`, body)
        : await apiClient.post('/admin/categories', body);
      if (!r.success) throw new Error(r.error ?? 'خطا');
      return r;
    },
    onSuccess: () => {
      toast.success('ذخیره شد');
      setCatForm(null);
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const removeCat = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.delete(`/admin/categories/${id}`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('دسته حذف شد');
      setDelCat(null);
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const saveAttr = useMutation({
    mutationFn: async (f: AttributeFormState) => {
      const body = {
        key: f.key.trim(),
        label: f.label.trim(),
        type: f.type,
        options: f.options
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        required: f.required,
        order: f.order,
      };
      const r = f.id
        ? await apiClient.patch(`/admin/attributes/${f.id}`, body)
        : await apiClient.post(`/admin/categories/${f.categoryId}/attributes`, body);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('ویژگی ذخیره شد');
      setAttrForm(null);
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const removeAttr = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiClient.delete(`/admin/attributes/${id}`);
      if (!r.success) throw new Error(r.error ?? 'خطا');
    },
    onSuccess: () => {
      toast.success('ویژگی حذف شد');
      setDelAttr(null);
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderCat = (cat: Category, depth: number) => {
    const children = tree.get(cat.id) ?? [];
    const isOpen = expanded.has(cat.id);
    const hasChildren = children.length > 0 || cat.attributes.length > 0;
    return (
      <div key={cat.id}>
        <div
          className={cn(
            'group flex items-center gap-2 rounded-lg border border-border bg-surface p-3',
            depth === 0 && 'bg-muted/30',
          )}
          style={{ marginInlineStart: depth * 24 }}
        >
          <IconButton
            aria-label={isOpen ? 'بستن' : 'باز کردن'}
            size="sm"
            variant="ghost"
            icon={
              hasChildren ? (
                isOpen ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )
              ) : (
                <Folder className="size-4 opacity-40" />
              )
            }
            onClick={() => toggleExpand(cat.id)}
            disabled={!hasChildren}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sm">{cat.name}</span>
              <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">
                {cat.slug}
              </code>
              {cat._count.posts > 0 ? (
                <Badge tone="neutral" size="sm">
                  {formatPersianNumber(cat._count.posts)} آگهی
                </Badge>
              ) : null}
              {cat.attributes.length > 0 ? (
                <Badge tone="brand" size="sm">
                  {formatPersianNumber(cat.attributes.length)} ویژگی
                </Badge>
              ) : null}
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Plus className="size-3.5" />}
            onClick={() =>
              setCatForm({
                parentId: cat.id,
                name: '',
                slug: '',
                icon: '',
                order: 0,
              })
            }
          >
            زیردسته
          </Button>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Plus className="size-3.5" />}
            onClick={() =>
              setAttrForm({
                categoryId: cat.id,
                key: '',
                label: '',
                type: 'text',
                options: '',
                required: false,
                order: cat.attributes.length,
              })
            }
          >
            ویژگی
          </Button>
          <IconButton
            aria-label="ویرایش"
            size="sm"
            variant="ghost"
            icon={<Pencil className="size-4" />}
            onClick={() =>
              setCatForm({
                id: cat.id,
                parentId: cat.parentId,
                name: cat.name,
                slug: cat.slug,
                icon: cat.icon ?? '',
                order: cat.order,
              })
            }
          />
          <IconButton
            aria-label="حذف"
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10"
            icon={<Trash2 className="size-4" />}
            onClick={() => setDelCat(cat)}
          />
        </div>

        {isOpen ? (
          <div className="space-y-1 mt-1">
            {cat.attributes.length > 0 ? (
              <div className="space-y-1" style={{ marginInlineStart: (depth + 1) * 24 }}>
                {cat.attributes.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-xs"
                  >
                    <span className="grid size-6 place-items-center rounded bg-accent/40 text-[10px] font-semibold uppercase">
                      {a.type.slice(0, 2)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{a.label}</span>
                      <span className="ms-2 text-muted-foreground">{a.key}</span>
                      {a.required ? (
                        <Badge tone="warning" size="sm" className="ms-2">
                          الزامی
                        </Badge>
                      ) : null}
                    </div>
                    <IconButton
                      aria-label="ویرایش ویژگی"
                      size="sm"
                      variant="ghost"
                      icon={<Pencil className="size-3.5" />}
                      onClick={() =>
                        setAttrForm({
                          id: a.id,
                          categoryId: cat.id,
                          key: a.key,
                          label: a.label,
                          type: a.type,
                          options: a.options.join(', '),
                          required: a.required,
                          order: a.order,
                        })
                      }
                    />
                    <IconButton
                      aria-label="حذف ویژگی"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      icon={<Trash2 className="size-3.5" />}
                      onClick={() => setDelAttr({ id: a.id, label: a.label })}
                    />
                  </div>
                ))}
              </div>
            ) : null}
            {children.map((child) => renderCat(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <Shell adminOnly>
      <PageHeader
        title="دسته‌بندی‌ها"
        description="مدیریت سلسله‌مراتب دسته‌ها و ویژگی‌های اختصاصی هر دسته"
        actions={
          <Button
            variant="brand"
            leftIcon={<Plus className="size-4" />}
            onClick={() => setCatForm({ parentId: null, name: '', slug: '', icon: '', order: 0 })}
          >
            دسته‌ی جدید
          </Button>
        }
      />

      <Card>
        <CardContent className="!p-4 space-y-1">
          {list.isError ? (
            <ErrorState onRetry={() => void list.refetch()} />
          ) : list.isLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">در حال بارگذاری…</div>
          ) : (tree.get(null) ?? []).length === 0 ? (
            <EmptyState
              icon={<Folder className="size-7" />}
              title="هیچ دسته‌ای ثبت نشده"
              description="با کلیک روی «دسته‌ی جدید» شروع کنید."
            />
          ) : (
            (tree.get(null) ?? []).map((c) => renderCat(c, 0))
          )}
        </CardContent>
      </Card>

      {/* Category form dialog */}
      <Dialog open={!!catForm} onOpenChange={(o) => !o && setCatForm(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{catForm?.id ? 'ویرایش دسته' : 'دسته‌ی جدید'}</DialogTitle>
            {catForm && !catForm.id && catForm.parentId ? (
              <DialogDescription>زیر‌دسته‌ی جدید</DialogDescription>
            ) : null}
          </DialogHeader>
          {catForm ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="cat-name" required>
                  نام
                </Label>
                <Input
                  id="cat-name"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="cat-slug" required>
                  Slug (انگلیسی)
                </Label>
                <Input
                  id="cat-slug"
                  dir="ltr"
                  value={catForm.slug}
                  onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cat-icon">آیکن (lucide name)</Label>
                  <Input
                    id="cat-icon"
                    dir="ltr"
                    value={catForm.icon}
                    onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cat-order">ترتیب</Label>
                  <Input
                    id="cat-order"
                    type="number"
                    value={catForm.order}
                    onChange={(e) => setCatForm({ ...catForm, order: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCatForm(null)}>
              انصراف
            </Button>
            <Button
              variant="brand"
              isLoading={saveCat.isPending}
              onClick={() => catForm && saveCat.mutate(catForm)}
              disabled={!catForm?.name || !catForm?.slug}
            >
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attribute form */}
      <Dialog open={!!attrForm} onOpenChange={(o) => !o && setAttrForm(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{attrForm?.id ? 'ویرایش ویژگی' : 'ویژگی جدید'}</DialogTitle>
          </DialogHeader>
          {attrForm ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="attr-label" required>
                    عنوان نمایشی
                  </Label>
                  <Input
                    id="attr-label"
                    value={attrForm.label}
                    onChange={(e) => setAttrForm({ ...attrForm, label: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="attr-key" required>
                    کلید
                  </Label>
                  <Input
                    id="attr-key"
                    dir="ltr"
                    value={attrForm.key}
                    onChange={(e) => setAttrForm({ ...attrForm, key: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="attr-type" required>
                    نوع
                  </Label>
                  <select
                    id="attr-type"
                    className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={attrForm.type}
                    onChange={(e) =>
                      setAttrForm({ ...attrForm, type: e.target.value as Attribute['type'] })
                    }
                  >
                    <option value="text">متن</option>
                    <option value="number">عدد</option>
                    <option value="select">انتخابی</option>
                    <option value="bool">بله/خیر</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="attr-order">ترتیب</Label>
                  <Input
                    id="attr-order"
                    type="number"
                    value={attrForm.order}
                    onChange={(e) => setAttrForm({ ...attrForm, order: Number(e.target.value) })}
                  />
                </div>
              </div>
              {attrForm.type === 'select' ? (
                <div>
                  <Label htmlFor="attr-options">گزینه‌ها (با ویرگول جدا کنید)</Label>
                  <Input
                    id="attr-options"
                    value={attrForm.options}
                    onChange={(e) => setAttrForm({ ...attrForm, options: e.target.value })}
                    placeholder="آبی, قرمز, سبز"
                  />
                </div>
              ) : null}
              <label className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <span className="text-sm">پاسخ این ویژگی اجباری باشد</span>
                <Switch
                  checked={attrForm.required}
                  onCheckedChange={(v) => setAttrForm({ ...attrForm, required: v })}
                />
              </label>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAttrForm(null)}>
              <X className="size-4" /> انصراف
            </Button>
            <Button
              variant="brand"
              isLoading={saveAttr.isPending}
              onClick={() => attrForm && saveAttr.mutate(attrForm)}
              disabled={!attrForm?.label || !attrForm?.key}
            >
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!delCat}
        onOpenChange={(o) => !o && setDelCat(null)}
        title="حذف دسته"
        description={delCat ? `دسته «${delCat.name}» حذف شود؟` : null}
        confirmLabel="حذف"
        tone="destructive"
        isLoading={removeCat.isPending}
        onConfirm={() => delCat && removeCat.mutate(delCat.id)}
      />

      <ConfirmDialog
        open={!!delAttr}
        onOpenChange={(o) => !o && setDelAttr(null)}
        title="حذف ویژگی"
        description={delAttr ? `ویژگی «${delAttr.label}» حذف شود؟` : null}
        confirmLabel="حذف"
        tone="destructive"
        isLoading={removeAttr.isPending}
        onConfirm={() => delAttr && removeAttr.mutate(delAttr.id)}
      />
    </Shell>
  );
}
