# وضعیت آیتم‌های پلن Instant UX — ۲۰۲۶

این سند هر آیتم لیست پلن را به فایل پیاده‌سازی متصل می‌کند.

| ID                     | آیتم                                             | وضعیت             | پیاده‌سازی                                                                                                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------ | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p1-safari-video        | ویدیو Safari — HLS بومی، playsinline، bfcache    | **انجام**         | [`video-playback.ts`](../apps/web/src/lib/video-playback.ts), [`feed-post-video.tsx`](../apps/web/src/components/feed-post-video.tsx), [`reel-player.tsx`](../apps/web/src/components/reel-player.tsx), [`story-video.tsx`](../apps/web/src/components/story-video.tsx) |
| p1-bfcache-chrome      | bfcache — بدون unload، pagehide/pageshow، socket | **انجام**         | [`navigation-lifecycle.ts`](../apps/web/src/lib/navigation-lifecycle.ts) — `pagehide` فقط وقتی `!persisted`؛ reconnect در `pageshow`                                                                                                                                    |
| p1-reels-webkit-scroll | scroll-snap ریل WebKit                           | **انجام**         | [`reels/page.tsx`](<../apps/web/src/app/(main)/reels/page.tsx>) + `.reels-scroll` در [`globals.css`](../apps/web/src/app/globals.css)                                                                                                                                   |
| p2-pwa-safari          | PWA iOS — بازیابی ویدیو، SW تازه                 | **انجام**         | [`pwa-media-resume.ts`](../apps/web/src/lib/pwa-media-resume.ts), `manifest.json` (`display: standalone`), SW `NetworkOnly` در [`next.config.mjs`](../apps/web/next.config.mjs), `refreshServiceWorker` در lifecycle                                                    |
| p2-browser-qa          | ماتریس QA ۲۰۲۶                                   | **انجام (دستی)**  | [`BROWSER-QA-2026.md`](./BROWSER-QA-2026.md) + [`scripts/qa-preflight.sh`](../scripts/qa-preflight.sh)                                                                                                                                                                  |
| p2-inp-2026            | INP — yield، debounce لایک/ذخیره                 | **انجام**         | [`inp.ts`](../apps/web/src/lib/inp.ts) — `runEngagementAction` در post-card، reel-player، comment-section                                                                                                                                                               |
| p3-next16-activity     | Next 16 + Activity                               | **برنامه‌ریزی**   | عمداً بعد از تثبیت — [`UPGRADE-NEXT16.md`](./UPGRADE-NEXT16.md). فعلاً parallel routes + TabShell                                                                                                                                                                       |
| p2-cdn-206             | CDN/API — Accept-Ranges + 206                    | **انجام (ابزار)** | [`scripts/check-media-range.sh`](../scripts/check-media-range.sh), CI با `MEDIA_RANGE_TEST_URL`, `pnpm media:range`                                                                                                                                                     |

## تست سریع قبل از deploy

```bash
pnpm qa:preflight
# با URL نمونه ویدیو:
MEDIA_RANGE_TEST_URL=https://YOUR_HOST/api/v1/media/object?key=... pnpm media:range
```

## آنچه عمداً اجرا نشده

- **ارتقای Next 16** — نیاز به شاخه جدا و QA کامل (ریسک PPR/loading).
- **Swipe gesture** بین پست‌ها — فقط ناوبری قبلی/بعدی (`PostDetailNav`) پیاده شده.
