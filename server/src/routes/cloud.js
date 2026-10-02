/*
 * SnoreClient server
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { authenticate, hashSecret, newSecret } from "../auth.js";
import { config } from "../config.js";
import { dataV2, profiles, settingsV1, transaction, users } from "../db.js";
import { exchangeCode, fetchUser, revokeToken } from "../discord.js";
import { empty, html, HttpError, json, readBody, readJson, redirect } from "../http.js";
import { createPages, escapeHtml } from "../pages.js";

const pages = createPages(config);
const { page } = pages;

const KEY_RE = /^[A-Za-z0-9_./-]{1,128}$/;

const checksumOf = buf => createHash("sha256").update(buf).digest("hex").slice(0, 16);

const SESSION_DAYS = 30;
const sessionKey = () => createHash("sha256").update(config.discordClientSecret + ":snore-session").digest();
const sign = payload => createHmac("sha256", sessionKey()).update(payload).digest("base64url");

function makeSession(userId) {
    const payload = `${userId}.${Date.now() + SESSION_DAYS * 86400_000}`;
    return `${payload}.${sign(payload)}`;
}

function readSession(req) {
    const m = (req.headers.cookie || "").match(/(?:^|;\s*)snore_session=([^;]+)/);
    if (!m) return null;
    const [userId, exp, sig] = m[1].split(".");
    if (!userId || !exp || !sig || Number(exp) < Date.now()) return null;
    const expected = Buffer.from(sign(`${userId}.${exp}`));
    const actual = Buffer.from(sig);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    return userId;
}

const sessionCookie = (value, maxAge) => `snore_session=${value}; Path=/; HttpOnly; ${config.publicUrl.startsWith("https") ? "Secure; " : ""}SameSite=Lax; Max-Age=${maxAge}`;

function requireSession(req) {
    const id = readSession(req);
    const user = id && users.get(id);
    if (!user) throw new HttpError(401, "Not logged in");
    return user;
}

function requireUser(req) {
    const user = authenticate(req);
    if (!user) throw new HttpError(401, "Unauthorized");
    return user;
}

function manifestOf(userId) {
    return dataV2.manifest(userId).map(e => ({ key: e.key, version: e.version, checksum: e.checksum }));
}

export const cloudRoutes = {
    "GET /v1/": (req, res) => json(res, 200, { ping: "pong", server: "snoreclient", version: "1" }),

    "GET /v1/accounts": (req, res) => {
        if (!config.publicAccounts) throw new HttpError(404, "Not found");
        const accounts = users.list();
        json(res, 200, { accounts, total: accounts.length }, { "Cache-Control": "public, max-age=30" });
    },

    "GET /v1/oauth/settings": (req, res) => json(res, 200, {
        clientId: config.discordClientId,
        redirectUri: config.redirectUri,
    }),

    "GET /v1/oauth/callback": async (req, res, url) => {
        const code = url.searchParams.get("code");
        const wantsJson = (req.headers.accept || "").includes("application/json");
        if (!code) throw new HttpError(400, "Missing code");

        let token, user;
        try {
            token = await exchangeCode(code);
            user = await fetchUser(token.access_token);
        } catch (e) {
            console.error("OAuth failure:", e.message);
            if (wantsJson) return json(res, 400, { error: e.message });
            return html(res, 400, page("Authorization failed", `<p>${escapeHtml(e.message)}</p><p>Close this window and try again from the SnoreClient Cloud settings.</p>`));
        } finally {
            if (token?.access_token) revokeToken(token.access_token);
        }

        if (config.allowedUserIds.length && !config.allowedUserIds.includes(user.id)) {
            if (wantsJson) return json(res, 403, { error: "This server is private. Your Discord account is not on the allow list." });
            return html(res, 403, page("Not allowed", "<p>This SnoreClient server is private and your account is not on its allow list.</p>"));
        }

        profiles.upsert(user.id, user.avatar, user.global_name);

        if (url.searchParams.get("state") === "web") {
            if (!users.get(user.id)) {
                return html(res, 403, page("Not connected yet", `<p>Hi <b>${escapeHtml(user.username)}</b>. This Discord account hasn't been connected from the SnoreClient app yet.</p><p>Open Discord, go to <b>Settings → SnoreClient → Cloud</b>, turn on Cloud Integration, then come back here.</p><p><a class="btn" href="/dashboard">Try again</a></p>`));
            }
            res.writeHead(302, { Location: "/dashboard", "Set-Cookie": sessionCookie(makeSession(user.id), SESSION_DAYS * 86400) });
            return res.end();
        }

        const secret = newSecret();
        users.upsert(user.id, user.username, hashSecret(secret));

        if (wantsJson) return json(res, 200, { secret });
        return html(res, 200, page("Connected", `<p>Hi <b>${escapeHtml(user.username)}</b>, your account is now connected to this SnoreClient cloud. You can close this window.</p>`));
    },

    "GET /login": (req, res) => {
        const u = new URL("https://discord.com/oauth2/authorize");
        u.searchParams.set("client_id", config.discordClientId);
        u.searchParams.set("redirect_uri", config.redirectUri);
        u.searchParams.set("response_type", "code");
        u.searchParams.set("scope", "identify");
        u.searchParams.set("state", "web");
        redirect(res, u.toString());
    },

    "GET /logout": (req, res) => {
        res.writeHead(302, { Location: "/", "Set-Cookie": sessionCookie("", 0) });
        res.end();
    },

    "GET /dashboard": (req, res) => {
        const id = readSession(req);
        const user = id && users.get(id);
        if (!user) return redirect(res, "/login");
        html(res, 200, pages.dashboard(user));
    },

    "GET /v1/me": (req, res) => {
        const user = requireSession(req);
        const profile = profiles.get(user.id);
        const entries = dataV2.entries(user.id).map(e => ({ ...e, size: Math.round(e.size * 0.75) }));
        const v1 = settingsV1.get(user.id);
        const statsRow = dataV2.get(user.id, "stats");
        let stats = null;
        if (statsRow) {
            try { stats = JSON.parse(Buffer.from(statsRow.value).toString("utf8")); } catch { }
        }
        json(res, 200, {
            user: { id: user.id, username: user.username, global_name: profile?.global_name ?? null, avatar: profile?.avatar ?? null, created_at: user.created_at, last_seen_at: user.last_seen_at },
            entries,
            legacy: v1 ? { written: v1.written, size: v1.data.length } : null,
            stats,
            online: false,
        }, { "Cache-Control": "no-store" });
    },

    "POST /v1/me/delete": (req, res) => {
        const user = requireSession(req);
        dataV2.deleteAll(user.id);
        settingsV1.delete(user.id);
        json(res, 200, { ok: true });
    },

    "POST /v1/me/disconnect": (req, res) => {
        const user = requireSession(req);
        profiles.delete(user.id);
        users.delete(user.id);
        res.writeHead(200, { "Content-Type": "application/json", "Set-Cookie": sessionCookie("", 0) });
        res.end(JSON.stringify({ ok: true }));
    },

    "DELETE /v1/": (req, res) => {
        const user = requireUser(req);
        users.delete(user.id);
        empty(res, 204);
    },

    "GET /v1/settings": (req, res) => {
        const user = requireUser(req);
        const row = settingsV1.get(user.id);
        if (!row) return empty(res, 404);

        const written = String(row.written);
        if (req.headers["if-none-match"] === written) return empty(res, 304, { ETag: written });

        res.writeHead(200, {
            "Content-Type": "application/octet-stream",
            "Content-Length": row.data.length,
            ETag: written,
        });
        res.end(row.data);
    },

    "PUT /v1/settings": async (req, res) => {
        const user = requireUser(req);
        const body = await readBody(req);
        if (!body.length) throw new HttpError(400, "Empty body");
        const written = settingsV1.put(user.id, body);
        json(res, 200, { written });
    },

    "DELETE /v1/settings": (req, res) => {
        const user = requireUser(req);
        settingsV1.delete(user.id);
        empty(res, 204);
    },

    "GET /v2/manifest": (req, res) => {
        const user = requireUser(req);
        json(res, 200, { entries: manifestOf(user.id) });
    },

    "POST /v2/sync": async (req, res) => {
        const user = requireUser(req);
        const body = await readJson(req);
        const clientManifest = Array.isArray(body.client_manifest) ? body.client_manifest : [];
        const uploads = Array.isArray(body.uploads) ? body.uploads : [];

        const uploaded = [];
        const errors = [];

        transaction(() => {
            for (const up of uploads) {
                if (typeof up?.key !== "string" || !KEY_RE.test(up.key)) {
                    errors.push({ key: String(up?.key ?? ""), error: "Invalid key" });
                    continue;
                }
                if (typeof up.value !== "string") {
                    errors.push({ key: up.key, error: "Value must be a base64 string" });
                    continue;
                }
                const value = Buffer.from(up.value, "base64");
                if (value.length > config.maxBlobBytes) {
                    errors.push({ key: up.key, error: "Value too large" });
                    continue;
                }
                if (!dataV2.get(user.id, up.key) && dataV2.count(user.id) >= config.maxKeysPerUser) {
                    errors.push({ key: up.key, error: "Too many keys" });
                    continue;
                }
                const checksum = checksumOf(value);
                if (up.checksum && up.checksum !== checksum) {
                    errors.push({ key: up.key, error: "Checksum mismatch" });
                    continue;
                }
                const row = dataV2.put(user.id, up.key, checksum, value);
                uploaded.push({ key: row.key, version: row.version, checksum: row.checksum });
            }
        });

        const known = new Map(clientManifest.map(e => [e.key, e]));
        const uploadedKeys = new Set(uploaded.map(u => u.key));
        const downloads = [];
        for (const row of dataV2.all(user.id)) {
            if (uploadedKeys.has(row.key)) continue;
            const local = known.get(row.key);
            if (local && local.version === row.version && local.checksum === row.checksum) continue;
            downloads.push({
                key: row.key,
                value: Buffer.from(row.value).toString("base64"),
                version: row.version,
                checksum: row.checksum,
            });
        }

        json(res, 200, { server_manifest: manifestOf(user.id), downloads, uploaded, errors });
    },

    "DELETE /v2/data/:key": (req, res, url, params) => {
        const user = requireUser(req);
        const key = decodeURIComponent(params.key);
        if (!KEY_RE.test(key)) throw new HttpError(400, "Invalid key");
        empty(res, dataV2.delete(user.id, key) ? 204 : 404);
    },
};
