'use client';

import * as React from 'react';
import { Trash2 } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@agahiram/ui';

const DELETE_REASONS = [
  { value: 'sold', label: 'فروخته شد' },
  { value: 'changed_mind', label: 'انصراف از فروش' },
  { value: 'incorrect_info', label: 'اطلاعات اشتباه' },
  { value: 'new_ad', label: 'ایجاد آگهی جدید' },
  { value: 'other', label: 'سایر موارد' },
] as const;

export type DeleteReason = (typeof DELETE_REASONS)[number]['value'];

export function DeleteReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: DeleteReason) => void;
  isLoading?: boolean;
}) {
  const [selected, setSelected] = React.useState<DeleteReason | null>(null);

  React.useEffect(() => {
    if (open) setSelected(null);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>دلیل حذف آگهی</DialogTitle>
          <DialogDescription>لطفاً دلیل حذف این آگهی را انتخاب کنید.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {DELETE_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setSelected(r.value)}
              className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                selected === r.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  selected === r.value ? 'border-primary' : 'border-muted-foreground/30'
                }`}
              >
                {selected === r.value ? (
                  <span className="size-2.5 rounded-full bg-primary" />
                ) : null}
              </span>
              {r.label}
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
            انصراف
          </Button>
          <Button
            variant="destructive"
            leftIcon={<Trash2 className="size-4" />}
            isLoading={isLoading}
            disabled={!selected}
            onClick={() => selected && onConfirm(selected)}
          >
            حذف آگهی
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
