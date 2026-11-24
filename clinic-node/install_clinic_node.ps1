<#
.SYNOPSIS
  Sets up a MediFlow clinic server on this PC (docs/OFFLINE_SYNC_CONTRACT.md, section 5).

.DESCRIPTION
  1. Checks Python and MySQL are installed.
  2. Creates the backend's Python environment and installs what it needs.
  3. Writes BackEnd\.env (asks for the clinic TIN, branch, node token and database password).
  4. Creates the local database and applies migrations.
  5. Opens the firewall for the clinic network (private networks only).
  6. Runs the initial seed from the cloud (needs internet once).
  7. Schedules a database backup every 4 hours (and to a second disk if you give one).
  8. Puts a "MediFlow" shortcut on the desktop; optionally starts it at sign-in.

  Run it from an administrator PowerShell, from the repository folder:
    powershell -ExecutionPolicy Bypass -File clinic-node\install_clinic_node.ps1

  It can be run again: it keeps what already exists.
#>
[CmdletBinding()]
param(
  [switch]$AutoStart,
  [switch]$SkipSeed,
  # A second disk or USB drive for backup copies, e.g. E:\MediFlowBackups
  [string]$BackupCopyDir = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "BackEnd"
$EnvFile = Join-Path $Backend ".env"
$Python = Join-Path $Backend "venv\Scripts\python.exe"

function Step($text) { Write-Host "`n== $text" -ForegroundColor Cyan }
function Fail($text) { Write-Host "`nSTOP: $text" -ForegroundColor Red; exit 1 }

function Read-Value($label, $default = "") {
  $suffix = if ($default) { " [$default]" } else { "" }
  $answer = Read-Host "$label$suffix"
  if ([string]::IsNullOrWhiteSpace($answer)) { return $default }
  return $answer.Trim()
}

function Read-Secret($label) {
  $secure = Read-Host $label -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Get-LanAddress {
  $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
    Select-Object -First 1
  if ($ip) { return $ip.IPAddress }
  return $null
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { Fail "Run this from a PowerShell opened as Administrator (it opens a firewall port)." }

# --- 1. Prerequisites ---
Step "Checking Python and MySQL"
$systemPython = Get-Command python -ErrorAction SilentlyContinue
if (-not $systemPython) { Fail "Python 3.12 or newer is not installed. Install it from python.org (tick 'Add to PATH'), then run this again." }
$mysql = Get-Command mysql -ErrorAction SilentlyContinue
if (-not $mysql) { Fail "MySQL 8 is not installed or 'mysql' is not on PATH. Install MySQL Server, then run this again." }
if (-not (Get-Command mysqldump -ErrorAction SilentlyContinue)) { Fail "'mysqldump' was not found on PATH. It comes with MySQL Server; add its bin folder to PATH, then run this again." }
if (-not (Test-Path (Join-Path $Root "dist-node\index.html"))) {
  Write-Host "Note: the web app (dist-node folder) was not found next to BackEnd. Copy it here before opening MediFlow." -ForegroundColor Yellow
}

# --- 2. Python environment ---
Step "Setting up the backend (this takes a few minutes the first time)"
if (-not (Test-Path $Python)) { & python -m venv (Join-Path $Backend "venv") }
& $Python -m pip install --quiet --upgrade pip
& $Python -m pip install --quiet -r (Join-Path $PSScriptRoot "requirements-node.txt")
if ($LASTEXITCODE -ne 0) { Fail "Installing the backend's requirements failed." }

# --- 3. Settings ---
Step "Clinic settings"
$dbPassword = $null
if (Test-Path $EnvFile) {
  Write-Host "BackEnd\.env already exists, keeping it."
} else {
  $tin = Read-Value "Clinic TIN (as registered with Apex)"
  if (-not $tin) { Fail "The clinic TIN is required." }
  $branch = Read-Value "Branch name" "Main"
  $cloud = Read-Value "Cloud API address" "https://mediflow-backend-delta.vercel.app/api"
  $token = Read-Secret "Node token from Apex (typing is hidden)"
  if (-not $token) { Fail "The node token is required. Ask Apex to run issue_sync_node for this branch." }
  $dbPassword = Read-Secret "Choose a password for the local database (typing is hidden)"
  if (-not $dbPassword) { Fail "A database password is required." }

  $lan = Get-LanAddress
  $hosts = @("127.0.0.1", "localhost", $env:COMPUTERNAME, $lan) | Where-Object { $_ }
  $secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 50 | ForEach-Object { [char]$_ })
  $text = (Get-Content (Join-Path $PSScriptRoot "clinic.env.example") -Raw)
  $text = $text -replace "(?m)^SECRET_KEY=.*$", "SECRET_KEY=$secret"
  $text = $text -replace "(?m)^ALLOWED_HOSTS=.*$", "ALLOWED_HOSTS=$($hosts -join ',')"
  $text = $text -replace "(?m)^NODE_CLINIC_TIN=.*$", "NODE_CLINIC_TIN=$tin"
  $text = $text -replace "(?m)^NODE_BRANCH=.*$", "NODE_BRANCH=$branch"
  $text = $text -replace "(?m)^CLOUD_API_URL=.*$", "CLOUD_API_URL=$cloud"
  $text = $text -replace "(?m)^NODE_TOKEN=.*$", "NODE_TOKEN=$token"
  $text = $text -replace "(?m)^DB_PASSWORD=.*$", "DB_PASSWORD=$dbPassword"
  if ($BackupCopyDir) { $text = $text -replace "(?m)^BACKUP_COPY_DIR=.*$", "BACKUP_COPY_DIR=$BackupCopyDir" }
  Set-Content -Path $EnvFile -Value $text -Encoding UTF8
  Write-Host "Wrote BackEnd\.env"
}
$settings = @{}
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match "^\s*([^#=\s]+)\s*=\s*(.*)$") { $settings[$Matches[1]] = $Matches[2].Trim() }
}

# --- 4. Database ---
Step "Creating the local database"
$rootPassword = Read-Secret "MySQL 'root' password (typing is hidden; only used to create the database)"
$sql = @"
CREATE DATABASE IF NOT EXISTS ``$($settings.DB_NAME)`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$($settings.DB_USER)'@'localhost' IDENTIFIED BY '$($settings.DB_PASSWORD)';
GRANT ALL PRIVILEGES ON ``$($settings.DB_NAME)``.* TO '$($settings.DB_USER)'@'localhost';
FLUSH PRIVILEGES;
"@
$env:MYSQL_PWD = $rootPassword
try { $sql | & mysql --user=root --host=$($settings.DB_HOST) --port=$($settings.DB_PORT) }
finally { Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue }
if ($LASTEXITCODE -ne 0) { Fail "Could not create the database. Check the MySQL root password and that MySQL is running." }

Push-Location $Backend
try {
  $env:NODE_MODE = "clinic"
  & $Python manage.py migrate --noinput
  if ($LASTEXITCODE -ne 0) { Fail "Applying database migrations failed." }
} finally { Pop-Location }

# --- 5. Firewall ---
Step "Opening the clinic network port (private networks only)"
$port = if ($settings.NODE_PORT) { [int]$settings.NODE_PORT } else { 80 }
if (-not (Get-NetFirewallRule -DisplayName "MediFlow Clinic Server" -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName "MediFlow Clinic Server" -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow -Profile Private | Out-Null
}
Write-Host "Port $port is open on private networks."

# --- 6. Initial seed ---
if ($SkipSeed) {
  Write-Host "Skipping the initial seed. Run it later: BackEnd\venv\Scripts\python BackEnd\manage.py node_sync --seed"
} else {
  Step "Initial seed from the cloud (needs internet)"
  Push-Location $Backend
  try {
    $env:NODE_MODE = "clinic"
    & $Python manage.py node_sync --seed
    if ($LASTEXITCODE -ne 0) { Write-Host "The seed did not finish. Fix the message above, then run: manage.py node_sync --seed" -ForegroundColor Yellow }
  } finally { Pop-Location }
}

# --- 7. Backups ---
Step "Scheduling backups (every 4 hours)"
if (-not $settings.BACKUP_COPY_DIR -and -not $BackupCopyDir) {
  Write-Host "No second disk was given. Re-run with -BackupCopyDir E:\MediFlowBackups (a USB drive or second disk) so one failed disk cannot lose everything." -ForegroundColor Yellow
}
$backupAction = New-ScheduledTaskAction -Execute $Python -Argument "manage.py run_backup --reason scheduled" -WorkingDirectory $Backend
$backupTrigger = New-ScheduledTaskTrigger -Once -At "06:00" -RepetitionInterval (New-TimeSpan -Hours 4) -RepetitionDuration (New-TimeSpan -Days 1)
$backupSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName "MediFlow Backup" -Action $backupAction -Trigger $backupTrigger -Settings $backupSettings -Force | Out-Null
Write-Host "Backups run every 4 hours and are kept for $(if ($settings.BACKUP_KEEP_DAYS) { $settings.BACKUP_KEEP_DAYS } else { 7 }) days."
Push-Location $Backend
try {
  $env:NODE_MODE = "clinic"
  & $Python manage.py run_backup --reason install
  if ($LASTEXITCODE -ne 0) { Write-Host "The first backup did not work. Fix the message above; the schedule will keep trying." -ForegroundColor Yellow }
} finally { Pop-Location }

# --- 8. Shortcut and optional auto-start ---
Step "Shortcut"
$starter = Join-Path $PSScriptRoot "start_clinic.bat"
$shell = New-Object -ComObject WScript.Shell
$link = $shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath("Desktop")) "MediFlow.lnk"))
$link.TargetPath = $starter
$link.WorkingDirectory = $Root
$link.Save()
Write-Host "Added a MediFlow shortcut to the desktop."
if ($AutoStart) {
  $action = New-ScheduledTaskAction -Execute $starter
  $trigger = New-ScheduledTaskTrigger -AtLogOn
  Register-ScheduledTask -TaskName "MediFlow Clinic Server" -Action $action -Trigger $trigger -Force | Out-Null
  Write-Host "MediFlow will start when this PC user signs in."
}

$lan = Get-LanAddress
Write-Host "`nDone. Open the MediFlow shortcut. Other PCs connect to http://$lan/" -ForegroundColor Green
Write-Host "Tip: give this PC a fixed address in your router so that link never changes."
