# Bootstrap GitHub Actions deploy secrets and server SSH key (key-only; no passwords in repo).
# Usage: powershell -ExecutionPolicy Bypass -File scripts/bootstrap-github-deploy.ps1
# Requires an existing root SSH key at -InitialKeyPath for the one-time authorized_keys install.

param(
  [string]$RepoSlug = "Labpar000/agahiram",
  [string]$SshHost = "45.144.18.86",
  [string]$SshUser = "root",
  [string]$SshPort = "22",
  [string]$InitialKeyPath = ".cache/ssh/agahiram_id_ed25519",
  [string]$DeployKeyPath = ".cache/ssh/github_deploy_ed25519"
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

function Step($Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

Step "Ensure deploy SSH key exists"
if (-not (Test-Path $DeployKeyPath)) {
  ssh-keygen -t ed25519 -f $DeployKeyPath -N '""' -C "github-actions-agahiram"
}

$PubKey = (Get-Content "$DeployKeyPath.pub" -Raw).Trim()

Step "Install public key on server ($SshUser@$SshHost)"
if (-not (Test-Path $InitialKeyPath)) {
  throw "Initial SSH key not found at $InitialKeyPath. Use key-based auth only — never store passwords in this repo."
}
$SshBase = @("-i", $InitialKeyPath, "-p", $SshPort, "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=15")
$RemoteCmd = "mkdir -p ~/.ssh; chmod 700 ~/.ssh; touch ~/.ssh/authorized_keys; grep -qxF '$PubKey' ~/.ssh/authorized_keys || echo '$PubKey' >> ~/.ssh/authorized_keys; chmod 600 ~/.ssh/authorized_keys; echo server-ok"
ssh @($SshBase + @("${SshUser}@${SshHost}", $RemoteCmd))
if ($LASTEXITCODE -ne 0) { throw "Failed to install deploy key on server" }

Step "Test key-based SSH"
ssh -i $DeployKeyPath -o StrictHostKeyChecking=no -o ConnectTimeout=15 "${SshUser}@${SshHost}" "echo key-ok"

Step "Configure GitHub secrets and variables"
gh secret set SSH_HOST --body $SshHost --repo $RepoSlug
gh secret set SSH_USER --body $SshUser --repo $RepoSlug
gh secret set SSH_PORT --body $SshPort --repo $RepoSlug
Get-Content -Raw (Resolve-Path $DeployKeyPath) | gh secret set SSH_KEY --repo $RepoSlug
gh variable set APP_DIR --body "/opt/agahiram" --repo $RepoSlug
gh variable set PRODUCTION_DOMAIN --body "alooche.com" --repo $RepoSlug

Step "Done"
Write-Host "GitHub Actions deploy is configured for $RepoSlug"
Write-Host "Run: gh workflow run deploy.yml --repo $RepoSlug"
