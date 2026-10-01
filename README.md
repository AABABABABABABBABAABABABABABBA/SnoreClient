# <img src="./browser/icon.png" width="40" align="left" alt="SnoreClient"> SnoreClient

[![Tests](https://github.com/aababababababbabaabababababba/SnoreClient/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/aababababababbabaabababababba/SnoreClient/actions/workflows/test.yml)
[![Release](https://github.com/aababababababbabaabababababba/SnoreClient/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/aababababababbabaabababababba/SnoreClient/actions/workflows/build.yml)

**Discord, but cozier.** SnoreClient is a Discord client mod forked from [Equicord](https://github.com/Equicord/Equicord) (itself a fork of [Vencord](https://github.com/Vendicated/Vencord)). It keeps the full plugin collection and adds:

- **A self hosted cloud.** The `server/` folder is a complete settings sync backend you can run on any VPS. Your settings, QuickCSS and plugin data sync between devices through *your* server, not someone else's.
- **A fresh look.** New logo, a redesigned settings landing panel, polished cards, and a matching web front end served by the same server.
- **Build time branding.** One environment variable points a build at your server for cloud sync, plugin pages, downloads and assets.

## Quick start (client)

[Git](https://git-scm.com/download), [Node.js 22+](https://nodejs.org) and `pnpm` (`npm i -g pnpm`) are required.

```shell
git clone https://github.com/aababababababbabaabababababba/SnoreClient
cd SnoreClient
pnpm install --frozen-lockfile

# Point the build at your server (see "Self hosting" below). Defaults to https://snore.example.com
SNORECLIENT_SERVER_URL=https://snore.yourdomain.com pnpm build

pnpm inject      # patches your Discord install (uses the Equilotl installer)
```

Other useful commands:

| Command | What it does |
| --- | --- |
| `pnpm watch` | Rebuild on change |
| `pnpm buildWeb` | Browser extension and userscript builds in `dist/` |
| `pnpm uninject` | Remove SnoreClient from Discord |
| `pnpm test` | Full lint, typecheck and build, same as CI |

You can also change the cloud backend at any time inside Discord under **Settings → SnoreClient → Cloud**, so a build made with the default URL still works once you paste your server address there.

## Self hosting the server

Everything lives in [`server/`](./server). It is a single Node 22 process with an SQLite database and no npm dependencies. It implements the Vencord cloud API (`/v1/*`) and the newer keyed sync API (`/v2/*`) that the client speaks, plus a small website: landing page, plugin browser, download page and privacy page.

Full instructions are in [`server/README.md`](./server/README.md). The short version:

1. Create a Discord application at <https://discord.com/developers/applications>, and under **OAuth2** add `https://snore.yourdomain.com/v1/oauth/callback` as a redirect.
2. On the VPS:

   ```shell
   git clone https://github.com/aababababababbabaabababababba/SnoreClient /opt/snoreclient
   cd /opt/snoreclient/server
   cp .env.example .env     # fill in PUBLIC_URL, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, SNORE_DOMAIN
   docker compose up -d     # Caddy fetches TLS certificates automatically
   ```

   Prefer no Docker? `sudo bash deploy/install.sh` sets up a systemd service instead.
3. Build the client with `SNORECLIENT_SERVER_URL=https://snore.yourdomain.com`, or paste that URL into the Cloud settings tab.

## Releases

The **Release** workflow uploads build artifacts to a GitHub release tagged `latest`. Create that release once (`gh release create latest --title "SnoreClient latest"`), and set the repository variable `SNORECLIENT_SERVER_URL` so CI builds point at your server. The built in updater and the server's download page both read from that release.

## Project layout

```
src/                     client source (plugins, API, settings UI)
src/snoreclientplugins/  plugins that came from Equicord
src/plugins/             plugins that came from Vencord
server/                  self hosted cloud + website
browser/                 browser extension manifests and icon
scripts/                 build and tooling
```

## Credits

SnoreClient stands on the shoulders of [Vencord](https://github.com/Vendicated/Vencord) by [Vendicated](https://github.com/Vendicated) and [Equicord](https://github.com/Equicord/Equicord) by thororen and contributors. Both projects are GPL-3.0 licensed, as is this one. Upstream file headers are kept intact on purpose.

## Disclaimer

Discord is a trademark of Discord Inc. and is mentioned only for descriptive purposes. This project is not affiliated with or endorsed by Discord Inc.

<details>
<summary>Using SnoreClient violates Discord's terms of service</summary>

Client modifications are against Discord's Terms of Service. Discord has historically been indifferent about them and there are no known cases of users being banned simply for using a client mod, but if your account is essential to you, consider not using any client mod. Avoid plugins that implement abusive behaviour, and do not post screenshots that show the mod in servers where that could get you banned.

</details>
