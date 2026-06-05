# سرور Production آگهی‌گرام

این سند مرجع واحد اطلاعات اتصال و deploy روی VPS است.

## مشخصات سرور

| مورد           | مقدار                                       |
| -------------- | ------------------------------------------- |
| **IP**         | `45.144.18.86`                              |
| **کاربر**      | `root`                                      |
| **پورت SSH**   | `22`                                        |
| **مسیر پروژه** | `/opt/agahiram`                             |
| **دامنه**      | `alooche.com`                               |
| **DNS**        | `87.107.110.109` (برای دسترسی به `ghcr.io`) |

## اتصال SSH

### MobaXterm / Terminal

```
ssh -i /path/to/your/key root@45.144.18.86
```

> **امنیت:** از SSH key استفاده کن. رمز عبور را در repo، docs یا اسکریپت‌ها قرار نده.

### از Windows (PowerShell)

```powershell
ssh -i .cache/ssh/agahiram_id_ed25519 root@45.144.18.86
```

## Deploy از PC (fallback)

اگر GitHub Actions در دسترس نبود:

```powershell
# SSH key (preferred) or explicit password — never commit credentials
powershell -ExecutionPolicy Bypass -File scripts/deploy-bridge.ps1 -KeyPath .cache/ssh/agahiram_id_ed25519
# Or: -Password (secure prompt / env var, not stored in repo)
```

## Deploy استاندارد (GitHub Actions)

بعد از push به `main` و موفقیت CI، workflow **Deploy Production** خودکار اجرا می‌شود.

راه‌اندازی یک‌بار secrets:

```powershell
# One-time: install deploy key on VPS (requires your existing root SSH key)
powershell -ExecutionPolicy Bypass -File scripts/bootstrap-github-deploy.ps1 -InitialKeyPath .cache/ssh/agahiram_id_ed25519
```

جزئیات: [`docs/CI_CD.md`](CI_CD.md)

## Deploy دستی روی سرور

```bash
ssh root@45.144.18.86
cd /opt/agahiram
bash scripts/update.sh
```

یا deploy کامل:

```bash
export DOMAIN=alooche.com
export EMAIL=admin@alooche.com
bash /opt/agahiram/scripts/deploy.sh
```

## بعد از تغییر MinIO

```bash
ssh root@45.144.18.86
sudo SRC_TARBALL=/tmp/agahiram-src.tar.gz bash /opt/agahiram/scripts/redeploy-minio.sh
```

## GitHub Actions Secrets (اختیاری)

اگر deploy از GitHub فعال شد:

```text
SSH_HOST=45.144.18.86
SSH_USER=root
SSH_PORT=22
SSH_KEY=<private key if configured>
```

> **امنیت:** هیچ secret (رمز، کلید خصوصی، توکن) در repo یا docs commit نشود. Deploy خودکار فقط با GitHub Secrets (`SSH_HOST`, `SSH_USER`, `SSH_KEY`) انجام شود. اگر رمز قبلاً در git history بوده، حتماً rotate کن.

## دستورات مفید

```bash
cd /opt/agahiram/docker
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api
nano /opt/agahiram/docker/.env
```
