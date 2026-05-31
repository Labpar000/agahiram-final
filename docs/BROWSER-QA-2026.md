# ماتریس QA مرورگر — ۲۰۲۶

**خودکار قبل از deploy:** `pnpm qa:preflight` (lint + build + اختیاری 206 با `MEDIA_RANGE_TEST_URL`).  
**وضعیت آیتم‌های پلن:** [`PLAN-2026-STATUS.md`](./PLAN-2026-STATUS.md).

قبل از هر deploy تولید، این سناریوها روی **Safari iOS 18+**، **Safari macOS**، **Chrome Android ۱۳۰+**، **Chrome Desktop** و در صورت امکان **PWA (Add to Home Screen)** بررسی شوند.

## تعویض تب (هدف: < 100ms perceptual)

| سناریو                                      | انتظار                                 |
| ------------------------------------------- | -------------------------------------- |
| feed → explore → reels → messages → profile | بدون اسکلتون تمام‌صفحه؛ scroll حفظ شود |
| بازگشت به feed                              | همان موقعیت scroll                     |

## داده و engagement

| سناریو                             | انتظار                               |
| ---------------------------------- | ------------------------------------ |
| bookmark از فید → تب saved پروفایل | آیتم **بدون refresh** دیده شود       |
| لایک/ذخیره                         | بدون پرش layout؛ شمارنده درست        |
| ایجاد آگهی                         | فید/پروفایل پس از publish به‌روز شود |

## پست و رسانه

| سناریو             | انتظار                                            |
| ------------------ | ------------------------------------------------- |
| کلیک پست از فید    | بدون `LoadingState` تمام‌صفحه (placeholder از کش) |
| ریل: ۱۰ swipe      | بدون freeze؛ فقط ریل فعال play                    |
| back از پست به فید | سریع (bfcache یا کش)                              |

## PWA / iOS

| سناریو                   | انتظار                           |
| ------------------------ | -------------------------------- |
| بستن کامل PWA و باز کردن | اولین ریل play بدون refresh دستی |
| ویدیو بعد از background  | resume یا `load()` موفق          |

## ابزار

- Safari Web Inspector (USB)
- Chrome DevTools → Application → **Test back/forward cache**
- Lighthouse Mobile (Slow 4G) روی `/feed`, `/post/[id]`, `/reels`
