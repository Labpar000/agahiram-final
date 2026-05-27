param(
  [string]$HostName = "37.32.25.153",
  [string]$User = "ubuntu",
  [string]$Port = "22",
  [string]$KeyPath = ".cache/ssh/agahiram_id_ed25519",
  [string]$AppDir = "/opt/agahiram"
)

$ErrorActionPreference = "Stop"

function Step($Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Archive = Join-Path $env:TEMP "agahiram-src.tar.gz"
Set-Location $Root

Step "Running local checks"
pnpm format:check
pnpm lint
pnpm build

Step "Creating source archive"
if (Test-Path $Archive) {
  Remove-Item $Archive -Force
}
git archive --format=tar.gz --output=$Archive HEAD

Step "Uploading archive to VPS"
scp -i $KeyPath -P $Port -o StrictHostKeyChecking=no $Archive "${User}@${HostName}:/tmp/agahiram-src.tar.gz"

Step "Deploying on VPS"
ssh -i $KeyPath -p $Port -o StrictHostKeyChecking=no "${User}@${HostName}" "APP_DIR='$AppDir' bash -s" @'
set -euo pipefail

mkdir -p "$APP_DIR"
tar -xzf /tmp/agahiram-src.tar.gz -C "$APP_DIR"
cd "$APP_DIR/docker"

docker compose -f docker-compose.prod.yml build api web admin worker
docker compose -f docker-compose.prod.yml up -d postgres redis meilisearch
docker compose -f docker-compose.prod.yml run --rm api pnpm --filter @agahiram/database migrate:deploy
docker compose -f docker-compose.prod.yml up -d api web admin worker caddy
docker image prune -f
docker compose -f docker-compose.prod.yml ps
'@

Step "Done"

