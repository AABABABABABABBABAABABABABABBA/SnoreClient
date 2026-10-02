#!/usr/bin/env bash
# Builds an unsigned SnoreClient.ipa. Run from the ios/ directory on macOS after xcodegen.
set -euo pipefail
xcodebuild -project SnoreClient.xcodeproj -scheme SnoreClient -configuration Release -sdk iphoneos \
    -derivedDataPath build/derived \
    CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" DEVELOPMENT_TEAM="" \
    build | tail -20
rm -rf build/Payload build/SnoreClient.ipa
mkdir -p build/Payload
cp -R build/derived/Build/Products/Release-iphoneos/SnoreClient.app build/Payload/
# Ad hoc signature (no identity, no certificate). Gives the bundle a valid _CodeSignature so TrollStore,
# AltStore, Sideloadly and friends accept it; sideloaders replace it with their own signature anyway.
cat > build/entitlements.plist <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
    <key>application-identifier</key><string>pw.snore.client</string>
    <key>get-task-allow</key><false/>
</dict></plist>
PLIST
codesign --force --sign - --entitlements build/entitlements.plist --timestamp=none build/Payload/SnoreClient.app
codesign -dv build/Payload/SnoreClient.app 2>&1 | head -5
(cd build && zip -qr SnoreClient.ipa Payload)
ls -la build/SnoreClient.ipa
