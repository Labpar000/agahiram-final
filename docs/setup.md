# راهنمای راه‌اندازی آگهی‌گرام از صفر

این راهنما برای کسی است که هیچ تجربه‌ی فنی DevOps ندارد. مرحله به مرحله جلو برو.

## ۱. آماده‌سازی حساب‌های ضروری

قبل از هر چیز این ۵ سرویس را ثبت‌نام کن (همه ایرانی و در دسترس):

### ۱.۱ ArvanCloud (سرور + Storage + CDN)

- برو به https://panel.arvancloud.ir و حساب بساز
- بخش "ابر آروان" → ثبت‌نام و واریز اولیه ~۲۰۰ هزار تومان
- یک **Object Storage Bucket** بساز با نام `agahiram` (region `ir-thr-at1`)
- **Access Key** و **Secret Key** بگیر و یادداشت کن

### ۱.۲ Kavenegar (پیامک OTP)

- ثبت‌نام در https://kavenegar.com
- پنل آزمایشی رایگانه (تا ۱۰ پیامک)
- بعد از احراز، **API Key** را از پنل کپی کن
- یک **Template** بساز با نام `verify` و متن: `کد ورود به آگهی‌گرام: %token`

### ۱.۳ ZarinPal (پرداخت)

- ثبت‌نام در https://zarinpal.com
- برای production نیاز به این‌ها داری: **کد مالیاتی + e-Namad + مجوز کسب‌وکار**
- در شروع از **Sandbox** استفاده کن (در `.env` قرار بده `ZARINPAL_SANDBOX=true`)

### ۱.۴ Neshan Maps (نقشه)

- ثبت‌نام در https://platform.neshan.org
- ۲۰۰ هزار تومان اعتبار رایگان ۳ ماهه
- **API Key** بگیر

### ۱.۵ خرید VPS و دامنه

- VPS: یک سرور Ubuntu 22.04 بخر:
  - **Mahancloud (ارزون‌تر، ~۱.۴M تومان/ماه)**: https://mahancloud.com → پلن SAB4 (4 vCPU / 8 GB / 120 GB)
  - یا **ArvanCloud Cloud Server**: پلن m4-small1 (~€25/ماه)
- دامنه: یک دامنه `.ir` از https://nic.ir یا یک ریسلر بخر (~۵۰ هزار تومان/سال)
- **DNS** دامنه را به IP سرور وصل کن (رکورد A)

## ۲. اتصال به سرور

مشخصات سرور production در [`docs/SERVER.md`](SERVER.md) است:

| مورد  | مقدار          |
| ----- | -------------- |
| IP    | `45.144.18.86` |
| کاربر | `root`         |
| رمز   | `amirhosein`   |

از کامپیوترت با **MobaXterm** (Windows) یا **Terminal** (Mac) به سرور SSH بزن:

```
ssh root@45.144.18.86
```

## ۳. اجرای دیپلوی خودکار

روی سرور این دستورات را پشت سر هم بزن:

```bash
# آپلود پروژه از GitHub
git clone git@github.com:Labpar000/agahiram.git /opt/agahiram

# اجرای دیپلوی صفر تا صد
export DOMAIN=agahiram.ir
export EMAIL=youremail@example.com
bash /opt/agahiram/scripts/deploy.sh
```

این اسکریپت:

- Docker و Docker Compose نصب می‌کند
- فایروال را پیکربندی می‌کند (پورت‌های 80, 443, 22)
- secrets تصادفی برای دیتابیس، Redis، JWT می‌سازد
- همه کانتینرها را بالا می‌آورد
- migration و seed دیتابیس را اجرا می‌کند
- backup روزانه را به cron اضافه می‌کند

## ۴. وارد کردن کلیدهای API

بعد از اجرای deploy.sh فایل `.env` ساخته می‌شود. آن را با nano باز کن و این موارد را پر کن:

```bash
nano /opt/agahiram/docker/.env
```

```
KAVENEGAR_API_KEY=your_kavenegar_api_key
KAVENEGAR_DEV_MODE=false
MINIO_ACCESS_KEY=agahiram
MINIO_SECRET_KEY=your_minio_password
ZARINPAL_MERCHANT_ID=your_merchant_id
ZARINPAL_SANDBOX=true
NESHAN_API_KEY=your_neshan_api_key
```

ذخیره (Ctrl+O, Enter, Ctrl+X) و سپس restart:

```bash
cd /opt/agahiram/docker
docker compose -f docker-compose.prod.yml restart api worker
```

## ۵. تأیید نهایی

- وب: https://agahiram.ir
- پنل ادمین: https://agahiram.ir/admin
- کاربر ادمین: شماره `09120000000` (با OTP در dev mode یا واقعی)

## ۶. به‌روزرسانی

هر زمان کد جدید روی GitHub push کردی:

```bash
bash /opt/agahiram/scripts/update.sh
```

## ۷. CI و Deploy

مشخصات سرور: [`docs/SERVER.md`](SERVER.md) (`root@45.144.18.86`)

CI روی GitHub برای هر push و PR اجرا می‌شود. بعد از push به `main`، workflow **Deploy Production** خودکار اجرا می‌شود (build روی GHA + pull روی VPS).

اگر GHCR از سرور در دسترس نبود، یک‌بار `scripts/setup-ghcr-server.sh` را روی VPS اجرا کن. deploy اضطراری بدون CI:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-bridge.ps1 -PullFromRegistry -SkipLocalChecks
```

## ۸. عیب‌یابی

```bash
# دیدن لاگ‌های همه سرویس‌ها
cd /opt/agahiram/docker
docker compose -f docker-compose.prod.yml logs -f

# دیدن وضعیت کانتینرها
docker compose -f docker-compose.prod.yml ps

# دسترسی به Prisma Studio (برای دیدن دیتابیس)
docker compose -f docker-compose.prod.yml exec api pnpm --filter @agahiram/database studio
```

## هزینه ماهانه تخمینی (۵۰۰۰ کاربر فعال)

| مورد                     | هزینه                                       |
| ------------------------ | ------------------------------------------- |
| VPS (Mahancloud SAB4)    | ۱.۴M تومان                                  |
| ArvanCloud Storage + CDN | ۲۰۰k – ۸۰۰k تومان (با رشد)                  |
| Kavenegar (~10k OTP)     | ~۳۰۰k تومان                                 |
| Neshan                   | پس از ۳ ماه ~۱۰۰k تومان                     |
| دامنه                    | ~۵۰k تومان/سال                              |
| **مجموع**                | **~۲M تومان/ماه (شروع) → ~۵M (مقیاس بزرگ)** |
