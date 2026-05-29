param(
  [string]$HostName = "45.144.18.86",
  [string]$User = "root",
  [string]$Port = "22",
  [string]$KeyPath = ".cache/ssh/agahiram_id_ed25519",
  [string]$AppDir = "/opt/agahiram",
  [switch]$SkipLocalChecks = $false,
  [switch]$ForceFullBuild = $false,
  [switch]$ForceOfflineCacheSync = $false
)

$ErrorActionPreference = "Stop"

function Step($Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-Native {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,

    [string[]]$Arguments = @()
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')"
  }
}

function Invoke-NativeCapture {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,

    [string[]]$Arguments = @()
  )

  $Output = & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')"
  }
  return $Output
}

function Get-ChangedServices {
  param(
    [string]$RootPath,
    [switch]$ForceAll
  )

  $allServices = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($svc in @("api", "web", "admin", "worker")) {
    [void]$allServices.Add($svc)
  }

  if ($ForceAll) {
    return @($allServices)
  }

  $changed = & git -C $RootPath status --porcelain
  if ($LASTEXITCODE -ne 0 -or -not $changed) {
    return @($allServices)
  }

  $services = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  $fullRebuild = $false

  foreach ($line in $changed) {
    if ([string]::IsNullOrWhiteSpace($line)) {
      continue
    }

    $path = $line.Substring([Math]::Min(3, $line.Length)).Trim()
    if ($path -like "*->*") {
      $path = ($path -split "->")[-1].Trim()
    }

    if (
      $path.StartsWith("package.json") -or
      $path.StartsWith("pnpm-lock.yaml") -or
      $path.StartsWith("pnpm-workspace.yaml") -or
      $path.StartsWith(".npmrc") -or
      $path.StartsWith("turbo.json") -or
      $path.StartsWith("packages/shared/") -or
      $path.StartsWith("packages/config/") -or
      $path.StartsWith(".pnpm-store/") -or
      $path.StartsWith(".pnpm-meta/")
    ) {
      $fullRebuild = $true
      break
    }

    if ($path.StartsWith("apps/api/") -or $path.StartsWith("packages/database/")) {
      [void]$services.Add("api")
    }
    if ($path.StartsWith("workers/media-processor/") -or $path.StartsWith("packages/database/")) {
      [void]$services.Add("worker")
    }
    if ($path.StartsWith("apps/web/") -or $path.StartsWith("packages/ui/")) {
      [void]$services.Add("web")
    }
    if ($path.StartsWith("apps/admin/") -or $path.StartsWith("packages/ui/")) {
      [void]$services.Add("admin")
    }
    if ($path.StartsWith("docker/Dockerfile.api")) {
      [void]$services.Add("api")
    }
    if ($path.StartsWith("docker/Dockerfile.web")) {
      [void]$services.Add("web")
    }
    if ($path.StartsWith("docker/Dockerfile.admin")) {
      [void]$services.Add("admin")
    }
    if ($path.StartsWith("docker/Dockerfile.worker")) {
      [void]$services.Add("worker")
    }
    if ($path.StartsWith("docker/docker-compose.prod.yml")) {
      $fullRebuild = $true
      break
    }
  }

  if ($fullRebuild -or $services.Count -eq 0) {
    return @($allServices)
  }

  return @($services)
}

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Archive = Join-Path $env:TEMP "agahiram-src.tar.gz"
Set-Location $Root

if (-not $SkipLocalChecks) {
  Step "Running local checks"
  Invoke-Native -FilePath pnpm -Arguments @("format:check")
  Invoke-Native -FilePath pnpm -Arguments @("lint")
  Invoke-Native -FilePath pnpm -Arguments @("build")
}

$Services = Get-ChangedServices -RootPath $Root -ForceAll:$ForceFullBuild
$BuildServices = ($Services | Sort-Object)
$BuildServicesArg = ($BuildServices -join " ")
Step "Build scope: $BuildServicesArg"

$LockHash = (Get-FileHash -Path (Join-Path $Root "pnpm-lock.yaml") -Algorithm SHA256).Hash.ToLowerInvariant()
$SshCommon = @(
  "-i", $KeyPath,
  "-p", $Port,
  "-o", "StrictHostKeyChecking=no"
)
$RemoteCacheHash = Invoke-NativeCapture -FilePath ssh -Arguments (
  $SshCommon + @(
    "${User}@${HostName}",
    "if [ -f '$AppDir/.offline-cache-lock.sha256' ] && [ -d '$AppDir/.pnpm-store' ] && [ -d '$AppDir/.pnpm-meta' ]; then cat '$AppDir/.offline-cache-lock.sha256'; fi"
  )
)
$RemoteCacheHashString = ($RemoteCacheHash | Out-String).Trim().ToLowerInvariant()
$NeedOfflineCacheSync = $ForceOfflineCacheSync -or [string]::IsNullOrWhiteSpace($RemoteCacheHashString)
$CacheReason = if ($ForceOfflineCacheSync) {
  "forced"
} elseif ($NeedOfflineCacheSync) {
  "remote cache missing"
} elseif ($RemoteCacheHashString -ne $LockHash) {
  "skipped (stale remote cache; set -ForceOfflineCacheSync to refresh)"
} else {
  "skipped (cache unchanged)"
}
Step ("Offline cache sync: $CacheReason")

Step "Creating source archive"
if (Test-Path $Archive) {
  Remove-Item $Archive -Force
}
$TarExcludes = @(
  "--exclude=.git",
  "--exclude=.cursor",
  "--exclude=node_modules",
  "--exclude=.turbo",
  "--exclude=tmp",
  "--exclude=.cache",
  "--exclude=**/node_modules",
  "--exclude=**/.next",
  "--exclude=**/dist"
)
if (-not $NeedOfflineCacheSync) {
  $TarExcludes += @("--exclude=.pnpm-store", "--exclude=.pnpm-meta")
}
$TarArgs = @("-czf", $Archive) + $TarExcludes + @("-C", "$Root", ".")
Invoke-Native -FilePath tar -Arguments $TarArgs

Step "Uploading archive to VPS"
Invoke-Native -FilePath scp -Arguments @(
  "-i",
  $KeyPath,
  "-P",
  $Port,
  "-o",
  "StrictHostKeyChecking=no",
  $Archive,
  "${User}@${HostName}:/tmp/agahiram-src.tar.gz"
)

Step "Deploying on VPS"
$RemoteScript = @'
set -euo pipefail

mkdir -p "$APP_DIR"
tar -xzf /tmp/agahiram-src.tar.gz -C "$APP_DIR"
cd "$APP_DIR/docker"

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
# cache build عمداً پاک نمی‌شود تا rebuildها سریع بمانند؛
# مدیریت دیسک با BuildKit GC در /etc/docker/daemon.json انجام می‌شود.

docker compose -f docker-compose.prod.yml up -d postgres redis meilisearch minio
docker compose -f docker-compose.prod.yml up -d createbuckets
if [[ "$NEED_CACHE_SYNC" = "1" ]]; then
  echo "$LOCK_HASH" > "$APP_DIR/.offline-cache-lock.sha256"
fi

if [[ -n "${BUILD_SERVICES:-}" ]]; then
  for svc in $BUILD_SERVICES; do
    docker compose -f docker-compose.prod.yml build "$svc"
  done
fi

if [[ " $BUILD_SERVICES " == *" api "* || " $BUILD_SERVICES " == *" worker "* ]]; then
  docker compose -f docker-compose.prod.yml run --rm --workdir /app api sh -lc '/app/node_modules/.bin/prisma migrate deploy --schema /app/packages/database/prisma/schema.prisma'
fi

docker compose -f docker-compose.prod.yml up -d --force-recreate $BUILD_SERVICES caddy
docker image prune -f
docker compose -f docker-compose.prod.yml ps
'@

$NeedOfflineCacheSyncInt = if ($NeedOfflineCacheSync) { "1" } else { "0" }
$RemoteScript | ssh -i $KeyPath -p $Port -o StrictHostKeyChecking=no "${User}@${HostName}" "APP_DIR='$AppDir' BUILD_SERVICES='$BuildServicesArg' NEED_CACHE_SYNC='$NeedOfflineCacheSyncInt' LOCK_HASH='$LockHash' bash -s"
if ($LASTEXITCODE -ne 0) {
  throw "Remote deploy failed with exit code ${LASTEXITCODE}"
}

Step "Done"

