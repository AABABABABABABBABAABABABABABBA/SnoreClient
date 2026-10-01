#!/usr/bin/env bash
# SnoreClient installer for Linux and macOS.
#   bash -c "$(curl -fsSL https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/install.sh)"
# Pass --uninstall or --repair as the first argument to do that instead.
set -euo pipefail

REPO="aababababababbabaabababababba/SnoreClient"
RELEASE="https://github.com/$REPO/releases/latest/download"
INSTALLER="https://github.com/Equicord/Equilotl/releases/latest/download"
DIR="${XDG_DATA_HOME:-$HOME/.local/share}/SnoreClient"
DIST="$DIR/dist/desktop"
ACTION="${1:---install}"

case "$(uname -s)-$(uname -m)" in
    Linux-aarch64 | Linux-arm64) BIN="EquilotlCli-linux-arm64" ;;
    Linux-*) BIN="EquilotlCli-Linux" ;;
    Darwin-arm64) BIN="EquilotlCli-arm64" ;;
    Darwin-x86_64) BIN="EquilotlCli-x64" ;;
    Darwin-*) BIN="EquilotlCli-universal" ;;
    *) echo "Unsupported platform"; exit 1 ;;
esac

mkdir -p "$DIST"
echo "Downloading installer..."
curl -fsSL "$INSTALLER/$BIN" -o "$DIR/$BIN"
chmod +x "$DIR/$BIN"

if [ "$ACTION" != "--uninstall" ]; then
    echo "Downloading SnoreClient..."
    for f in patcher.js preload.js renderer.js renderer.css; do
        curl -fsSL "$RELEASE/$f" -o "$DIST/$f"
    done
    printf '{"name":"snoreclient","main":"patcher.js"}' > "$DIST/package.json"
fi

export EQUICORD_USER_DATA_DIR="$DIR"
export EQUICORD_DIRECTORY="$DIST"
export EQUICORD_DEV_INSTALL=1

SUDO=""
if [ "$(uname -s)" = "Linux" ] && [ ! -w "/opt" ] 2>/dev/null; then
    for c in sudo doas; do command -v "$c" >/dev/null && { SUDO="$c -E"; break; }; done
fi

echo "Running installer ($ACTION). Pick your Discord install when asked."
$SUDO "$DIR/$BIN" "$ACTION"

if [ "$ACTION" != "--uninstall" ]; then
    echo
    echo "SnoreClient installed. Fully quit Discord and start it again."
fi
