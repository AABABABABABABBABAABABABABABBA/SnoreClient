# SnoreClient server

Self hosted backend for SnoreClient. One Node.js process, one SQLite file, zero npm dependencies.

What it serves:

| Path | Purpose |
| --- | --- |
| `/` | Landing page with the server URL to paste into the client |
| `/plugins`, `/plugins/:name`, `/plugins.json` | Plugin browser, fed from the `plugins.json` on your latest GitHub release (or `data/plugins.json` if present) |
| `/download`, `/release/:file` | Download page and redirects to the latest release assets |
| `/privacy`, `/health`, `/assets/*` | Privacy policy, health check, static assets (logo) |
| `/v1/oauth/settings`, `/v1/oauth/callback` | Discord OAuth used by the client to connect |
| `/v1/settings` (GET/PUT/DELETE), `DELETE /v1/` | Vencord compatible settings sync and account erase |
| `/v2/sync`, `/v2/manifest`, `/v2/data/:key` | Keyed sync (settings, QuickCSS, plugin data) used by newer clients |

Any Vencord or Equicord client can also point at this server, since the API is the same one they already speak.

## 1. Discord application

1. Go to <https://discord.com/developers/applications> and create an application.
2. Copy the **Client ID** and **Client Secret** from the OAuth2 page.
3. Under **OAuth2 → Redirects** add `https://YOUR_DOMAIN/v1/oauth/callback`.

## 2a. Run with Docker (recommended)

```shell
git clone https://github.com/aababababababbabaabababababba/SnoreClient /opt/snoreclient
cd /opt/snoreclient/server
cp .env.example .env
nano .env         # PUBLIC_URL, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET
echo "SNORE_DOMAIN=snore.yourdomain.com" >> .env
docker compose up -d
docker compose logs -f snoreclient
```

Point your domain's DNS A/AAAA record at the VPS first. Caddy obtains and renews the TLS certificate on its own. Data lives in the `snore-data` Docker volume.

Update later with `git pull && docker compose up -d --build`.

## 2b. Run bare metal with systemd

```shell
curl -fsSL https://raw.githubusercontent.com/aababababababbabaabababababba/SnoreClient/main/server/deploy/install.sh | sudo bash
sudo nano /opt/snoreclient/server/.env
sudo systemctl start snoreclient
sudo journalctl -u snoreclient -f
```

Then put a reverse proxy in front. For Caddy, copy `deploy/Caddyfile.bare` to `/etc/caddy/Caddyfile`, change the domain and `systemctl reload caddy`. For nginx, proxy `/` to `127.0.0.1:8080` and forward `X-Forwarded-For`.

## 3. Connect the client

- Build it against your server: `SNORECLIENT_SERVER_URL=https://snore.yourdomain.com pnpm build`
- Or, inside Discord, open **Settings → SnoreClient → Cloud**, paste `https://snore.yourdomain.com/` into the backend field, and enable Cloud Integration. A Discord authorization popup appears, after which sync is live.

## Configuration

All options are documented in [`.env.example`](./.env.example). Notable ones:

- `ALLOWED_USER_IDS` makes the server private to a list of Discord user ids.
- `GITHUB_REPO` controls where `/download` and `/plugins` pull from.
- `TRUST_PROXY=1` is required behind a reverse proxy so rate limits apply per real client IP.
- `data/plugins.json` overrides the plugin list fetched from GitHub. Generate it from the client repo with `pnpm generatePluginJson server/data/plugins.json`.

## Development

```shell
cd server
cp .env.example .env
npm run dev        # restarts on file changes
npm test           # protocol tests against an in memory instance
```

## Backup

The whole state is the SQLite file at `DATA_DIR/snoreclient.sqlite` (plus `-wal`/`-shm` while running). Copy it with `sqlite3 snoreclient.sqlite ".backup backup.sqlite"` or stop the service first.
