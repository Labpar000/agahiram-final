import { cn } from '../../lib/utils';

export type VerificationTypeValue =
  | 'PHONE'
  | 'NATIONAL_ID'
  | 'BUSINESS_LICENSE'
  | 'COMPANY_REG'
  | 'ENAMAD'
  | 'ADDRESS'
  | 'BANK_ACCOUNT';

export type VerificationStatusValue = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | null;

const TYPE_CONFIG: Record<
  VerificationTypeValue,
  { fa: string; description: string; score: number; icon: string }
> = {
  PHONE: { fa: 'موبایل', description: 'تأیید شماره موبایل', score: 100, icon: '📱' },
  NATIONAL_ID: { fa: 'کد ملی', description: 'تأیید هویت با کد ملی', score: 150, icon: '🪪' },
  BUSINESS_LICENSE: { fa: 'جواز کسب', description: 'تأیید جواز کسب رسمی', score: 250, icon: '📋' },
  COMPANY_REG: { fa: 'ثبت شرکت', description: 'تأیید ثبت رسمی شرکت', score: 300, icon: '🏢' },
  ENAMAD: {
    fa: 'نماد اعتماد',
    description: 'دریافت نماد اعتماد الکترونیکی',
    score: 200,
    icon: '✅',
  },
  ADDRESS: { fa: 'آدرس فیزیکی', description: 'تأیید آدرس محل کسب‌وکار', score: 100, icon: '📍' },
  BANK_ACCOUNT: { fa: 'حساب بانکی', description: 'تأیید حساب بانکی', score: 100, icon: '🏦' },
};

const STATUS_CONFIG: Record<
  NonNullable<VerificationStatusValue>,
  { label: string; className: string }
> = {
  PENDING: { label: 'در انتظار بررسی', className: 'text-amber-600 bg-amber-50' },
  UNDER_REVIEW: { label: 'در حال بررسی', className: 'text-blue-600 bg-blue-50' },
  APPROVED: { label: 'تأیید شده', className: 'text-green-600 bg-green-50' },
  REJECTED: { label: 'رد شده', className: 'text-red-600 bg-red-50' },
};

export interface VerificationCardProps {
  type: VerificationTypeValue;
  status?: VerificationStatusValue;
  onSubmit?: () => void;
  onUpload?: (file: File) => void;
  isUploading?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function VerificationCard({
  type,
  status = null,
  onSubmit,
  onUpload,
  isUploading,
  isLoading,
  className,
}: VerificationCardProps) {
  const config = TYPE_CONFIG[type];
  const statusConfig = status ? STATUS_CONFIG[status] : null;
  const isApproved = status === 'APPROVED';
  const isPending = status === 'PENDING' || status === 'UNDER_REVIEW';
  const needsDocument =
    type === 'NATIONAL_ID' ||
    type === 'BUSINESS_LICENSE' ||
    type === 'COMPANY_REG' ||
    type === 'ENAMAD';

  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-xl border border-border bg-background p-4 transition-colors',
        isApproved && 'border-green-200 bg-green-50/30',
        className,
      )}
    >
      <div className="text-2xl mt-0.5 select-none" aria-hidden>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{config.fa}</span>
          <span className="text-xs text-muted-foreground rounded-full bg-muted px-2 py-0.5">
            +{config.score} امتیاز
          </span>
          {statusConfig && (
            <span
              className={cn('text-xs rounded-full px-2 py-0.5 font-medium', statusConfig.className)}
            >
              {statusConfig.label}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
        {needsDocument && !isApproved && !isPending && onUpload ? (
          <div className="mt-2">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
                e.target.value = '';
              }}
              className="text-xs"
              disabled={isUploading}
            />
            {isUploading ? (
              <span className="mt-1 block text-[10px] text-muted-foreground">
                در حال آپلود مدرک…
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {!isApproved && !isPending && !needsDocument && onSubmit && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading}
          className={cn(
            'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {isLoading ? 'در حال ارسال…' : 'ارسال درخواست'}
        </button>
      )}
      {needsDocument && !isApproved && !isPending && !onUpload && (
        <span className="shrink-0 rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">
          نیاز به مدرک
        </span>
      )}
    </div>
  );
}
