# مشارکت در آگهی‌گرام

ممنون که می‌خوای در توسعه آگهی‌گرام شرکت کنی! این راهنما همه چیزی که برای شروع نیاز داری رو پوشش می‌ده.

> **English version:** This guide is in Persian. Key sections (commit format, branch naming, PR checklist) are also valid in English — see the bottom of this file for a quick English summary.

---

## فهرست

- [راه‌اندازی محیط توسعه](#راه‌اندازی-محیط-توسعه)
- [جریان کار Git](#جریان-کار-git)
- [قراردادهای نام‌گذاری برنچ](#قراردادهای-نام‌گذاری-برنچ)
- [قراردادهای Commit](#قراردادهای-commit)
- [راهنمای Pull Request](#راهنمای-pull-request)
- [استانداردهای کد](#استانداردهای-کد)
- [تست‌نویسی](#تست‌نویسی)
- [گزارش باگ و درخواست فیچر](#گزارش-باگ-و-درخواست-فیچر)

---

## راه‌اندازی محیط توسعه

### پیش‌نیازها

- **Node.js** نسخه 22 یا بالاتر (`.nvmrc` رو چک کن)
- **pnpm** نسخه 9 یا بالاتر
- **Docker Desktop** برای راه‌اندازی Postgres + Redis + MeiliSearch
- **Git** نسخه 2.40+

### مراحل

```bash
# 1) کلون پروژه
git clone git@github.com:alooche/agahiram.git
cd agahiram

# 2) نصب وابستگی‌ها
pnpm install

# 3) راه‌اندازی سرویس‌های پایه
cd docker && docker compose up -d && cd ..

# 4) تنظیم env
cp docker/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 5) دیتابیس
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 6) اجرا
pnpm dev
```

پس از اولین `pnpm install`، Husky هوک‌های pre-commit رو خودکار نصب می‌کنه.

---

## جریان کار Git

این پروژه از یک مدل **trunk-based ساده** استفاده می‌کنه:

- `main` همیشه باید قابل deploy باشه. مستقیماً push نکن.
- برای هر کار یک **feature branch** بساز که از `main` به‌روز شده.
- وقتی کار تموم شد، Pull Request باز کن. بعد از تأیید CI و review، merge می‌شه.
- هر merge به `main` به‌صورت خودکار روی production deploy می‌شه (از طریق GitHub Actions).

### الگوی تیپیک

```bash
git checkout main
git pull --rebase
git checkout -b feat/comment-reactions

# ... کار کن، کامیت کن ...

git push -u origin feat/comment-reactions
# PR باز کن روی GitHub
```

---

## قراردادهای نام‌گذاری برنچ

از این پیشوندها استفاده کن:

| پیشوند      | کاربرد                                       | مثال                               |
| ----------- | -------------------------------------------- | ---------------------------------- |
| `feat/`     | ویژگی جدید                                   | `feat/story-highlights`            |
| `fix/`      | رفع باگ                                      | `fix/login-otp-timeout`            |
| `refactor/` | بازنویسی بدون تغییر رفتار                    | `refactor/feed-query-optimization` |
| `perf/`     | بهبود کارایی                                 | `perf/image-lazy-loading`          |
| `docs/`     | فقط مستندات                                  | `docs/api-rate-limits`             |
| `chore/`    | تغییرات نگهداری (deps, configs)              | `chore/upgrade-prisma-to-6`        |
| `test/`     | افزودن یا اصلاح تست                          | `test/auth-e2e`                    |
| `ci/`       | تغییرات CI/CD                                | `ci/cache-pnpm-store`              |
| `hotfix/`   | رفع باگ بحرانی production مستقیماً از `main` | `hotfix/payment-double-charge`     |

اسم برنچ باید کوتاه، انگلیسی، با `-` بین کلمات (kebab-case) باشه.

---

## قراردادهای Commit

از **Conventional Commits** استفاده می‌کنیم. فرمت:

```
<type>(<scope>): <subject>

<body اختیاری>

<footer اختیاری>
```

### نوع‌ها (type)

| Type       | معنی                                         |
| ---------- | -------------------------------------------- |
| `feat`     | ویژگی جدید (تغییر minor در semver)           |
| `fix`      | رفع باگ (تغییر patch در semver)              |
| `docs`     | تغییرات فقط مستندات                          |
| `style`    | فرمت، semicolon ها، فاصله‌ها (بدون تغییر کد) |
| `refactor` | بازنویسی بدون افزودن قابلیت یا رفع باگ       |
| `perf`     | بهبود کارایی                                 |
| `test`     | افزودن یا اصلاح تست‌ها                       |
| `build`    | تغییرات سیستم build یا dependencies خارجی    |
| `ci`       | تغییرات فایل‌های CI                          |
| `chore`    | کارهای جانبی (بدون تغییر src یا test)        |
| `revert`   | بازگرداندن کامیت قبلی                        |

### scope (اختیاری)

نام پکیج یا حوزه: `web`, `api`, `admin`, `worker`, `db`, `auth`, `feed`, `payment`, `ci`, `docker`, ...

### مثال‌ها

```
feat(feed): add infinite scroll with virtual list
fix(auth): handle expired OTP gracefully
refactor(api): extract shared S3 helper
perf(web): lazy load video player chunk
docs: update production deployment steps
chore(deps): bump prisma to 6.5.0
```

### Breaking Change

با `!` بعد از type/scope یا `BREAKING CHANGE:` در footer:

```
feat(api)!: rename /posts endpoint to /ads

BREAKING CHANGE: همه کلاینت‌ها باید endpoint جدید رو استفاده کنن.
```

> **نکته:** هوک `commit-msg` به‌صورت خودکار فرمت commit رو با commitlint چک می‌کنه.

---

## راهنمای Pull Request

### قبل از باز کردن PR

- [ ] برنچ از `main` به‌روز شده (`git pull --rebase origin main`)
- [ ] `pnpm lint` بدون خطا
- [ ] `pnpm format:check` پاس می‌شه
- [ ] `pnpm build` موفق
- [ ] تست‌های مرتبط اضافه/به‌روز شدن
- [ ] هیچ secret یا کلیدی commit نشده

### نوشتن PR

- عنوان PR هم باید Conventional Commit باشه (مثلاً `feat(feed): add story highlights`).
- توضیح بده **چی** عوض شده و **چرا**. اگر مرتبط با یه issue است، `Closes #123` رو اضافه کن.
- اسکرین‌شات یا screen recording برای تغییرات UI الزامیه.

### Review و Merge

- حداقل یک approval لازمه (در پروژه تک‌نفره می‌تونه از self-review استفاده بشه).
- CI باید سبز باشه.
- استراتژی merge: **Squash and merge** (commit history روی main تمیز می‌مونه).

---

## استانداردهای کد

### TypeScript

- حالت `strict` فعاله. از `any` پرهیز کن، در صورت نیاز `unknown` و narrowing.
- imports رو با `import type` برای type-only ها مشخص کن.
- circular dependency نزن.

### React / Next.js

- Server Component پیش‌فرضه؛ `'use client'` فقط در صورت نیاز.
- از `next/image` و `next/font` استفاده کن (نه `<img>` و نه `<link rel="stylesheet">`).
- state سمت کلاینت با Zustand (نه Context پیچیده).
- data fetching سمت کلاینت با TanStack Query.

### NestJS

- Module → Controller → Service. منطق توی Service.
- DTO ها با `class-validator`؛ ولی preferred: Zod schemas مشترک از `@agahiram/shared`.
- Guard ها reusable باشن.

### استایل

- TailwindCSS برای استایل؛ از inline style اجتناب کن.
- کامپوننت‌های UI از `@agahiram/ui` (shadcn).
- پشتیبانی RTL و دارک‌مود الزامیه.

---

## تست‌نویسی

- **Unit:** Vitest برای کد frontend و backend.
- **E2E API:** Supertest روی NestJS.
- **E2E UI:** Playwright (بعداً اضافه می‌شه).
- هر باگ که رفع می‌شه باید یه regression test هم داشته باشه.

```bash
pnpm test           # همه تست‌ها
pnpm test:watch     # watch mode
pnpm test:coverage  # با coverage
```

---

## گزارش باگ و درخواست فیچر

از **Issue templates** استفاده کن:

- **Bug Report:** برای گزارش رفتار غیرمنتظره
- **Feature Request:** برای پیشنهاد قابلیت جدید

اگر مشکل امنیتی پیدا کردی، لطفاً اون رو **public نکن** — به `SECURITY.md` نگاه کن.

---

## English Quick Reference

- **Branch naming:** `feat/`, `fix/`, `refactor/`, `perf/`, `docs/`, `chore/`, `test/`, `ci/`, `hotfix/`
- **Commit format:** `type(scope): subject` (Conventional Commits)
- **Before PR:** `pnpm lint && pnpm format:check && pnpm build` must pass
- **PR title:** must follow Conventional Commits
- **Merge strategy:** Squash and merge into `main`
- **Auto-deploy:** every push to `main` is deployed to production via GitHub Actions

ممنون از مشارکتت! 💚
