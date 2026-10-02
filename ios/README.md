# SnoreClient for iOS

An unsigned `.ipa` that wraps Discord's web app in a WebView and injects the SnoreClient userscript, so plugins, themes and cloud sync work on iPhone and iPad. It is not a modification of the native Discord app, which cannot be patched the way the desktop client can.

The IPA ships **unsigned**. Install it with:

- **TrollStore** on a supported iOS version: open the IPA with TrollStore and it installs as is.
- **AltStore, Sideloadly, Sidestore or ESign**: these sign the IPA with your own Apple ID at install time, so no certificate is needed from us.

Download: <https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClient.ipa>

## What works

Chat, servers, DMs, settings, every SnoreClient web plugin, themes and QuickCSS, cloud sync against snore.pw, voice chat through WebKit (microphone permission is granted to discord.com automatically).

## Limits

Screen share, Krisp noise suppression and push notifications are not available in WebKit. Discord may serve the mobile web layout; desktop-only plugins stay hidden exactly like in a browser.

## Building locally

Needs macOS with Xcode and [xcodegen](https://github.com/yonaskolb/XcodeGen).

```shell
pnpm buildWeb                          # from the repo root
cp dist/SnoreClient.user.js ios/SnoreClient/Resources/
cd ios && xcodegen && ./build.sh       # produces build/SnoreClient.ipa
```
