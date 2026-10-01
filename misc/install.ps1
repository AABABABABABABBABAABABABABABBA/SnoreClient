# SnoreClient installer for Windows.
# Run in PowerShell:
#   irm https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/install.ps1 | iex
# Add -Uninstall / -Repair by downloading the file and running: .\install.ps1 -Uninstall

param(
    [switch]$Uninstall,
    [switch]$Repair
)

$ErrorActionPreference = "Stop"
$Repo = "aababababababbabaabababababba/SnoreClient"
$Release = "https://github.com/$Repo/releases/latest/download"
$Installer = "https://github.com/Equicord/Equilotl/releases/latest/download"
$Dir = Join-Path $env:LOCALAPPDATA "SnoreClient"
$Dist = Join-Path $Dir "dist\desktop"

New-Item -ItemType Directory -Force -Path $Dist | Out-Null

$arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "EquilotlCli-arm64.exe" } else { "EquilotlCli.exe" }
$cli = Join-Path $Dir $arch

Write-Host "Downloading installer..." -ForegroundColor Cyan
Invoke-WebRequest "$Installer/$arch" -OutFile $cli

if (-not $Uninstall) {
    Write-Host "Downloading SnoreClient..." -ForegroundColor Cyan
    foreach ($f in "patcher.js", "preload.js", "renderer.js", "renderer.css") {
        Invoke-WebRequest "$Release/$f" -OutFile (Join-Path $Dist $f)
    }
    Set-Content -Path (Join-Path $Dist "package.json") -Value '{"name":"snoreclient","main":"patcher.js"}'
}

$env:EQUICORD_USER_DATA_DIR = $Dir
$env:EQUICORD_DIRECTORY = $Dist
$env:EQUICORD_DEV_INSTALL = "1"

$action = if ($Uninstall) { "--uninstall" } elseif ($Repair) { "--repair" } else { "--install" }
Write-Host "Running installer ($action). Pick your Discord install when asked." -ForegroundColor Cyan
& $cli $action

if ($LASTEXITCODE -eq 0 -and -not $Uninstall) {
    Write-Host "`nSnoreClient installed. Fully quit Discord (tray icon too) and start it again." -ForegroundColor Green
    Write-Host "Updates: the built in updater under Settings > SnoreClient > Updater pulls new builds from GitHub." -ForegroundColor Green
}
