# BluePhoenix v2

A project manager for developers, built with Tauri v2, React and Rust. Track your projects, see each folder's real git branch and state, run git actions and build commands, open projects in any editor or terminal, keep to-dos and time per project, and use AI (local or cloud) to save typing. An iOS companion app syncs your projects through your own database.

**Using the app?** Read the [user guide](docs/README.md).

## Build and run

You need Node.js 20+, pnpm, and Rust ([rustup.rs](https://rustup.rs)). Platform extras: Xcode Command Line Tools on macOS, the Microsoft C++ Build Tools on Windows, and the [Tauri Linux libraries](https://tauri.app/start/prerequisites/#linux).

| Task | macOS / Linux | Windows |
| --- | --- | --- |
| Run in development | `scripts/dev.sh` | `scripts\dev.bat` (or `dev.ps1`) |
| Build installers | `scripts/build-macos.sh` → `.app` + `.dmg` (`--universal` for Intel + Apple Silicon) | `scripts\build-windows.bat` → NSIS `.exe` + `.msi` |
| Linux installers | `scripts/build-linux.sh` → `.deb` + `.AppImage` | n/a |

Installers are written to `src-tauri/target/release/bundle/`. Each build script checks its prerequisites and tells you what is missing. Builds are unsigned.

Other commands: `pnpm test` (frontend), `cargo test` in `src-tauri` (backend), `pnpm typecheck`.

## Layout

```
src/            React + TypeScript + Tailwind UI
src-tauri/      Rust backend (git, terminals, AI, updater, database)
docs/           User guide
scripts/        Dev and installer scripts
ios/            SwiftUI companion app
```

## Updates

The app compares its version with `bluephoenix-v.json` and fetches installer links from `bluephoenix-d.json` in the MintFlow-Releases repository. Set the new version in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json` before building a release.
