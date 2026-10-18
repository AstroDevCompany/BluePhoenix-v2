#!/usr/bin/env bash
# Build BluePhoenix for macOS and create the installer bundles (.app and .dmg).
#
# Usage: scripts/build-macos.sh [--universal] [--debug] [--clean] [--open] [--run]
#   --universal  build one app for both Apple Silicon and Intel Macs
#   --debug      faster, unoptimised build
#   --clean      remove previous build output first
#   --open       reveal the finished bundles in Finder
#   --run        launch the built app when done
set -euo pipefail
cd "$(dirname "$0")/.."

UNIVERSAL=0; DEBUG=0; CLEAN=0; OPEN=0; RUN=0
for a in "$@"; do
  case "$a" in
    --universal) UNIVERSAL=1 ;;
    --debug) DEBUG=1 ;;
    --clean) CLEAN=1 ;;
    --open) OPEN=1 ;;
    --run) RUN=1 ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) echo "Unknown option: $a" >&2; exit 2 ;;
  esac
done

step() { printf '\n\033[1;34m▸ %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(uname -s)" = "Darwin" ] || fail "This script builds the macOS app and must run on a Mac."

step "Checking prerequisites"
xcode-select -p >/dev/null 2>&1 || fail "Xcode Command Line Tools are missing. Run: xcode-select --install"
command -v node  >/dev/null || fail "Node.js is missing. Install 20+ from https://nodejs.org"
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 20 ] || fail "Node.js 20 or newer is required (found $(node -v))."
command -v cargo >/dev/null || fail "Rust is missing. Install it from https://rustup.rs"
if ! command -v pnpm >/dev/null; then
  command -v corepack >/dev/null && corepack enable pnpm || fail "pnpm is missing. See https://pnpm.io/installation"
fi
echo "  node $(node -v), pnpm $(pnpm -v), $(rustc --version)"

TARGET_ARGS=()
OUT_DIR="src-tauri/target/release/bundle"
if [ "$UNIVERSAL" = 1 ]; then
  step "Adding Rust targets for a universal build"
  rustup target add aarch64-apple-darwin x86_64-apple-darwin
  TARGET_ARGS=(--target universal-apple-darwin)
  OUT_DIR="src-tauri/target/universal-apple-darwin/release/bundle"
fi
if [ "$DEBUG" = 1 ]; then
  TARGET_ARGS+=(--debug)
  OUT_DIR="${OUT_DIR/release/debug}"
fi

if [ "$CLEAN" = 1 ]; then
  step "Cleaning previous output"
  rm -rf dist "$OUT_DIR"
fi

step "Installing JavaScript dependencies"
pnpm install --frozen-lockfile || pnpm install

step "Building BluePhoenix (this takes a few minutes the first time)"
pnpm tauri build --bundles app,dmg ${TARGET_ARGS[@]+"${TARGET_ARGS[@]}"}

step "Done"
APP=$(ls -d "$OUT_DIR"/macos/*.app 2>/dev/null | head -1 || true)
DMG=$(ls "$OUT_DIR"/dmg/*.dmg 2>/dev/null | head -1 || true)
[ -n "$APP" ] && echo "  App:       $APP"
[ -n "$DMG" ] && echo "  Installer: $DMG"
[ -n "${DMG:-}${APP:-}" ] || fail "Build finished but no bundle was found in $OUT_DIR"
echo
echo "  The build is unsigned. On first launch right-click the app → Open."

[ "$OPEN" = 1 ] && open "$OUT_DIR"
[ "$RUN" = 1 ] && [ -n "$APP" ] && open "$APP"
exit 0
