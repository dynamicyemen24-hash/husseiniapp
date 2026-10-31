param(
  [string]$Scenario = "smoke"
)

<#
  Load-test runner for the Husseiniya platform (local dev server).

  Usage:
    powershell -ExecutionPolicy Bypass -File scripts/run-load-test.ps1 [smoke|quick|load|stress]

  Requirements:
    - Dev server running on http://localhost:3000
    - k6 downloaded (node scripts/dl-k6.mjs) — a local copy lives in .\k6\k6-v2.2.0-windows-amd64\
    - Session token: it is auto-fetched from cookies.txt (created by test-endpoints.bat)
      or by re-running the login flow against the live server.
#>

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$k6 = Join-Path $root "k6\k6-v2.2.0-windows-amd64\k6.exe"

if (!(Test-Path $k6)) {
  Write-Host "k6 not found at $k6" -ForegroundColor Red
  Write-Host "Download it first: node scripts/dl-k6.mjs" -ForegroundColor Yellow
  exit 1
}

# --- Ensure we have a fresh session token --------------------------------
$cookieFile = Join-Path $root "cookies.txt"
$cookie = $null
if (Test-Path $cookieFile) {
  $cookie = Get-Content $cookieFile | Select-String "app_session_id" | Select-Object -First 1
}

if (!$cookie) {
  Write-Host "No session cookie found — running test-endpoints.bat to log in..." -ForegroundColor Cyan
  Push-Location $root
  & cmd.exe /c "test-endpoints.bat" | Out-Host
  Pop-Location
  $cookie = Get-Content $cookieFile | Select-String "app_session_id" | Select-Object -First 1
  if (!$cookie) {
    Write-Host "Failed to obtain a session token. Is the server running on :3000?" -ForegroundColor Red
    exit 1
  }
}

$token = (($cookie.ToString() -split "`t")[-1]).Trim()
if ($token.Length -lt 20) {
  Write-Host "Session token looks malformed — please re-run test-endpoints.bat." -ForegroundColor Red
  exit 1
}

$env:JWT_TOKEN = $token
$env:BASE_URL  = "http://localhost:3000"
$env:TENANT_ID = "4"
$env:K6_SCENARIO = $Scenario

Write-Host "== Running k6 scenario: $Scenario (BASE_URL=$env:BASE_URL) ==" -ForegroundColor Green
Write-Host "DASHBOARD_TOKEN_MASK: set, len=$($token.Length)" -ForegroundColor DarkGray

$logPath = Join-Path $root "k6-$Scenario.log"
# Paths here contain no spaces, so a plain redirect works — and routing through
# cmd.exe keeps k6's stderr progress lines inside $logPath instead of leaking
# them back into PowerShell as NativeCommandError records.
$k6Args = "$k6 run scripts/load-test.js > $logPath 2>&1"

Push-Location $root
# Run through cmd.exe so k6's stderr progress lines are captured to the log
# instead of being surfaced as PowerShell NativeCommandError records.
& cmd.exe /c $k6Args
$code = $LASTEXITCODE
Pop-Location

if (Test-Path $logPath) {
  Write-Host "[INFO] Log written to $logPath (tail below):" -ForegroundColor DarkGray
  Get-Content $logPath -Tail 20 | ForEach-Object { Write-Host $_ }
}

if ($code -ne 0) {
  Write-Host "[FAIL] k6 finished with exit code $code (thresholds crossed)." -ForegroundColor Red
} else {
  Write-Host "[OK] k6 finished cleanly - all thresholds passed." -ForegroundColor Green
}
exit $code