# SnoreClient installer bootstrap for Windows.
#   irm https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/install.ps1 | iex
# Downloads the graphical SnoreClient installer and runs it. Pass -Cli to use the terminal version.
param([switch]$Cli)
$ErrorActionPreference = "Stop"
$arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "-arm64" } else { "" }
$name = if ($Cli) { "SnoreClientInstallerCli$arch.exe" } else { "SnoreClientInstaller$arch.exe" }
$out = Join-Path $env:TEMP $name
Write-Host "Downloading $name..."
Invoke-WebRequest "https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/$name" -OutFile $out
Start-Process -Wait -FilePath $out
Remove-Item -Force $out
