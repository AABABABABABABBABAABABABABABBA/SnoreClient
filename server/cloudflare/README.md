# SnoreClient on Cloudflare Workers + D1

The same backend as the Node server, running on Cloudflare's free tier with no VPS: a Worker hosts the API and website, D1 (Cloudflare's SQLite) stores the data, and Workers Static Assets serves the logo. Free tier limits (100k requests and 5 GB of D1 per day) are far above what a client mod's settings sync needs.

## One time setup (about 5 minutes)

Requirements: a Cloudflare account, Node.js 22+, and the Discord application from the main README (OAuth2 redirect `https://snore.pw/v1/oauth/callback`).

```shell
cd server/cloudflare
npm install                   # installs wrangler
npx wrangler login            # opens the browser once

npm run db:create             # prints a database_id, paste it into wrangler.toml
npm run db:migrate            # creates the tables in D1

# put your Discord client id in wrangler.toml under [vars], then:
npm run secret                # prompts for DISCORD_CLIENT_SECRET

npm run deploy
```

`wrangler.toml` routes the Worker to **snore.pw** as a custom domain. The zone must already be on your Cloudflare account; Cloudflare creates the DNS record and certificate on deploy. To try it on the free `*.workers.dev` URL first, delete the `[[routes]]` block and set `PUBLIC_URL` to the URL that `wrangler deploy` prints (and add that callback URL to the Discord app).

## Deploy on every push (optional)

The repository ships `.github/workflows/deploy-cloudflare.yml`. Add two repository secrets, `CLOUDFLARE_API_TOKEN` (Workers Scripts: Edit, D1: Edit, Workers Routes: Edit) and `CLOUDFLARE_ACCOUNT_ID`, and every push to `main` that touches `server/` redeploys the Worker.

## Local development

```shell
cp .dev.vars.example .dev.vars   # add DISCORD_CLIENT_SECRET
npm run db:migrate:local
npm run dev                      # http://localhost:8787
npm test                         # protocol tests against an in memory D1 shim
```

## Operations

- **Logs:** `npx wrangler tail`
- **Query data:** `npx wrangler d1 execute snoreclient --remote --command "SELECT id, username, last_seen_at FROM users"`
- **Backup:** `npx wrangler d1 export snoreclient --remote --output backup.sql`
- **Private instance:** set `ALLOWED_USER_IDS` in `wrangler.toml` to a comma separated list of Discord user ids.

## Differences from the Node server

| | Cloudflare Worker | Node server |
| --- | --- | --- |
| Hosting | Free tier, no server to maintain | Any VPS, Docker or systemd |
| Storage | D1 | SQLite file |
| Plugin list | Fetched from the GitHub release and cached at the edge | Same, plus a `data/plugins.json` override |
| Rate limiting | Cloudflare's built in protection | Per IP, in process |

The client cannot tell them apart. Both implement the `/v1` and `/v2` sync APIs identically.
