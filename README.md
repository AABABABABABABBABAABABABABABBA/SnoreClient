# <img src="./browser/icon.png" width="40" align="left" alt="SnoreClient"> SnoreClient

[![Tests](https://github.com/aababababababbabaabababababba/SnoreClient/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/aababababababbabaabababababba/SnoreClient/actions/workflows/test.yml)
[![Release](https://github.com/aababababababbabaabababababba/SnoreClient/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/aababababababbabaabababababba/SnoreClient/actions/workflows/build.yml)

**Discord, but cozier.** SnoreClient is a Discord client mod forked from [Equicord](https://github.com/Equicord/Equicord) (itself a fork of [Vencord](https://github.com/Vendicated/Vencord)). It keeps the full plugin collection and adds:

- **A self hosted cloud.** The `server/` folder is a complete settings sync backend you can run on any VPS. Your settings, QuickCSS and plugin data sync between devices through *your* server, not someone else's.
- **A fresh look.** New logo, a redesigned settings landing panel, polished cards, and a matching web front end served by the same server.
- **Build time branding.** One environment variable points a build at your server for cloud sync, plugin pages, downloads and assets.

## Install

| Platform | Download |
| --- | --- |
| **Windows** | [SnoreClientInstaller.exe](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstaller.exe) · [ARM64](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstaller-arm64.exe) · CLI: [x64](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstallerCli.exe) [ARM64](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstallerCli-arm64.exe) |
| **Linux** | [SnoreClientInstaller-linux](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstaller-linux) (X11 + Wayland) · [ARM64](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstaller-linux-arm64) · CLI: [x64](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstallerCli-linux) [ARM64](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstallerCli-linux-arm64) |
| **macOS** | CLI: [Universal](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstallerCli-universal) · [Apple Silicon](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstallerCli-arm64) · [Intel](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/SnoreClientInstallerCli-x64) |

The installer is SnoreClient's own build of the Equilotl installer: it downloads the latest SnoreClient from the GitHub release and patches the Discord install you pick. Windows SmartScreen may warn because the file is not code signed; choose "More info → Run anyway". CLI builds on Linux and macOS need `chmod +x` first.

One-liners that fetch and run the installer for you:

```powershell
# Windows (PowerShell)
irm https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/install.ps1 | iex
```

```shell
# Linux / macOS
bash -c "$(curl -fsSL https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest/download/install.sh)"
```

After installing, fully quit Discord (tray icon too) and start it again. Updates arrive through **Settings → SnoreClient → Updater**.

**Browser:** download `extension-chrome.zip` or `extension-firefox.zip` from the [latest release](https://github.com/aababababababbabaabababababba/SnoreClient/releases/latest) and load it as an unpacked extension, or install `SnoreClient.user.js` in a userscript manager.

## Build from source

[Git](https://git-scm.com/download), [Node.js 22+](https://nodejs.org) and `pnpm` (`npm i -g pnpm`) are required.

```shell
git clone https://github.com/aababababababbabaabababababba/SnoreClient
cd SnoreClient
pnpm install --frozen-lockfile

# Point the build at your server (see "Self hosting" below). Default is the DEFAULT_SERVER_URL line in scripts/build/common.mjs, set it once to your VPS
SNORECLIENT_SERVER_URL=https://snore.pw pnpm build

pnpm inject      # patches your Discord install with this build using the SnoreClient installer CLI
```

Other useful commands:

| Command | What it does |
| --- | --- |
| `pnpm watch` | Rebuild on change |
| `pnpm buildWeb` | Browser extension and userscript builds in `dist/` |
| `pnpm uninject` | Remove SnoreClient from Discord |
| `pnpm test` | Full lint, typecheck and build, same as CI |

You can also change the cloud backend at any time inside Discord under **Settings → SnoreClient → Cloud**, so a build made with the default URL still works once you paste your server address there.

## Hosting the backend

Everything lives in [`server/`](./server). The backend implements the Vencord cloud API (`/v1/*`) and the keyed sync API (`/v2/*`) that the client speaks, plus a small website: landing page, plugin browser, download page and privacy page. Two interchangeable deployments are included:

| | Where | Guide |
| --- | --- | --- |
| **Cloudflare Workers + D1** (recommended) | Cloudflare free tier, no server | [`server/cloudflare/README.md`](./server/cloudflare/README.md) |
| Node.js + SQLite | Any VPS with Docker or systemd | [`server/README.md`](./server/README.md) |

The short version for Cloudflare:

1. Create a Discord application at <https://discord.com/developers/applications>, and under **OAuth2** add `https://snore.pw/v1/oauth/callback` as a redirect.
2. ```shell
   cd server/cloudflare
   npm install && npx wrangler login
   npm run db:create        # paste the printed database_id into wrangler.toml
   npm run db:migrate
   npm run secret           # DISCORD_CLIENT_SECRET
   npm run deploy
   ```
3. Builds already default to `https://snore.pw`. For another domain, change `DEFAULT_SERVER_URL` in `scripts/build/common.mjs` or set `SNORECLIENT_SERVER_URL`, or paste the URL into the Cloud settings tab.

## Releases

Every push to `main` runs the **Release** workflow, which builds everything and publishes it to the GitHub release tagged `latest` (creating it the first time). The installer scripts, the in-app updater and the website's download page all read from that release. You can also run it by hand from the Actions tab.

## Project layout

```
src/                     client source (plugins, API, settings UI)
src/snoreclientplugins/  plugins that came from Equicord
src/plugins/             plugins that came from Vencord
server/                  cloud backend + website (Node) 
server/cloudflare/       the same backend as a Cloudflare Worker with D1
installer/               SnoreClient installer (Equilotl fork, Go)
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
