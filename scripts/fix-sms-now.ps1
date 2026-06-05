#!/usr/bin/env pwsh
# Quick-fix: configure SMS.ir on production server and restart API container.
# Usage: pwsh scripts/fix-sms-now.ps1
param(
  [string]$HostName = "45.144.18.86",
  [string]$User     = "root",
  [string]$Port     = "22",
  [string]$KeyPath  = ".cache/ssh/agahiram_id_ed25519",
  [string]$AppDir   = "/opt/agahiram"
)

$SshOpts = @("-i", $KeyPath, "-p", $Port, "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=15")
$Remote  = "${User}@${HostName}"
$EnvFile = "${AppDir}/docker/.env"

Write-Host "==> Patching SMS.ir config on $Remote ..." -ForegroundColor Cyan

$patchCmd = @"
set -euo pipefail
ENV_FILE='$EnvFile'
if [[ ! -f "\$ENV_FILE" ]]; then echo "ENV file not found: \$ENV_FILE"; exit 1; fi

upd() {
  local k="\$1" v="\$2"
  if grep -q "^\${k}=" "\$ENV_FILE"; then
    sed -i "s|^\${k}=.*|\${k}=\${v}|" "\$ENV_FILE"
  else
    echo "\${k}=\${v}" >> "\$ENV_FILE"
  fi
}

upd SMS_PROVIDER      smsir
upd SMS_IR_API_KEY    95rdSxrnOS2hHkbbkdSt6jlIjnMaHyYuY2p5E6qNqHwAQa5E
upd SMS_IR_TEMPLATE_ID 307289
upd SMS_IR_PARAM_NAME  Code
upd KAVENEGAR_DEV_MODE true
upd ADMIN_PHONES       09127477990

echo 'SMS env patched successfully'
grep -E '^(SMS_|ADMIN_PHONES)' "\$ENV_FILE" | sed 's/\(SMS_IR_API_KEY=\).*/\1***/'
"@

ssh @($SshOpts + @($Remote, "bash -s")) -InputObject $patchCmd

Write-Host ""
Write-Host "==> Restarting API and worker containers ..." -ForegroundColor Cyan
$restartCmd = "cd ${AppDir}/docker && docker compose -f docker-compose.prod.yml restart api worker"
ssh @($SshOpts + @($Remote, $restartCmd))

Write-Host ""
Write-Host "==> Done. SMS.ir is now configured and API restarted." -ForegroundColor Green
Write-Host "    Test by requesting an OTP via the app."
