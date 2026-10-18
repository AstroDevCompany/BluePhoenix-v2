# BluePhoenix for iPhone

SwiftUI companion app. It talks straight to the same PostgreSQL database as the desktop app (Neon by default) and keeps an offline copy of your projects, to-dos, notes and time entries.

- iOS 17+, SwiftUI, [PostgresNIO](https://github.com/vapor/postgres-nio) over TLS
- Sync is last-write-wins on `updated_at`, with deletion tombstones, the same rules as the desktop app (`src-tauri/src/sync.rs`)
- The database address lives in the iOS keychain

## Build

```bash
brew install xcodegen          # once
cd ios
xcodegen generate              # creates BluePhoenix.xcodeproj from project.yml
open BluePhoenix.xcodeproj     # pick your iPhone, press Run
```

Set your own Apple team in `project.yml` (`DEVELOPMENT_TEAM`) and change the bundle identifier if needed. Command line build for a connected phone:

```bash
xcodebuild -project BluePhoenix.xcodeproj -scheme BluePhoenix \
  -destination 'id=<DEVICE-UDID>' -allowProvisioningUpdates build
```

(`xcrun devicectl list devices` shows the UDID.)
