param(
  [string]$RepoName = "agahiram",
  [string]$Description = "Agahiram classified ads platform",
  [string]$DefaultBranch = "main",
  [string]$SshHost = "37.32.26.32",
  [string]$SshUser = "ubuntu",
  [string]$SshPort = "22",
  [string]$SshKeyPath = ".cache/ssh/agahiram_id_ed25519",
  [switch]$Public
)

$ErrorActionPreference = "Stop"

function Step($Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Require-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Command '$Name' was not found."
  }
}

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

Step "Checking prerequisites"
Require-Command git

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Step "Installing GitHub CLI with winget"
  Require-Command winget
  winget install --id GitHub.cli --exact --source winget
}

Require-Command gh

Step "Initializing git repository"
if (-not (Test-Path ".git")) {
  git init -b $DefaultBranch
} else {
  git branch -M $DefaultBranch
}

Step "Checking GitHub authentication"
gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  gh auth login --hostname github.com --git-protocol ssh --web
}

$Owner = (gh api user --jq ".login").Trim()
$RepoSlug = "$Owner/$RepoName"
$Visibility = if ($Public) { "--public" } else { "--private" }

Step "Creating GitHub repository $RepoSlug"
gh repo view $RepoSlug 1>$null 2>$null
if ($LASTEXITCODE -ne 0) {
  gh repo create $RepoSlug $Visibility --description $Description --source . --remote origin --disable-wiki --disable-issues=false
} else {
  if (-not (git remote get-url origin 2>$null)) {
    git remote add origin "git@github.com:$RepoSlug.git"
  }
}

Step "Installing dependencies and hooks"
pnpm install

Step "Creating initial commit if needed"
git add .
$HasChanges = git status --porcelain
if ($HasChanges) {
  git commit -m "chore(ci): initialize github workflow"
} else {
  Write-Host "No local changes to commit."
}

Step "Pushing $DefaultBranch"
git push -u origin $DefaultBranch

Step "Configuring repository secrets"
gh secret set SSH_HOST --body $SshHost --repo $RepoSlug
gh secret set SSH_USER --body $SshUser --repo $RepoSlug
gh secret set SSH_PORT --body $SshPort --repo $RepoSlug

$ResolvedKeyPath = Resolve-Path $SshKeyPath
gh secret set SSH_KEY --repo $RepoSlug < $ResolvedKeyPath

Step "Configuring repository variables"
gh variable set APP_DIR --body "/opt/agahiram" --repo $RepoSlug
gh variable set PRODUCTION_DOMAIN --body "agahiram.ir" --repo $RepoSlug

Step "Configuring repository settings"
gh repo edit $RepoSlug --enable-issues=true --enable-projects=false --enable-wiki=false --enable-auto-merge=true --delete-branch-on-merge=true

Step "Configuring main branch protection"
$Protection = @{
  required_status_checks = @{
    strict = $true
    contexts = @("Format, Typecheck and Build")
  }
  enforce_admins = $false
  required_pull_request_reviews = @{
    dismiss_stale_reviews = $true
    required_approving_review_count = 0
  }
  restrictions = $null
  allow_force_pushes = $false
  allow_deletions = $false
  required_linear_history = $true
  required_conversation_resolution = $true
} | ConvertTo-Json -Depth 10

$Protection | gh api --method PUT "repos/$RepoSlug/branches/$DefaultBranch/protection" `
  -H "Accept: application/vnd.github+json" `
  --input -

Step "Done"
Write-Host "Repository: https://github.com/$RepoSlug"
Write-Host "Actions:    https://github.com/$RepoSlug/actions"

