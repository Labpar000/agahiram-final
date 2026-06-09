import { AdSlot, formatPersianNumber, formatPersianPrice } from '@agahiram/shared';
import { AD_SLOT_INFO } from '../lib/ads-utils';

const EXAMPLE_BUDGET = 100_000;
const EXAMPLE_BID_CPM = 5_000;

export function AdsPricingCards() {
  const estImpressions = Math.floor((EXAMPLE_BUDGET / EXAMPLE_BID_CPM) * 1000);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold">جایگاه‌های تبلیغاتی</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {[AdSlot.EXPLORE_FEED, AdSlot.STORY, AdSlot.BANNER].map((slot) => {
          const info = AD_SLOT_INFO[slot];
          return (
            <div key={slot} className="rounded-xl border border-border bg-surface p-4 space-y-2">
              <h3 className="font-semibold">{info.label}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{info.description}</p>
              <p className="text-[11px] text-muted-foreground">نسبت تصویر: {info.aspectRatio}</p>
            </div>
          );
        })}
      </div>
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 text-sm">
        <h3 className="font-semibold">CPM vs CPC</h3>
        <p className="text-muted-foreground text-xs leading-relaxed">
          <strong>CPM</strong> — پرداخت به ازای هر ۱٬۰۰۰ نمایش. مناسب برای آگاهی از برند.
        </p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          <strong>CPC</strong> — پرداخت به ازای هر کلیک. مناسب وقتی هدف ترافیک به سایت یا صفحه فروش
          است.
        </p>
        <p className="text-muted-foreground text-xs">
          مثال CPM: بودجه {formatPersianPrice(EXAMPLE_BUDGET)} تومان با bid{' '}
          {formatPersianPrice(EXAMPLE_BID_CPM)} تومان ≈ {formatPersianNumber(estImpressions)} نمایش
        </p>
        <p className="text-muted-foreground text-xs">حداقل بودجه کمپین: ۱۰٬۰۰۰ تومان</p>
      </div>
    </section>
  );
}

const FAQ = [
  {
    q: 'بررسی تبلیغ چقدر طول می‌کشد؟',
    a: 'معمولاً ظرف ۲۴ ساعت کاری. پس از تأیید، تبلیغ در کمپین فعال نمایش داده می‌شود.',
  },
  {
    q: 'حداقل بودجه چقدر است؟',
    a: 'حداقل بودجه هر کمپین ۱۰٬۰۰۰ تومان است.',
  },
  {
    q: 'چه محتوایی مجاز نیست؟',
    a: 'محتوای گمراه‌کننده، نامناسب، اسپم یا مغایر با قوانین پلتفرم رد می‌شود.',
  },
];

export function AdsFaq() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">سوالات متداول</h2>
      <div className="space-y-2">
        {FAQ.map((item) => (
          <details key={item.q} className="rounded-xl border border-border bg-surface px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">{item.q}</summary>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
