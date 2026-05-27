'use client';

import * as React from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@agahiram/ui';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Visual tone of confirm action — destructive shows red button. */
  tone?: 'primary' | 'destructive' | 'brand';
  /** Show a reason textarea (e.g. for reject). Return value passed to onConfirm. */
  reasonLabel?: string;
  reasonPlaceholder?: string;
  reasonRequired?: boolean;
  isLoading?: boolean;
  onConfirm: (reason?: string) => unknown;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'تأیید',
  cancelLabel = 'انصراف',
  tone = 'primary',
  reasonLabel,
  reasonPlaceholder,
  reasonRequired,
  isLoading,
  onConfirm,
}: ConfirmDialogProps) {
  const [reason, setReason] = React.useState('');
  React.useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const disabled = isLoading || (reasonRequired && !reason.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {reasonLabel ? (
          <div className="space-y-2">
            <Label htmlFor="confirm-reason" required={reasonRequired}>
              {reasonLabel}
            </Label>
            <Textarea
              id="confirm-reason"
              autoGrow
              value={reason}
              placeholder={reasonPlaceholder}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={
              tone === 'destructive' ? 'destructive' : tone === 'brand' ? 'brand' : 'primary'
            }
            isLoading={isLoading}
            disabled={disabled}
            onClick={() => onConfirm(reason.trim() || undefined)}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
