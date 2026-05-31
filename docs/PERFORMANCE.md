# کارایی وب (آگهی‌گرام) — ۲۰۲۶

## بودجه Core Web Vitals

| متریک | Good    | پیاده‌سازی                                                                   |
| ----- | ------- | ---------------------------------------------------------------------------- |
| LCP   | < 2.5s  | `next/image`، اولویت کارت اول فید                                            |
| INP   | < 200ms | `scheduleEngagement` (`scheduler.yield` + `startTransition`)؛ کش React Query |
| CLS   | < 0.1   | ابعاد رسانه در PostCard                                                      |
| FCP   | < 1.8s  | client-first تب‌ها                                                           |
| TTFB  | < 800ms | سرور ایران                                                                   |

لاگ توسعه و beacon تولید: [`apps/web/src/components/web-vitals.tsx`](../apps/web/src/components/web-vitals.tsx).  
اندازه‌گیری تعویض تب: `performance.measure('tab-switch')` در [`bottom-nav.tsx`](../apps/web/src/components/bottom-nav.tsx).

## معماری داده (client-first)

- تب‌های اصلی: **parallel routes** + [`TabShell`](../apps/web/src/components/tab-shell.tsx) — state و scroll حفظ می‌شود.
- React Query: `staleTime` ۵ دقیقه، `refetchOnMount: false` در [`providers.tsx`](../apps/web/src/components/providers.tsx).
- Engagement: [`useSavePost` / `useLikePost`](../apps/web/src/hooks/usePosts.ts) با `cancelQueries` + `setQueryData` — [`query-cache-posts.ts`](../apps/web/src/lib/query-cache-posts.ts).
- پیش‌بارگذاری پست: [`PostLink`](../apps/web/src/components/post-link.tsx) + `placeholderData` در جزئیات پست.
- پیش‌بار تب‌ها: [`tab-prefetch.ts`](../apps/web/src/lib/tab-prefetch.ts) روی hover در [`bottom-nav.tsx`](../apps/web/src/components/bottom-nav.tsx).
- پیمایش پست در فید: [`PostDetailNav`](../apps/web/src/components/post-detail-nav.tsx) (قبلی/بعدی از کش).

## ویدیو و Safari / Chrome

- [`video-playback.ts`](../apps/web/src/lib/video-playback.ts): HLS بومی WebKit، hls.js فقط در غیر Safari.
- ریل‌ها: فقط ±۱ اسلاید mount؛ `snap-proximity` و `overscroll-y-contain`.
- bfcache: [`navigation-lifecycle.ts`](../apps/web/src/lib/navigation-lifecycle.ts) — `pagehide`/`pageshow` برای socket.
- PWA: API و ویدیو در Service Worker با `NetworkOnly` — [`next.config.mjs`](../apps/web/next.config.mjs).

## CDN و HTTP 206

iOS **الزاماً** به Range/206 برای ویدیو نیاز دارد. تست:

```bash
./scripts/check-media-range.sh https://YOUR_API_HOST/api/v1/media/object?key=...
```

## ارتقای آینده

مسیر رسمی Next 16 + `cacheComponents` + React Activity: [`docs/UPGRADE-NEXT16.md`](./UPGRADE-NEXT16.md).

## تست مرورگر

چک‌لیست QA: [`BROWSER-QA-2026.md`](./BROWSER-QA-2026.md). وضعیت ۱۸ مورد: [`PLAN-18-ITEMS.md`](./PLAN-18-ITEMS.md).

```bash
pnpm --filter @agahiram/web analyze
pnpm --filter @agahiram/web lint
```
