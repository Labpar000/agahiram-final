# CI/CD آگهی‌گرام

این سند توضیح می‌دهد GitHub Actions پروژه چه کارهایی انجام می‌دهد و برای deploy production چه مسیرهایی داریم.

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

فعلاً فقط با اجرای دستی از تب Actions (`workflow_dispatch`) اجرا می‌شود.

> نکته مهم: مسیر شبکه بین GitHub-hosted runner و VPS ایران timeout می‌دهد، و خود VPS هم outbound مستقیم به `github.com` ندارد. بنابراین deploy خودکار از GitHub روی `push` غیرفعال شده تا pipeline قرمز نماند. برای deploy production در شرایط فعلی از bridge محلی استفاده کن.

کارهایی که روی سرور انجام می‌دهد:

1. package کردن سورس از commit فعلی
2. آپلود archive با SSH/SCP روی VPS
3. extract در `/opt/agahiram` یا مقدار `APP_DIR`
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
- Docker و Docker Compose نصب باشند
- فایل production env در `docker/.env` موجود باشد

اگر پروژه هنوز روی سرور آماده نشده:

```bash
sudo mkdir -p /opt/agahiram
sudo chown -R ubuntu:ubuntu /opt/agahiram
```

## اجرای دستی Deploy

از لوکال با bridge پیشنهادی:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-bridge.ps1
```

این اسکریپت اول `format:check`، `lint` و `build` را اجرا می‌کند، بعد archive سورس commit فعلی را با `scp` به سرور می‌فرستد و همان‌جا Docker Compose build/migrate/up را انجام می‌دهد.

از GitHub (فقط وقتی مسیر شبکه runner به VPS باز شود):

`Actions -> Deploy Production -> Run workflow`

از SSH مستقیم روی سرور:

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
- برای `main`، branch protection باید فعال باشد؛ اما GitHub برای private repo روی پلن فعلی اجازه branch protection نمی‌دهد.
- workflow deploy فقط دستی اجرا می‌شود تا زمانی که مسیر شبکه GitHub runner به VPS باز شود یا runner داخلی راه‌اندازی شود.
- برای کارهای destructive مثل force push، approval انسانی لازم است.
