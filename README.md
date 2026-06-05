# آگهی‌گرام (Agahiram)

[![CI](https://github.com/Labpar000/agahiram/actions/workflows/ci.yml/badge.svg)](https://github.com/Labpar000/agahiram/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**ترکیب اینستاگرام و دیوار** - یک پلتفرم وب/PWA که هر پست در آن یک آگهی است، اما UX کاملاً اینستاگرامی (فید عمودی، استوری، ریلز، لایک/کامنت/فالو/DM).

## ویژگی‌های فاز ۱ (MVP)

- ورود با شماره موبایل + OTP (Kavenegar)
- پروفایل کاربری و اکانت فروشگاهی (Business)
- ویزارد ۵ مرحله‌ای ایجاد آگهی (رسانه، دسته، مشخصات، قیمت، موقعیت)
- آپلود مستقیم تصویر/ویدیو به MinIO (self-hosted) با presigned URL
- پردازش ویدیو در background با FFmpeg (HLS adaptive streaming)
- فید عمودی استایل اینستاگرام
- صفحه Explore با grid 3 ستونه و جستجوی فارسی MeiliSearch
- فیلتر چند بُعدی (دسته، شهر، قیمت، مرتب‌سازی)
- لایک، کامنت، ذخیره، فالو، اعلان real-time (Socket.IO)
- استوری ۲۴ ساعته با expire خودکار + Highlights
- ریلز (ویدیو عمودی) با autoplay
- دایرکت مسیج (DM)
- پرداخت ZarinPal برای نردبان آگهی + اکانت بیزنسی + کیف پول
- پنل ادمین کامل (تأیید آگهی، مدیریت کاربران، گزارش‌ها، آمار)
- PWA - نصب روی هوم اسکرین + offline

## ساختار پروژه

```
agahiram/
├── apps/
│   ├── web/              # Next.js 15 PWA - کاربر نهایی
│   ├── admin/            # Next.js پنل ادمین
│   └── api/              # NestJS API + WebSocket
├── packages/
│   ├── database/         # Prisma schema + seed
│   ├── shared/           # types, zod schemas, constants
│   ├── ui/               # shadcn/ui components
│   └── config/           # eslint, tsconfig, tailwind
├── workers/
│   └── media-processor/  # BullMQ worker (FFmpeg, Sharp, MeiliSearch)
├── docker/
│   ├── docker-compose.yml         # برای local dev
│   ├── docker-compose.prod.yml    # برای production
│   ├── Dockerfile.{api,web,admin,worker}
│   └── Caddyfile
├── scripts/
│   ├── deploy.sh         # دیپلوی صفر تا صد
│   ├── update.sh         # به‌روزرسانی سریع
│   └── backup.sh         # پشتیبان‌گیری روزانه
└── docs/
    ├── SERVER.md         # IP، کاربر، رمز، deploy
    └── setup.md          # راهنمای کامل راه‌اندازی
```

## شروع development محلی

نیازمندی‌ها: Node.js 22+, pnpm 9+, Docker Desktop

```bash
# نصب dependencies
pnpm install

# بالا آوردن Postgres + Redis + MeiliSearch
cd docker && docker compose up -d && cd ..

# تنظیم env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# generate Prisma client و migration
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# اجرای همه برنامه‌ها (web + api + admin + worker)
pnpm dev
```

سپس باز کن:

- وب (Vite dev): http://localhost:5173
- ادمین: http://localhost:3001
- API: http://localhost:4000/api/v1

در حالت dev:

- OTP در کنسول API چاپ می‌شود (به جای ارسال SMS واقعی)
- ZarinPal روی sandbox است (پرداخت‌ها فیک می‌شوند)

## دیپلوی production

**روش استاندارد:** push به `main` → CI موفق → GitHub Actions **Deploy Production** خودکار.

راه‌اندازی یک‌بار: [`scripts/bootstrap-github-deploy.ps1`](scripts/bootstrap-github-deploy.ps1)

مستندات: [`docs/CI_CD.md`](docs/CI_CD.md) | سرور: [`docs/SERVER.md`](docs/SERVER.md)

**Fallback محلی:**

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-bridge.ps1
```

## Git و مشارکت

این پروژه با GitHub Actions، branch protection، PR template، issue templates، Dependabot، labeler و Conventional Commits آماده شده است.

- راهنمای Git: [`docs/GIT_WORKFLOW.md`](docs/GIT_WORKFLOW.md)
- راهنمای CI/CD: [`docs/CI_CD.md`](docs/CI_CD.md)
- راهنمای مشارکت: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- گزارش امنیتی: [`SECURITY.md`](SECURITY.md)

برای شروع یک کار جدید:

```bash
git checkout main
git pull --rebase origin main
git checkout -b feat/my-feature
```

قبل از باز کردن PR:

```bash
pnpm format:check
pnpm lint
pnpm build
```

## تکنولوژی‌ها

**Backend:** NestJS 11 + Fastify + Prisma + PostgreSQL + Redis + BullMQ + Socket.IO + MeiliSearch + MinIO + Sharp + FFmpeg

**Frontend:** Next.js 15 (App Router + RSC) + React 19 + TailwindCSS 4 + TanStack Query + Zustand + next-pwa + Vazirmatn font

**زیرساخت:** VPS (`45.144.18.86`) + MinIO object storage + Caddy + Kavenegar SMS + ZarinPal Gateway + Neshan Maps

## فازهای بعدی

- **Phase 3:** LiveKit live streaming + AI category suggestion + Capacitor native wrapper + رتبه‌بندی فروشنده

## License

MIT
