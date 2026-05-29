# کارایی وب (آگهی‌گرام)

این سند بودجه‌ی کارایی و ابزارهای اندازه‌گیری فرانت‌اند (`apps/web`) را توضیح می‌دهد.

## بودجه‌ی Core Web Vitals (هدف ۲۰۲۶)

| متریک | هدف (Good)  | توضیح                    |
| ----- | ----------- | ------------------------ |
| LCP   | < ۲٫۵ ثانیه | بزرگ‌ترین عنصر محتوایی   |
| INP   | < ۲۰۰ms     | پاسخ‌گویی به تعامل کاربر |
| CLS   | < ۰٫۱       | جابه‌جایی ناگهانی چیدمان |
| FCP   | < ۱٫۸ ثانیه | اولین رنگ محتوایی        |
| TTFB  | < ۸۰۰ms     | زمان دریافت اولین بایت   |

این آستانه‌ها در `apps/web/src/components/web-vitals.tsx` کدگذاری شده‌اند. در حالت development هر متریک در کنسول لاگ می‌شود و اگر از بودجه عبور کند هشدار می‌دهد. در production با `navigator.sendBeacon` به `/api/v1/metrics/web-vitals` ارسال می‌شود (best-effort).

## تحلیل حجم باندل

```bash
pnpm --filter @agahiram/web analyze
```

این دستور `next build` را با `ANALYZE=true` اجرا می‌کند و گزارش `@next/bundle-analyzer` را باز می‌کند.

## بهینه‌سازی‌های اعمال‌شده

- صفحات عمومی (`feed`, `post/[id]`, `profile/[username]`) به Server Component با prefetch + `HydrationBoundary` تبدیل شدند تا HTML اولیه دارای داده باشد (lib: `server-api.ts`, `get-query-client.ts`).
- `loading.tsx` برای streaming + اسکلتون فوری.
- بهینه‌سازی تصویر Next (AVIF/WebP، `deviceSizes`/`imageSizes`) فعال شد؛ `sharp` برای محیط Alpine از طریق `.npmrc` (`supportedArchitectures`) embed می‌شود. در صورت نبود `sharp` با `IMAGE_OPTIMIZATION=off` می‌توان به passthrough برگشت.
- code-split نقشه (maplibre) با `next/dynamic` و تبدیل import آن به type-only در `lib/neshan.ts`.
- حذف `framer-motion` از مسیر بحرانی (feed/shell) و جایگزینی با انیمیشن‌های CSS سبک.
- حذف کوئری تکراری شمارنده‌ی unread با hook مشترک `useUnreadCounts`.
- «مجازی‌سازی» بدون JS با `content-visibility: auto` روی لیست‌های بلند (feed/profile/messages).
- حذف `mock-data` از باندل production (dynamic import فقط در development).
- هدر `Cache-Control: immutable` برای `/_next/static` و فونت‌ها.

## نکات

- متریک‌ها را با Lighthouse (mobile, Slow 4G) روی صفحات `feed`, `explore`, `post/[id]` بسنجید.
- پس از هر تغییر بزرگ در dependencyها، `analyze` را اجرا کنید تا رشد باندل کنترل شود.
