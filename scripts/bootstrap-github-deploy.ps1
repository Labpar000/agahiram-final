# Bootstrap GitHub Actions deploy secrets and server SSH key
# Usage: powershell -ExecutionPolicy Bypass -File scripts/bootstrap-github-deploy.ps1

param(
  [string]$RepoSlug = "Labpar000/agahiram",
  [string]$SshHost = "45.144.18.86",
  [string]$SshUser = "root",
  [string]$SshPort = "22",
  [string]$SshPassword = "amirhosein",
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
echo y | plink -batch -pw $SshPassword "${SshUser}@${SshHost}" "mkdir -p ~/.ssh; chmod 700 ~/.ssh; touch ~/.ssh/authorized_keys; grep -qxF '$PubKey' ~/.ssh/authorized_keys || echo '$PubKey' >> ~/.ssh/authorized_keys; chmod 600 ~/.ssh/authorized_keys; echo server-ok"

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
