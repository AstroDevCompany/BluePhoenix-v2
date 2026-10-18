#!/usr/bin/env bash
# Launch BluePhoenix in development mode (hot reload) on macOS or Linux.
set -euo pipefail
cd "$(dirname "$0")/.."

need() { command -v "$1" >/dev/null 2>&1 || { echo "✗ $1 is required. $2" >&2; exit 1; }; }
need node  "Install Node.js 20+ from https://nodejs.org"
need cargo "Install Rust from https://rustup.rs"
if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then corepack enable pnpm; else need pnpm "Install pnpm: https://pnpm.io/installation"; fi
fi

[ -d node_modules ] || pnpm install
exec pnpm tauri dev "$@"
