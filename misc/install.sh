#!/usr/bin/env bash
# SnoreClient installer bootstrap for Linux and macOS.
#   bash -c "$(curl -fsSL https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/install.sh)"
set -euo pipefail
BASE="https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download"
case "$(uname -s)-$(uname -m)" in
    Linux-aarch64 | Linux-arm64) BIN="SnoreClientInstallerCli-linux-arm64" ;;
    Linux-*) BIN="SnoreClientInstallerCli-linux" ;;
    Darwin-arm64) BIN="SnoreClientInstallerCli-arm64" ;;
    Darwin-x86_64) BIN="SnoreClientInstallerCli-x64" ;;
    Darwin-*) BIN="SnoreClientInstallerCli-universal" ;;
    *) echo "Unsupported platform"; exit 1 ;;
esac
OUT="$(mktemp -d)/$BIN"
echo "Downloading $BIN..."
curl -fsSL "$BASE/$BIN" -o "$OUT"
chmod +x "$OUT"
if [ "$(uname -s)" = "Linux" ] && [ "$(id -u)" -ne 0 ]; then
    for c in sudo doas; do command -v "$c" >/dev/null && exec "$c" "$OUT" "$@"; done
fi
exec "$OUT" "$@"
