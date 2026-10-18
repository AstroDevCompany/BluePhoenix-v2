#!/usr/bin/env bash
# Build BluePhoenix for Linux (.deb and .AppImage). Needs the Tauri system libraries:
# https://tauri.app/start/prerequisites/#linux
set -euo pipefail
cd "$(dirname "$0")/.."
command -v node  >/dev/null || { echo "Node.js 20+ is required" >&2; exit 1; }
command -v cargo >/dev/null || { echo "Rust is required (https://rustup.rs)" >&2; exit 1; }
command -v pnpm  >/dev/null || { command -v corepack >/dev/null && corepack enable pnpm; }
pnpm install --frozen-lockfile || pnpm install
pnpm tauri build --bundles deb,appimage
echo
echo "Bundles:"; ls -1 src-tauri/target/release/bundle/deb/*.deb src-tauri/target/release/bundle/appimage/*.AppImage 2>/dev/null || true
