# ارزیابی ارتقا به Next 16 + Cache Components

**وضعیت فعلی:** Next 15.3.3، React 19.1 — keep-alive تب‌ها با parallel routes پیاده شده است.

## چرا ارتقا؟

از Next 16 با `cacheComponents: true`، مسیرها با React `<Activity mode="hidden">` پنهان می‌شوند (حد ~۳ مسیر). این جایگزین نگهداری دستی `@feed` / `@explore` … می‌شود.

مراجع:

- [Preserving UI state](https://nextjs.org/docs/app/guides/preserving-ui-state)
- [Migrating to Cache Components](https://nextjs.org/docs/app/guides/migrating-to-cache-components)
- [React 19.2 Activity](https://react.dev/blog/2025/10/01/react-19-2)

## پیش‌نیازها

1. Bump `react` / `react-dom` به **19.2+**
2. Bump `next` به **16.x**
3. `cacheComponents: true` در `next.config`
4. بازبینی فرم‌ها و dialogها (state دیگر با unmount پاک نمی‌شود — reset صریح با `useLayoutEffect`)

## ریسک

- تغییر رفتار `loading.tsx` و PPR
- نیاز به تست کامل [`BROWSER-QA-2026.md`](./BROWSER-QA-2026.md)

پیشنهاد: ارتقا در شاخه جدا پس از تثبیت تغییرات فعلی keep-alive + React Query.
