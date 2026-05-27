# CI/CD آگهی‌گرام

این سند توضیح می‌دهد GitHub Actions پروژه چه کارهایی انجام می‌دهد و برای deploy production چه secretهایی لازم است.

## Workflowها

### `CI`

فایل: `.github/workflows/ci.yml`

روی این eventها اجرا می‌شود:

- هر Pull Request به `main`
- هر push به `main`

مراحل:

1. checkout کد
2. نصب `pnpm` و Node طبق `.nvmrc`
3. نصب dependencyها با `pnpm install --frozen-lockfile`
4. اجرای `pnpm db:generate`
5. چک فرمت با `pnpm format:check`
6. typecheck با `pnpm typecheck`
7. build کامل با `pnpm build`

### `PR Title`

فایل: `.github/workflows/pr-title.yml`

عنوان PR را با Conventional Commits چک می‌کند. مثال درست:

```text
feat(feed): add infinite scroll
fix(auth): handle expired otp
ci: improve deploy pipeline
```

### `Labeler`

فایل: `.github/workflows/labeler.yml`

بر اساس فایل‌های تغییر کرده، labelهایی مثل `api`, `web`, `admin`, `worker`, `docker`, `ci`, `docs` را به PR اضافه می‌کند.

### `Release Drafter`

فایل‌ها:

- `.github/workflows/release-drafter.yml`
- `.github/release-drafter.yml`

بعد از merge به `main`، draft release note را آپدیت می‌کند.

### `Deploy Production`

فایل: `.github/workflows/deploy.yml`

روی این eventها اجرا می‌شود:

- push به `main`
- اجرای دستی از تب Actions (`workflow_dispatch`)

کارهایی که روی سرور انجام می‌دهد:

1. اتصال SSH به VPS
2. رفتن به مسیر `/opt/agahiram` یا مقدار `APP_DIR`
3. گرفتن آخرین کد از `origin/main`
4. build ایمیج‌های `api`, `web`, `admin`, `worker`
5. اجرای migration دیتابیس
6. بالا آوردن سرویس‌ها با Docker Compose
7. پاکسازی Docker imageهای اضافی

## Secrets لازم در GitHub

به مسیر زیر برو:

`Repository -> Settings -> Secrets and variables -> Actions -> New repository secret`

Secretهای لازم:

```text
SSH_HOST=37.32.25.153
SSH_USER=ubuntu
SSH_PORT=22
SSH_KEY=<private ssh key>
```

`SSH_PORT` اختیاری است و اگر ست نشود `22` استفاده می‌شود.

## Variables پیشنهادی

به مسیر زیر برو:

`Repository -> Settings -> Secrets and variables -> Actions -> Variables`

Variableهای پیشنهادی:

```text
APP_DIR=/opt/agahiram
PRODUCTION_DOMAIN=agahiram.ir
```

## آماده‌سازی سرور برای Deploy

روی سرور باید این موارد آماده باشد:

- مسیر پروژه: `/opt/agahiram`
- ریموت GitHub روی همان مسیر تنظیم شده باشد
- Docker و Docker Compose نصب باشند
- فایل production env در `docker/.env` موجود باشد
- کلید deploy GitHub اجازه `git fetch` روی repo را داشته باشد

اگر پروژه هنوز روی سرور clone نشده:

```bash
sudo mkdir -p /opt/agahiram
sudo chown -R ubuntu:ubuntu /opt/agahiram
git clone git@github.com:Labpar000/agahiram.git /opt/agahiram
cd /opt/agahiram
bash scripts/deploy.sh
```

## اجرای دستی Deploy

از GitHub:

`Actions -> Deploy Production -> Run workflow`

از لوکال:

```bash
ssh -i .cache/ssh/agahiram_id_ed25519 ubuntu@37.32.25.153
cd /opt/agahiram
bash scripts/update.sh
```

## Rollback سریع

اگر deploy جدید مشکل داشت:

```bash
cd /opt/agahiram
git log --oneline -5
git checkout <previous-good-sha>
cd docker
docker compose -f docker-compose.prod.yml build api web admin worker
docker compose -f docker-compose.prod.yml up -d api web admin worker caddy
```

برای rollback تمیزتر، روی GitHub یک PR revert بساز تا `main` هم با production همگام بماند.

## نکات امنیتی

- هیچ `.env` یا SSH key نباید commit شود.
- دسترسی secretها فقط در Actions است.
- برای `main`، branch protection باید فعال باشد.
- workflow deploy فقط از `main` اجرا می‌شود.
- برای کارهای destructive مثل force push، approval انسانی لازم است.
