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
(cd build && zip -qr SnoreClient.ipa Payload)
ls -la build/SnoreClient.ipa
