/*
 * SnoreClient server, Cloudflare Workers + D1 edition
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createPages, escapeHtml } from "../src/pages.js";

export { LiveHub } from "./live.js";

const KEY_RE = /^[A-Za-z0-9_./-]{1,128}$/;
const DISCORD_API = "https://discord.com/api/v10";

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, If-None-Match",
    "Access-Control-Expose-Headers": "ETag",
    "Access-Control-Max-Age": "86400",
};

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
});
const html = (body, status = 200) => new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
const empty = (status, headers = {}) => new Response(null, { status, headers });

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
const sha256 = async data => hex(await crypto.subtle.digest("SHA-256", typeof data === "string" ? enc.encode(data) : data));
const b64 = {
    encode: bytes => btoa(String.fromCharCode(...bytes)),
    decode: s => Uint8Array.from(atob(s), c => c.charCodeAt(0)),
};
const newSecret = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return b64.encode(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

function readConfig(env) {
    const publicUrl = (env.PUBLIC_URL || "").replace(/\/+$/, "");
    if (!publicUrl || !env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET)
        throw new HttpError(500, "Server is missing PUBLIC_URL, DISCORD_CLIENT_ID or the DISCORD_CLIENT_SECRET secret");
    return {
        publicUrl,
        discordClientId: env.DISCORD_CLIENT_ID,
        discordClientSecret: env.DISCORD_CLIENT_SECRET,
        redirectUri: env.DISCORD_REDIRECT_URI || `${publicUrl}/v1/oauth/callback`,
        allowedUserIds: (env.ALLOWED_USER_IDS || "").split(",").map(s => s.trim()).filter(Boolean),
        githubRepo: env.GITHUB_REPO || "aababababababbabaabababababba/SnoreClient",
        siteName: env.SITE_NAME || "SnoreClient",
        maxBlobBytes: Number(env.MAX_BLOB_BYTES || 8 * 1024 * 1024),
        maxKeysPerUser: Number(env.MAX_KEYS_PER_USER || 64),
        publicAccounts: env.PUBLIC_ACCOUNTS !== "0",
    };
}

async function authenticate(req, db) {
    const header = req.headers.get("Authorization");
    if (!header) return null;
    const token = header.startsWith("Basic ") ? header.slice(6) : header;

    let decoded;
    try {
        decoded = new TextDecoder().decode(b64.decode(token));
    } catch {
        return null;
    }

    const sep = decoded.lastIndexOf(":");
    if (sep === -1) return null;
    const secret = decoded.slice(0, sep);
    const userId = decoded.slice(sep + 1);
    if (!secret || !/^\d{15,22}$/.test(userId)) return null;

    const user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
    if (!user) return null;

    const actual = await sha256(secret);
    if (actual.length !== user.secret_hash.length) return null;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ user.secret_hash.charCodeAt(i);
    if (diff !== 0) return null;

    await db.prepare("UPDATE users SET last_seen_at = ? WHERE id = ?").bind(Date.now(), userId).run();
    return user;
}

async function requireUser(req, db) {
    const user = await authenticate(req, db);
    if (!user) throw new HttpError(401, "Unauthorized");
    return user;
}

async function manifestOf(db, userId) {
    const { results } = await db.prepare("SELECT key, version, checksum FROM data_v2 WHERE user_id = ? ORDER BY key").bind(userId).all();
    return results;
}

async function readBody(req, limit) {
    const declared = Number(req.headers.get("content-length") || 0);
    if (declared > limit) throw new HttpError(413, "Payload too large");
    const buf = new Uint8Array(await req.arrayBuffer());
    if (buf.length > limit) throw new HttpError(413, "Payload too large");
    return buf;
}

async function exchangeCode(cfg, code) {
    const res = await fetch(`${DISCORD_API}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: cfg.discordClientId,
            client_secret: cfg.discordClientSecret,
            grant_type: "authorization_code",
            code,
            redirect_uri: cfg.redirectUri,
        }),
    });
    if (!res.ok) {
        let detail = "";
        try {
            const body = await res.json();
            detail = body.error_description || body.error || "";
        } catch { }
        const hint = /invalid_client/i.test(detail) ? " The DISCORD_CLIENT_SECRET on the server does not match the Discord application."
            : /redirect_uri/i.test(detail) ? ` The redirect URI ${cfg.redirectUri} is not registered on the Discord application.`
                : /invalid_grant/i.test(detail) ? " The code was already used or expired, try again."
                    : "";
        throw new Error(`Discord token exchange failed (${res.status}${detail ? `: ${detail}` : ""}).${hint}`);
    }
    const token = await res.json();

    const me = await fetch(`${DISCORD_API}/users/@me`, { headers: { Authorization: `Bearer ${token.access_token}` } });
    if (!me.ok) throw new Error(`Discord user lookup failed (${me.status})`);
    const user = await me.json();

    await fetch(`${DISCORD_API}/oauth2/token/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: cfg.discordClientId, client_secret: cfg.discordClientSecret, token: token.access_token }),
    }).catch(() => { });

    return user;
}

const pluginCache = { at: 0, list: [] };

async function loadPlugins(cfg) {
    if (Date.now() - pluginCache.at < 10 * 60_000 && pluginCache.list.length) return pluginCache.list;
    try {
        const res = await fetch(`https://github.com/${cfg.githubRepo}/releases/latest/download/plugins.json`, {
            headers: { "User-Agent": "SnoreClient-Worker" },
            cf: { cacheTtl: 600 },
        });
        if (res.ok) {
            const list = await res.json();
            list.sort((a, b) => a.name.localeCompare(b.name));
            pluginCache.list = list;
            pluginCache.at = Date.now();
        }
    } catch { }
    return pluginCache.list;
}

const routes = [];
const route = (method, pattern, handler) => {
    const keys = [];
    const re = new RegExp(`^${pattern.replace(/\*/g, ".*").replace(/:([A-Za-z]+)/g, (_, k) => (keys.push(k), "([^/]+)"))}$`);
    routes.push({ method, re, keys, handler });
};

route("GET", "/v1/", () => json({ ping: "pong", server: "snoreclient", version: "1", runtime: "cloudflare" }));

async function listAccounts(db) {
    const { results } = await db.prepare(`
        SELECT u.id, u.username, u.created_at, u.last_seen_at,
               (SELECT COUNT(*) FROM data_v2 d WHERE d.user_id = u.id) + (SELECT COUNT(*) FROM settings_v1 s WHERE s.user_id = u.id) AS data_count
        FROM users u ORDER BY u.last_seen_at DESC
    `).all();
    return results.map(r => ({ ...r, data_count: Number(r.data_count) }));
}

function hub(env) {
    if (!env.LIVE) throw new HttpError(503, "Live presence is not configured on this server");
    return env.LIVE.get(env.LIVE.idFromName("global"));
}

// WebSocket: wss://host/v1/live?auth=<base64 secret:userId> for clients, no auth for read only viewers
route("GET", "/v1/live", ({ req, env }) => hub(env).fetch(req));
route("GET", "/v1/live.json", async ({ env }) => {
    const res = await hub(env).fetch("https://live/snapshot");
    return json(await res.json(), 200, { "Cache-Control": "no-store" });
});

route("GET", "/v1/accounts", async ({ cfg, db }) => {
    if (!cfg.publicAccounts) throw new HttpError(404, "Not found");
    const accounts = await listAccounts(db);
    return json({ accounts, total: accounts.length }, 200, { "Cache-Control": "public, max-age=30" });
});

route("GET", "/v1/oauth/settings", ({ cfg }) => json({ clientId: cfg.discordClientId, redirectUri: cfg.redirectUri }));

route("GET", "/v1/oauth/callback", async ({ req, url, cfg, db, pages }) => {
    const code = url.searchParams.get("code");
    const wantsJson = (req.headers.get("Accept") || "").includes("application/json");
    if (!code) throw new HttpError(400, "Missing code");

    let user;
    try {
        user = await exchangeCode(cfg, code);
    } catch (e) {
        console.error("OAuth failure:", e.message);
        if (wantsJson) return json({ error: e.message }, 400);
        return html(pages.page("Authorization failed", `<p>${escapeHtml(e.message)}</p><p>Close this window and try again from the SnoreClient Cloud settings.</p>`), 400);
    }

    if (cfg.allowedUserIds.length && !cfg.allowedUserIds.includes(user.id)) {
        if (wantsJson) return json({ error: "This server is private. Your Discord account is not on the allow list." }, 403);
        return html(pages.page("Not allowed", "<p>This SnoreClient server is private and your account is not on its allow list.</p>"), 403);
    }

    const secret = newSecret();
    const now = Date.now();
    await db.prepare(`
        INSERT INTO users (id, username, secret_hash, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET username = excluded.username, secret_hash = excluded.secret_hash, last_seen_at = excluded.last_seen_at
    `).bind(user.id, user.username, await sha256(secret), now, now).run();

    if (wantsJson) return json({ secret });
    return html(pages.page("Connected", `<p>Hi <b>${escapeHtml(user.username)}</b>, your account is now connected to this SnoreClient cloud. You can close this window.</p>`));
});

route("DELETE", "/v1/", async ({ req, db }) => {
    const user = await requireUser(req, db);
    await db.batch([
        db.prepare("DELETE FROM data_v2 WHERE user_id = ?").bind(user.id),
        db.prepare("DELETE FROM settings_v1 WHERE user_id = ?").bind(user.id),
        db.prepare("DELETE FROM users WHERE id = ?").bind(user.id),
    ]);
    return empty(204);
});

route("GET", "/v1/settings", async ({ req, db }) => {
    const user = await requireUser(req, db);
    const row = await db.prepare("SELECT written, data FROM settings_v1 WHERE user_id = ?").bind(user.id).first();
    if (!row) return empty(404);

    const written = String(row.written);
    if (req.headers.get("If-None-Match") === written) return empty(304, { ETag: written });

    return new Response(b64.decode(row.data), {
        status: 200,
        headers: { "Content-Type": "application/octet-stream", ETag: written },
    });
});

route("PUT", "/v1/settings", async ({ req, db, cfg }) => {
    const user = await requireUser(req, db);
    const body = await readBody(req, cfg.maxBlobBytes);
    if (!body.length) throw new HttpError(400, "Empty body");
    const written = Date.now();
    await db.prepare(`
        INSERT INTO settings_v1 (user_id, written, data) VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET written = excluded.written, data = excluded.data
    `).bind(user.id, written, b64.encode(body)).run();
    return json({ written });
});

route("DELETE", "/v1/settings", async ({ req, db }) => {
    const user = await requireUser(req, db);
    await db.prepare("DELETE FROM settings_v1 WHERE user_id = ?").bind(user.id).run();
    return empty(204);
});

route("GET", "/v2/manifest", async ({ req, db }) => {
    const user = await requireUser(req, db);
    return json({ entries: await manifestOf(db, user.id) });
});

route("POST", "/v2/sync", async ({ req, db, cfg }) => {
    const user = await requireUser(req, db);
    let body;
    try {
        body = JSON.parse(new TextDecoder().decode(await readBody(req, cfg.maxBlobBytes * 4)));
    } catch {
        throw new HttpError(400, "Malformed JSON body");
    }
    const clientManifest = Array.isArray(body.client_manifest) ? body.client_manifest : [];
    const uploads = Array.isArray(body.uploads) ? body.uploads : [];

    const uploaded = [];
    const errors = [];
    const existing = new Map((await manifestOf(db, user.id)).map(e => [e.key, e]));
    let keyCount = existing.size;
    const statements = [];
    const now = Date.now();

    for (const up of uploads) {
        if (typeof up?.key !== "string" || !KEY_RE.test(up.key)) {
            errors.push({ key: String(up?.key ?? ""), error: "Invalid key" });
            continue;
        }
        if (typeof up.value !== "string") {
            errors.push({ key: up.key, error: "Value must be a base64 string" });
            continue;
        }
        let bytes;
        try {
            bytes = b64.decode(up.value);
        } catch {
            errors.push({ key: up.key, error: "Value must be a base64 string" });
            continue;
        }
        if (bytes.length > cfg.maxBlobBytes) {
            errors.push({ key: up.key, error: "Value too large" });
            continue;
        }
        const prev = existing.get(up.key);
        if (!prev && keyCount >= cfg.maxKeysPerUser) {
            errors.push({ key: up.key, error: "Too many keys" });
            continue;
        }
        const checksum = (await sha256(bytes)).slice(0, 16);
        if (up.checksum && up.checksum !== checksum) {
            errors.push({ key: up.key, error: "Checksum mismatch" });
            continue;
        }
        const version = (prev?.version ?? 0) + 1;
        if (!prev) keyCount++;
        existing.set(up.key, { key: up.key, version, checksum });
        statements.push(db.prepare(`
            INSERT INTO data_v2 (user_id, key, version, checksum, value, updated_at) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, key) DO UPDATE SET version = excluded.version, checksum = excluded.checksum, value = excluded.value, updated_at = excluded.updated_at
        `).bind(user.id, up.key, version, checksum, b64.encode(bytes), now));
        uploaded.push({ key: up.key, version, checksum });
    }

    if (statements.length) await db.batch(statements);

    const known = new Map(clientManifest.map(e => [e.key, e]));
    const uploadedKeys = new Set(uploaded.map(u => u.key));
    const downloads = [];
    const { results } = await db.prepare("SELECT key, version, checksum, value FROM data_v2 WHERE user_id = ?").bind(user.id).all();
    for (const row of results) {
        if (uploadedKeys.has(row.key)) continue;
        const local = known.get(row.key);
        if (local && local.version === row.version && local.checksum === row.checksum) continue;
        downloads.push({ key: row.key, value: row.value, version: row.version, checksum: row.checksum });
    }

    return json({ server_manifest: await manifestOf(db, user.id), downloads, uploaded, errors });
});

route("DELETE", "/v2/data/:key", async ({ req, db, params }) => {
    const user = await requireUser(req, db);
    const key = decodeURIComponent(params.key);
    if (!KEY_RE.test(key)) throw new HttpError(400, "Invalid key");
    const { meta } = await db.prepare("DELETE FROM data_v2 WHERE user_id = ? AND key = ?").bind(user.id, key).run();
    return empty(meta.changes > 0 ? 204 : 404);
});

route("GET", "/", async ({ db, pages, cfg }) => {
    const row = await db.prepare("SELECT COUNT(*) AS n FROM users").first();
    const plugins = await loadPlugins(cfg).catch(() => []);
    return html(pages.landing({ userCount: row?.n ?? 0, pluginCount: plugins.length }));
});
route("GET", "/accounts", async ({ cfg, db, pages }) => html(pages.accounts(cfg.publicAccounts ? await listAccounts(db) : [])));
route("GET", "/privacy", ({ pages }) => html(pages.privacy()));
route("GET", "/download", ({ pages }) => html(pages.download()));
route("GET", "/health", () => json({ ok: true, runtime: "cloudflare" }));
route("GET", "/discord", ({ env, cfg }) => Response.redirect(env.DISCORD_INVITE || `https://github.com/${cfg.githubRepo}/discussions`, 302));
route("GET", "/plugins", async ({ cfg, pages }) => html(pages.plugins(await loadPlugins(cfg))));
route("GET", "/plugins.json", async ({ cfg }) => json(await loadPlugins(cfg), 200, { "Cache-Control": "public, max-age=600" }));
route("GET", "/plugins/:name", async ({ cfg, pages, params }) => {
    const name = decodeURIComponent(params.name).toLowerCase();
    const p = (await loadPlugins(cfg)).find(x => x.name.toLowerCase() === name);
    if (!p) throw new HttpError(404, "No such plugin");
    return html(pages.plugin(p));
});
const releaseCache = { at: 0, data: null };
async function latestRelease(cfg) {
    if (Date.now() - releaseCache.at < 5 * 60_000 && releaseCache.data) return releaseCache.data;
    const res = await fetch(`https://api.github.com/repos/${cfg.githubRepo}/releases/latest`, {
        headers: { "User-Agent": "SnoreClient-Worker", Accept: "application/vnd.github+json" },
        cf: { cacheTtl: 300 },
    });
    if (!res.ok) throw new HttpError(502, "GitHub release lookup failed");
    releaseCache.data = await res.json();
    releaseCache.at = Date.now();
    return releaseCache.data;
}
route("GET", "/releases/client", async ({ cfg }) => json(await latestRelease(cfg), 200, { "Cache-Control": "public, max-age=300" }));
route("GET", "/releases/installer", async ({ cfg }) => json(await latestRelease(cfg), 200, { "Cache-Control": "public, max-age=300" }));

route("GET", "/release/:file", ({ cfg, params }) => {
    if (!/^[A-Za-z0-9_.-]+$/.test(params.file)) throw new HttpError(400, "Bad file name");
    return Response.redirect(`https://github.com/${cfg.githubRepo}/releases/latest/download/${params.file}`, 302);
});
route("GET", "/assets/*", async ({ req, env }) => {
    if (!env.ASSETS) throw new HttpError(404, "Not found");
    const res = await env.ASSETS.fetch(req);
    if (res.status === 404) throw new HttpError(404, "Not found");
    return res;
});

export default {
    async fetch(req, env) {
        const url = new URL(req.url);
        const isApi = /^\/v\d\//.test(url.pathname);
        const withHeaders = res => {
            if (res.status === 101) return res;
            const headers = new Headers(res.headers);
            if (isApi) for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
            headers.set("X-Content-Type-Options", "nosniff");
            headers.set("Referrer-Policy", "no-referrer");
            return new Response(res.body, { status: res.status, headers });
        };

        if (req.method === "OPTIONS") return withHeaders(empty(204));

        let pages;
        try {
            const cfg = readConfig(env);
            pages = createPages(cfg);
            const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;

            for (const r of routes) {
                if (r.method !== req.method) continue;
                const m = pathname.match(r.re) ?? url.pathname.match(r.re);
                if (!m) continue;
                const params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]));
                return withHeaders(await r.handler({ req, url, env, cfg, db: env.DB, pages, params }));
            }
            throw new HttpError(404, "Not found");
        } catch (e) {
            const status = e instanceof HttpError ? e.status : 500;
            if (status === 500) console.error(e);
            const message = status === 500 ? "Internal server error" : e.message;
            if (isApi || (req.headers.get("Accept") || "").includes("application/json") || !pages)
                return withHeaders(json({ error: message }, status));
            return withHeaders(html(pages.page(`${status}`, `<p>${escapeHtml(message)}</p><p><a href="/">Back home</a></p>`), status));
        }
    },
};
