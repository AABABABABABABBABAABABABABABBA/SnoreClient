#!/usr/bin/env bash
# Bare metal installer for the SnoreClient server on Debian/Ubuntu.
# Usage: sudo bash deploy/install.sh
set -euo pipefail

REPO="${SNORE_REPO:-https://github.com/aababababababbabaabababababba/SnoreClient}"
DEST=/opt/snoreclient

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
    echo "Installing Node.js 22"
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi

id -u snoreclient >/dev/null 2>&1 || useradd --system --home "$DEST" --shell /usr/sbin/nologin snoreclient

if [ -d "$DEST/.git" ]; then
    git -C "$DEST" pull --ff-only
else
    git clone --depth 1 "$REPO" "$DEST"
fi

mkdir -p "$DEST/server/data"
[ -f "$DEST/server/.env" ] || cp "$DEST/server/.env.example" "$DEST/server/.env"
chown -R snoreclient:snoreclient "$DEST"

install -m 644 "$DEST/server/deploy/snoreclient.service" /etc/systemd/system/snoreclient.service
systemctl daemon-reload
systemctl enable snoreclient

cat <<MSG

Installed to $DEST/server.
1. Edit $DEST/server/.env (PUBLIC_URL, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET).
2. Put a reverse proxy in front, e.g. copy $DEST/server/deploy/Caddyfile.bare to /etc/caddy/Caddyfile.
3. sudo systemctl start snoreclient && journalctl -u snoreclient -f
MSG
