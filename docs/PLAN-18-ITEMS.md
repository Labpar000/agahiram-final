# وضعیت ۱۸ مورد فهرست پلن (A–F)

| #   | ID    | وضعیت | فایل‌های کلیدی                                                   |
| --- | ----- | ----- | ---------------------------------------------------------------- |
| 1   | A1    | ✅    | `tab-shell.tsx`, `page-transition.tsx` (key پایدار تب‌ها)        |
| 2   | A2    | ✅    | `tab-loading.tsx`, `*/loading.tsx` مینیمال، `isLoading && !data` |
| 3   | A3    | ✅    | `post-link.tsx`, `bottom-nav.tsx`, `tab-prefetch.ts`             |
| 4   | A4    | ✅    | `bottom-nav.tsx` → `/profile/:username`, `profile/page.tsx`      |
| 5   | A5    | ✅    | `providers.tsx`, `usePosts.ts` (setQueryData)                    |
| 6   | B1    | ✅    | `useSavePost`, `query-cache-posts.ts`                            |
| 7   | B2    | ✅    | کش feed + props در `post-card.tsx`                               |
| 8   | B3    | ✅    | `useLikePost` بدون invalidate فید                                |
| 9   | B4    | ✅    | `profile-client.tsx` invalidate `['feed']`                       |
| 10  | B5    | ✅    | `create/page.tsx` invalidate فید/پروفایل                         |
| 11  | B6    | ✅    | `post/[id]/edit/page.tsx` setQueryData + invalidate              |
| 12  | B7    | ✅    | `query-cache-comments.ts`, `comment-section.tsx` optimistic      |
| 13  | C1    | ✅    | `post/[id]/page.tsx` metadata سبک؛ `document.title` در client    |
| 14  | C2    | ✅    | `post-detail-client.tsx`, `PostLink`, placeholderData            |
| 15  | C3    | ✅    | `lazy-comments.tsx`, prefetch نظرات در `post-link.tsx`           |
| 16  | C4    | ✅    | `post-detail-swipe.tsx`, `post-detail-nav.tsx`                   |
| 17  | D1    | ✅    | `reels/page.tsx` window ±۱                                       |
| 18  | D2    | ✅    | `reel-player.tsx` — HLS فقط وقتی `active`                        |
| —   | D3    | ✅    | `post-card.tsx` — اسلاید Embla ±۱                                |
| —   | E1    | ✅    | `useConversation.ts`, `messages/[id]/page.tsx`                   |
| —   | E2    | ✅    | `unread-realtime.ts`, `notifications-socket.ts`                  |
| —   | F1    | ✅    | `explore-client.tsx` + `explore-url.ts` popstate                 |
| —   | F2    | ✅    | `useSearch.ts` → `queryKey: ['explore', …]`                      |
| —   | G1–G3 | ✅    | `PERFORMANCE.md`, `web-vitals.tsx`, `BROWSER-QA-2026.md`         |

## گروه H / I (تکمیل‌شده در همان پلن)

| ID                    | وضعیت | مرجع                                                          |
| --------------------- | ----- | ------------------------------------------------------------- |
| H1 Safari video       | ✅    | `video-playback.ts`, `feed-post-video.tsx`, `story-video.tsx` |
| H2 Reels snap         | ✅    | `globals.css` `.reels-scroll`, `reels/page.tsx`               |
| H3 bfcache            | ✅    | `navigation-lifecycle.ts`                                     |
| H4 Chrome prefetch/SW | ✅    | `next.config.mjs`, `feed-speculation.tsx`, `api.ts` no-store  |
| I1 HTTP 206           | ✅    | `scripts/check-media-range.sh`, CI, `pnpm media:range`        |
| I2 SW NetworkOnly     | ✅    | `next.config.mjs`                                             |
| I3 Next 16            | 📋    | `UPGRADE-NEXT16.md` — پس از QA (ریسک major)                   |

```bash
pnpm qa:preflight
pnpm --filter @agahiram/web lint
pnpm --filter @agahiram/web build
```

## بازبینی نهایی (یکپارچگی)

- Socket: `/messages` + `/notifications` جدا؛ listener تکراری از `messages/page` حذف شد
- bfcache ویدیو: فقط `installVideoBfcacheHandlers` (بدون سه‌بار reset)
- لایک نظر: optimistic با `nextLiked = !liked`
- Prefetch پست: `lib/prefetch-post.ts` مشترک با `PostLink`
