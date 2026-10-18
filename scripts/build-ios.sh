#!/usr/bin/env bash
# Build a release .ipa of the iPhone app.
#
# Usage: scripts/build-ios.sh [development|app-store-connect|ad-hoc]
#   development       (default) installs only on iPhones registered to your Apple team
#   app-store-connect for TestFlight / App Store (needs an Apple Distribution certificate)
#   ad-hoc            for registered devices, distributed outside the App Store
# Output: ios/build/export/BluePhoenix.ipa
set -euo pipefail
cd "$(dirname "$0")/../ios"
METHOD="${1:-development}"

command -v xcodegen >/dev/null || { echo "✗ XcodeGen is required: brew install xcodegen" >&2; exit 1; }
xcodegen generate >/dev/null

TEAM=$(grep -E 'DEVELOPMENT_TEAM:' project.yml | head -1 | awk '{print $2}')
PLIST=build/ExportOptions.plist
mkdir -p build
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>$METHOD</string>
  <key>teamID</key><string>$TEAM</string>
  <key>signingStyle</key><string>automatic</string>
</dict></plist>
PL

rm -rf build/BluePhoenix.xcarchive build/export
xcodebuild -project BluePhoenix.xcodeproj -scheme BluePhoenix -configuration Release \
  -destination 'generic/platform=iOS' -archivePath build/BluePhoenix.xcarchive \
  -allowProvisioningUpdates archive
xcodebuild -exportArchive -archivePath build/BluePhoenix.xcarchive \
  -exportOptionsPlist "$PLIST" -exportPath build/export -allowProvisioningUpdates

echo
echo "IPA: $(pwd)/build/export/BluePhoenix.ipa"
