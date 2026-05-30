# جریان کاری Git در آگهی‌گرام

این پروژه از مدل ساده و حرفه‌ای **main + feature branches** استفاده می‌کند. هدف این است که `main` همیشه قابل deploy باشد و همه تغییرات از مسیر Pull Request وارد شوند.

## قانون اصلی

- `main` شاخه production است.
- روی `main` مستقیم commit یا push نکن.
- برای هر کار یک branch جدا بساز.
- PR باید CI سبز داشته باشد.
- عنوان PR و commitها باید از Conventional Commits پیروی کنند.

## شروع یک کار جدید

```bash
git checkout main
git pull --rebase origin main
git checkout -b feat/name-of-feature
```

نمونه‌ها:

```bash
git checkout -b feat/story-highlights
git checkout -b fix/otp-expiry
git checkout -b docs/deploy-guide
git checkout -b ci/improve-cache
```

## نوشتن commit

فرمت:

```text
type(scope): subject
```

مثال:

```bash
git add .
git commit -m "feat(feed): add infinite scroll"
git commit -m "fix(auth): handle expired otp"
git commit -m "ci: add production deployment workflow"
```

typeهای مجاز:

- `feat`
- `fix`
- `docs`
- `style`
- `refactor`
- `perf`
- `test`
- `build`
- `ci`
- `chore`
- `revert`

scope اختیاری است ولی پیشنهاد می‌شود: `web`, `api`, `admin`, `worker`, `db`, `ui`, `shared`, `docker`, `ci`.

## قبل از Push

```bash
pnpm format:check
pnpm lint
pnpm build
```

اگر فرمت مشکل داشت:

```bash
pnpm format
```

## باز کردن PR

```bash
git push -u origin feat/name-of-feature
```

بعد روی GitHub یک Pull Request به `main` باز کن.

عنوان PR باید مثل commit باشد:

```text
feat(feed): add infinite scroll
fix(auth): handle expired otp
ci: improve production deploy
```

## Merge

وقتی CI سبز شد:

- اگر پروژه تک‌نفره است، self-review قابل قبول است.
- از **Squash and merge** استفاده کن تا history روی `main` تمیز بماند.
- بعد از merge به `main`، deploy با `scripts/deploy-bridge.ps1` به سرور `root@45.144.18.86` انجام می‌شود (جزئیات: [`docs/SERVER.md`](SERVER.md)).

## Hotfix

برای باگ فوری production:

```bash
git checkout main
git pull --rebase origin main
git checkout -b hotfix/payment-callback
```

بعد از fix و PR، مستقیم به `main` merge کن تا deploy شود.

## بازگردانی تغییر مشکل‌دار

اگر یک PR بعد از deploy مشکل ایجاد کرد:

```bash
git checkout main
git pull --rebase origin main
git revert <bad-commit-sha>
git push origin main
```

برای تغییرات بزرگ بهتر است از دکمه **Revert** در GitHub استفاده شود تا PR revert ساخته شود.
