<#
.SYNOPSIS
  Build BluePhoenix for Windows and create the installers (NSIS .exe and .msi).
.PARAMETER Debug   Faster, unoptimised build.
.PARAMETER Clean   Remove previous build output first.
.PARAMETER Open    Open the output folder when finished.
.PARAMETER Arm64   Build for Windows on ARM (needs the aarch64-pc-windows-msvc Rust target).
#>
param([switch]$Debug, [switch]$Clean, [switch]$Open, [switch]$Arm64)
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

function Step($m) { Write-Host "`n> $m" -ForegroundColor Cyan }
function Fail($m) { Write-Host "x $m" -ForegroundColor Red; exit 1 }

if ($env:OS -ne 'Windows_NT') { Fail 'This script builds the Windows app and must run on Windows.' }

Step 'Checking prerequisites'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail 'Node.js is missing. Install 20+ from https://nodejs.org' }
if ([int](node -p "process.versions.node.split('.')[0]") -lt 20) { Fail "Node.js 20 or newer is required (found $(node -v))." }
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) { Fail 'Rust is missing. Install it from https://rustup.rs' }
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  if (Get-Command corepack -ErrorAction SilentlyContinue) { corepack enable pnpm } else { Fail 'pnpm is missing. See https://pnpm.io/installation' }
}

# Microsoft C++ Build Tools (MSVC)
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$hasMsvc = $false
if (Test-Path $vswhere) {
  $hasMsvc = [bool](& $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath)
}
if (-not $hasMsvc) { Fail 'Microsoft C++ Build Tools are missing. Install "Desktop development with C++" from https://visualstudio.microsoft.com/visual-cpp-build-tools/' }

# WebView2 runtime (ships with Windows 11; the installer also bootstraps it)
$wv = 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
if (-not (Test-Path $wv)) { Write-Host '  note: WebView2 runtime not detected on this PC; the installer will download it for users.' -ForegroundColor Yellow }

Write-Host "  node $(node -v), pnpm $(pnpm -v), $(rustc --version)"

$profile = if ($Debug) { 'debug' } else { 'release' }
$targetArgs = @()
$triple = $null
if ($Arm64) { rustup target add aarch64-pc-windows-msvc; $triple = 'aarch64-pc-windows-msvc'; $targetArgs += @('--target', $triple) }
if ($Debug) { $targetArgs += '--debug' }
$outDir = if ($triple) { "src-tauri\target\$triple\$profile\bundle" } else { "src-tauri\target\$profile\bundle" }

if ($Clean) { Step 'Cleaning previous output'; Remove-Item -Recurse -Force dist, $outDir -ErrorAction SilentlyContinue }

Step 'Installing JavaScript dependencies'
pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { pnpm install; if ($LASTEXITCODE -ne 0) { Fail 'pnpm install failed' } }

Step 'Building BluePhoenix (this takes a few minutes the first time)'
pnpm tauri build --bundles nsis,msi @targetArgs
if ($LASTEXITCODE -ne 0) { Fail 'The build failed. See the messages above.' }

Step 'Done'
$found = Get-ChildItem -Path $outDir -Recurse -Include *.exe, *.msi -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match '\\(nsis|msi)\\' }
if (-not $found) { Fail "Build finished but no installer was found in $outDir" }
$found | ForEach-Object { Write-Host "  Installer: $($_.FullName)" }
Write-Host "`n  The build is unsigned. SmartScreen may show a warning: More info > Run anyway."
if ($Open) { Invoke-Item $outDir }
