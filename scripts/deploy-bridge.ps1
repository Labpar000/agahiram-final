param(
  [string]$HostName = "45.144.18.86",
  [string]$User = "root",
  [string]$Password = "amirhosein",
  [string]$Port = "22",
  [string]$KeyPath = ".cache/ssh/agahiram_id_ed25519",
  [string]$AppDir = "/opt/agahiram",
  [string]$Domain = "alooche.com",
  [string]$ImageRegistry = "ghcr.io/labpar000/agahiram",
  [string]$GhcrToken = "",
  [switch]$SkipLocalChecks = $false,
  [switch]$ForceFullBuild = $false,
  [switch]$BuildOnServer = $false
)

$ErrorActionPreference = "Stop"

function Step($Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-Native {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [string[]]$Arguments = @()
  )
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed (${LASTEXITCODE}): $FilePath $($Arguments -join ' ')"
  }
}

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

if (-not $SkipLocalChecks) {
  Step "Running local checks"
  Invoke-Native -FilePath pnpm -Arguments @("format:check")
  Invoke-Native -FilePath pnpm -Arguments @("lint")
  Invoke-Native -FilePath pnpm -Arguments @("build")
}

$ImageTag = (git rev-parse HEAD).Trim()
if ($ForceFullBuild) {
  $BuildServices = "api worker web admin"
  $ConfigOnly = ""
} else {
  $ScopeLines = & bash scripts/detect-build-services.sh --env HEAD~1 HEAD
  $BuildServices = ""
  $ConfigOnly = ""
  foreach ($line in $ScopeLines) {
    if ($line -match '^BUILD_SERVICES="(.*)"$') { $BuildServices = $Matches[1] }
    if ($line -match '^CONFIG_ONLY="(.*)"$') { $ConfigOnly = $Matches[1] }
  }
}

$DeployMode = if ($BuildOnServer) { "build" } else { "pull" }
Step "Deploy mode: $DeployMode | services: $BuildServices | config: $ConfigOnly | tag: $ImageTag"

$SshOpts = @(
  "-p", $Port,
  "-o", "StrictHostKeyChecking=no",
  "-o", "ServerAliveInterval=30",
  "-o", "ServerAliveCountMax=120"
)
if (Test-Path $KeyPath) {
  $SshOpts = @("-i", $KeyPath) + $SshOpts
} else {
  Write-Host "SSH key not found at $KeyPath — using password auth" -ForegroundColor Yellow
}

$ConfigArchive = Join-Path $env:TEMP "agahiram-config.tar.gz"
$ConfigShaFile = Join-Path $env:TEMP "agahiram-config.sha256"

if ($DeployMode -eq "pull") {
  Step "Packaging config"
  Invoke-Native -FilePath bash -Arguments @("scripts/package-config.sh", $ConfigArchive)
  $ConfigSha = (Get-FileHash -Path $ConfigArchive -Algorithm SHA256).Hash.ToLowerInvariant()
  Set-Content -Path $ConfigShaFile -Value $ConfigSha -NoNewline

  Step "Uploading config to VPS"
  $ScpOpts = @("-P", $Port, "-o", "StrictHostKeyChecking=no")
  if (Test-Path $KeyPath) { $ScpOpts = @("-i", $KeyPath) + $ScpOpts }
  Invoke-Native -FilePath scp -Arguments ($ScpOpts + @($ConfigArchive, "${User}@${HostName}:/tmp/agahiram-config.tar.gz.tmp"))
  Invoke-Native -FilePath scp -Arguments ($ScpOpts + @($ConfigShaFile, "${User}@${HostName}:/tmp/agahiram-config.sha256"))
  Invoke-Native -FilePath ssh -Arguments ($SshOpts + @("${User}@${HostName}", "mv /tmp/agahiram-config.tar.gz.tmp /tmp/agahiram-config.tar.gz"))

  Step "Pull-mode deploy on VPS"
  $GhcrTokenArg = if ($GhcrToken) { $GhcrToken } else { "" }
  $RemoteEnv = @(
    "APP_DIR='$AppDir'",
    "DOMAIN='$Domain'",
    "DEPLOY_MODE=pull",
    "IMAGE_REGISTRY='$ImageRegistry'",
    "IMAGE_TAG='$ImageTag'",
    "BUILD_SERVICES='$BuildServices'",
    "CONFIG_ONLY='$ConfigOnly'",
    "CONFIG_TARBALL='/tmp/agahiram-config.tar.gz'",
    "CONFIG_SHA256='$ConfigSha'",
    "GHCR_TOKEN='$GhcrTokenArg'",
    "GHCR_USER='Labpar000'"
  ) -join " "

  Get-Content (Join-Path $Root "scripts/remote-deploy.sh") -Raw |
    ssh @($SshOpts + @("${User}@${HostName}", "${RemoteEnv} bash -s"))
} else {
  Step "Creating full source archive (build fallback)"
  $Archive = Join-Path $env:TEMP "agahiram-src.tar.gz"
  if (Test-Path $Archive) { Remove-Item $Archive -Force }
  $TarArgs = @(
    "-czf", $Archive,
    "--exclude=.git", "--exclude=.cursor", "--exclude=node_modules",
    "--exclude=**/node_modules", "--exclude=.turbo", "--exclude=tmp",
    "--exclude=.cache", "--exclude=**/.next", "--exclude=**/dist",
    "-C", "$Root", "."
  )
  Invoke-Native -FilePath tar -Arguments $TarArgs

  Step "Uploading source to VPS"
  $ScpOpts = @("-P", $Port, "-o", "StrictHostKeyChecking=no")
  if (Test-Path $KeyPath) { $ScpOpts = @("-i", $KeyPath) + $ScpOpts }
  Invoke-Native -FilePath scp -Arguments ($ScpOpts + @($Archive, "${User}@${HostName}:/tmp/agahiram-src.tar.gz.tmp"))
  Invoke-Native -FilePath ssh -Arguments ($SshOpts + @("${User}@${HostName}", "mv /tmp/agahiram-src.tar.gz.tmp /tmp/agahiram-src.tar.gz"))

  if (-not $BuildServices) { $BuildServices = "api worker web admin" }
  $RemoteEnv = @(
    "APP_DIR='$AppDir'",
    "DOMAIN='$Domain'",
    "DEPLOY_MODE=build",
    "BUILD_SERVICES='$BuildServices'",
    "SRC_TARBALL='/tmp/agahiram-src.tar.gz'"
  ) -join " "

  Get-Content (Join-Path $Root "scripts/remote-deploy.sh") -Raw |
    ssh @($SshOpts + @("${User}@${HostName}", "${RemoteEnv} bash -s"))
}

if ($LASTEXITCODE -ne 0) {
  throw "Remote deploy failed with exit code ${LASTEXITCODE}"
}

Step "Done"
