const STEPS = [
  {
    title: 'ایجاد کمپین',
    desc: 'بودجه، نوع قیمت‌گذاری (CPM/CPC) و بازه زمانی را مشخص کنید.',
  },
  {
    title: 'آپلود creative',
    desc: 'تصویر تبلیغ، عنوان و لینک مقصد را برای هر جایگاه بارگذاری کنید.',
  },
  {
    title: 'بررسی تیم',
    desc: 'تبلیغ شما توسط تیم ما بررسی و در صورت تأیید آماده نمایش می‌شود.',
  },
  {
    title: 'نمایش و پرداخت',
    desc: 'هزینه از کیف پول شما کسر می‌شود — فقط به ازای نمایش یا کلیک.',
  },
];

export function AdsHowItWorks() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold">چطور کار می‌کند؟</h2>
      <ol className="grid gap-3 sm:grid-cols-2">
        {STEPS.map((step, i) => (
          <li key={step.title} className="rounded-xl border border-border bg-surface p-4 space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-sm font-bold">
                {i + 1}
              </span>
              <h3 className="font-semibold text-sm">{step.title}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed ps-9">{step.desc}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
