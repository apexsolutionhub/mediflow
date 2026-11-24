<#
.SYNOPSIS
  Brings a clinic server back from a backup (new PC, failed disk, or a damaged database).

.DESCRIPTION
  Run it AFTER install_clinic_node.ps1 has set the PC up (Python, MySQL, BackEnd\.env, an empty
  database). It checks the backup, replaces the local database with it, and marks the server as
  needing a sync, so staff cannot sign in until the manager has synced with the cloud.

    powershell -ExecutionPolicy Bypass -File clinic-node\restore_clinic_node.ps1 -BackupFile E:\MediFlowBackups\mediflow-...sql.gz

  Without -BackupFile it uses the newest backup in the folder given by -From (or BACKUP_COPY_DIR /
  BACKUP_DIR from BackEnd\.env). Run it from an administrator PowerShell.
#>
[CmdletBinding()]
param(
  [string]$BackupFile = "",
  [string]$From = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "BackEnd"
$EnvFile = Join-Path $Backend ".env"
$Python = Join-Path $Backend "venv\Scripts\python.exe"

function Step($text) { Write-Host "`n== $text" -ForegroundColor Cyan }
function Fail($text) { Write-Host "`nSTOP: $text" -ForegroundColor Red; exit 1 }

if (-not (Test-Path $Python)) { Fail "The backend is not installed yet. Run install_clinic_node.ps1 first." }
if (-not (Test-Path $EnvFile)) { Fail "BackEnd\.env is missing. Run install_clinic_node.ps1 first." }

$settings = @{}
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match "^\s*([^#=\s]+)\s*=\s*(.*)$") { $settings[$Matches[1]] = $Matches[2].Trim() }
}

# --- 1. Find the backup ---
Step "Finding the backup"
if (-not $BackupFile) {
  $folder = if ($From) { $From } elseif ($settings.BACKUP_COPY_DIR) { $settings.BACKUP_COPY_DIR } elseif ($settings.BACKUP_DIR) { $settings.BACKUP_DIR } else { Join-Path $Root "backups" }
  if (-not (Test-Path $folder)) { Fail "Backup folder not found: $folder. Plug in the USB drive or give -BackupFile / -From." }
  $newest = Get-ChildItem $folder -Filter "mediflow-*.sql.gz" | Sort-Object Name -Descending | Select-Object -First 1
  if (-not $newest) { Fail "No mediflow-*.sql.gz backups in $folder." }
  $BackupFile = $newest.FullName
}
if (-not (Test-Path $BackupFile)) { Fail "Backup file not found: $BackupFile" }
Write-Host "Using $BackupFile"

# An encrypted backup needs its passphrase. Normally it is in BackEnd\.env; on a rebuilt PC it may not be.
$header = [byte[]]::new(5)
$stream = [IO.File]::OpenRead($BackupFile)
try { [void]$stream.Read($header, 0, 5) } finally { $stream.Dispose() }
if ([Text.Encoding]::ASCII.GetString($header) -eq "MFBK1" -and -not $settings.BACKUP_PASSPHRASE) {
  Write-Host "This backup is encrypted and BackEnd\.env has no BACKUP_PASSPHRASE." -ForegroundColor Yellow
  $secure = Read-Host "Enter the backup passphrase the manager keeps" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { $env:BACKUP_PASSPHRASE = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  Write-Host "(After the restore, add BACKUP_PASSPHRASE to BackEnd\.env so new backups are encrypted with it too.)"
}

# --- 2. Check it before touching anything ---
Step "Checking the backup is complete"
Push-Location $Backend
try {
  $env:NODE_MODE = "clinic"
  & $Python manage.py verify_backup --file $BackupFile
  if ($LASTEXITCODE -ne 0) { Fail "That backup is damaged. Try the next newest one with -BackupFile." }

  # --- 3. Confirm ---
  Write-Host "`nThis REPLACES everything in the local MediFlow database ($($settings.DB_NAME)) with that backup." -ForegroundColor Yellow
  Write-Host "Work done after the backup was taken and not yet synced to the cloud will be lost." -ForegroundColor Yellow
  $answer = Read-Host "Type RESTORE to continue"
  if ($answer -ne "RESTORE") { Fail "Cancelled. Nothing was changed." }

  # --- 4. Restore ---
  Step "Restoring"
  & $Python manage.py restore_backup --yes --file $BackupFile
  if ($LASTEXITCODE -ne 0) { Fail "The restore failed. The messages above say why; the old database may be partly replaced, so do not start MediFlow until it succeeds." }
  & $Python manage.py migrate --noinput
} finally { Pop-Location }

Write-Host "`nRestored. Next:" -ForegroundColor Green
Write-Host "  1. Start MediFlow (the desktop shortcut)."
Write-Host "  2. The manager signs in and presses Sync now on the Sync page. Staff cannot sign in until that sync finishes."
Write-Host "  3. Check recent patients and today's payments, then tell the clinic what time the backup was from."
