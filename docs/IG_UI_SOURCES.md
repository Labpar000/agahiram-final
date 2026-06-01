# منابع UI اینستاگرام — آگهی‌گرام

## مرجع طراحی

- [Instagram UI Kit 4.0 (Figma)](https://www.figma.com/design/QDukJIKN0YfzV1vbGvaw6Y/Instagram-UI-Kit-4-0) — fileKey `QDukJIKN0YfzV1vbGvaw6Y`؛ inventory: [`docs/figma-inventory.json`](./figma-inventory.json)
- [Instagram UI Kit 4.0 (Community mirror)](https://www.figma.com/community/file/1341818988006002653/instagram-ui-kit-4-0) — measurements، spacing، typography (CC BY 4.0؛ فقط مرجع، بدون republish asset)

## مرجع کد (MIT)

- [ganbold-adilbish/instagram-clone](https://github.com/ganbold-adilbish/instagram-clone) — SVG paths و layout spacing

## نتیجه security audit (ژانویه ۲۰۲۶)

| بررسی                      | نتیجه                                                              |
| -------------------------- | ------------------------------------------------------------------ |
| Dependencies               | `next`, `react`, `@vercel/analytics`, `@vercel/speed-insights` فقط |
| کد مخرب                    | `eval`, miner, redirect مشکوک — **یافت نشد**                       |
| API                        | Mock (`/api/auth/login` echo JSON)                                 |
| Live demo «Dangerous site» | impersonation برند Meta — **نه malware**                           |

## مجاز برای borrow

- SVG path → React در `packages/ui/src/components/ig-icons/`
- spacing/layout (story 74px، post action row، auth card 350px)
- ساختار component (بدون کپی branding)

## ممنوع

- `instagram.svg`, `instagram-logo.svg` و هر asset trademark Meta
- متن «INSTAGRAM FROM META» یا لوگوی Instagram
- `@vercel/analytics` / `@vercel/speed-insights` از repo خارجی (نیازی نیست)

## پیاده‌سازی در آگهی‌گرام

- Chrome: monochrome IG-style (`ig-icons`, glass nav)
- Content: OTP، آگهی، قیمت، تماس — logic بدون تغییر
- Brand: «آگهی‌گرام» (نه Instagram)
