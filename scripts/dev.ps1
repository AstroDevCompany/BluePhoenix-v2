# Launch BluePhoenix in development mode (hot reload) on Windows.
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

function Need($cmd, $hint) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { Write-Host "x $cmd is required. $hint" -ForegroundColor Red; exit 1 }
}
Need node  'Install Node.js 20+ from https://nodejs.org'
Need cargo 'Install Rust from https://rustup.rs'
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  if (Get-Command corepack -ErrorAction SilentlyContinue) { corepack enable pnpm } else { Need pnpm 'See https://pnpm.io/installation' }
}
if (-not (Test-Path node_modules)) { pnpm install }
pnpm tauri dev @args
