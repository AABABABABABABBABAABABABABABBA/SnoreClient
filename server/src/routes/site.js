/*
 * SnoreClient server
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "../config.js";
import { users } from "../db.js";
import { html, HttpError, json, redirect } from "../http.js";
import { createPages } from "../pages.js";

const pages = createPages(config);

const PUBLIC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../public");

const MIME = {
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".txt": "text/plain; charset=utf-8",
};

const pluginCache = { at: 0, list: null };

async function loadPlugins() {
    if (Date.now() - pluginCache.at < 10 * 60_000 && pluginCache.list) return pluginCache.list;

    const local = join(config.dataDir, "plugins.json");
    let list = null;
    if (existsSync(local)) {
        list = JSON.parse(readFileSync(local, "utf8"));
    } else {
        try {
            const res = await fetch(`https://github.com/${config.githubRepo}/releases/latest/download/plugins.json`, {
                headers: { "User-Agent": "SnoreClient-Server" },
            });
            if (res.ok) list = await res.json();
        } catch (e) {
            console.error("Could not fetch plugins.json:", e.message);
        }
    }

    list ??= pluginCache.list ?? [];
    list.sort((a, b) => a.name.localeCompare(b.name));
    pluginCache.at = Date.now();
    pluginCache.list = list;
    return list;
}

const releaseCache = { at: 0, data: null };

async function latestRelease() {
    if (Date.now() - releaseCache.at < 5 * 60_000 && releaseCache.data) return releaseCache.data;
    const res = await fetch(`https://api.github.com/repos/${config.githubRepo}/releases/latest`, {
        headers: { "User-Agent": "SnoreClient-Server", Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new HttpError(502, "GitHub release lookup failed");
    releaseCache.data = await res.json();
    releaseCache.at = Date.now();
    return releaseCache.data;
}

export const siteRoutes = {
    "GET /": (req, res) => html(res, 200, pages.landing({ userCount: users.count() })),
    "GET /accounts": (req, res) => html(res, 200, pages.accounts(config.publicAccounts ? users.list() : [])),
    "GET /privacy": (req, res) => html(res, 200, pages.privacy()),
    "GET /download": (req, res) => html(res, 200, pages.download()),
    "GET /discord": (req, res) => redirect(res, process.env.DISCORD_INVITE || `https://github.com/${config.githubRepo}/discussions`),
    "GET /health": (req, res) => json(res, 200, { ok: true, uptime: Math.round(process.uptime()) }),

    "GET /plugins": async (req, res) => html(res, 200, pages.plugins(await loadPlugins())),
    "GET /plugins.json": async (req, res) => json(res, 200, await loadPlugins(), { "Cache-Control": "public, max-age=600" }),
    "GET /plugins/:name": async (req, res, url, params) => {
        const name = decodeURIComponent(params.name);
        const p = (await loadPlugins()).find(x => x.name.toLowerCase() === name.toLowerCase());
        if (!p) throw new HttpError(404, "No such plugin");
        html(res, 200, pages.plugin(p));
    },

    "GET /releases/client": async (req, res) => json(res, 200, await latestRelease(), { "Cache-Control": "public, max-age=300" }),
    "GET /releases/installer": async (req, res) => json(res, 200, await latestRelease(), { "Cache-Control": "public, max-age=300" }),

    "GET /release/:file": (req, res, url, params) => {
        if (!/^[A-Za-z0-9_.-]+$/.test(params.file)) throw new HttpError(400, "Bad file name");
        redirect(res, `https://github.com/${config.githubRepo}/releases/latest/download/${params.file}`);
    },

    "GET /assets/*": (req, res, url) => {
        const rel = normalize(decodeURIComponent(url.pathname.slice("/assets/".length))).replace(/^(\.\.[/\\])+/, "");
        const file = join(PUBLIC_DIR, "assets", rel);
        if (!file.startsWith(join(PUBLIC_DIR, "assets")) || !existsSync(file) || !statSync(file).isFile())
            throw new HttpError(404, "Not found");

        res.writeHead(200, {
            "Content-Type": MIME[extname(file)] ?? "application/octet-stream",
            "Content-Length": statSync(file).size,
            "Cache-Control": "public, max-age=86400",
        });
        createReadStream(file).pipe(res);
    },
};
