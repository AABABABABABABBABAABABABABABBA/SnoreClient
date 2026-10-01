/*
 * SnoreClient server
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createServer } from "node:http";

import { config } from "./config.js";
import { corsHeaders, html, HttpError, json, rateLimited } from "./http.js";
import { page } from "./pages.js";
import { cloudRoutes } from "./routes/cloud.js";
import { siteRoutes } from "./routes/site.js";

const routes = Object.entries({ ...cloudRoutes, ...siteRoutes }).map(([spec, handler]) => {
    const [method, path] = spec.split(" ");
    const keys = [];
    const pattern = path
        .replace(/\*/g, ".*")
        .replace(/:([A-Za-z]+)/g, (_, k) => (keys.push(k), "([^/]+)"));
    return { method, handler, keys, re: new RegExp(`^${pattern}$`) };
});

function match(method, pathname) {
    for (const r of routes) {
        if (r.method !== method) continue;
        const m = pathname.match(r.re);
        if (!m) continue;
        const params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]));
        return { handler: r.handler, params };
    }
    return null;
}

export const server = createServer(async (req, res) => {
    const started = Date.now();
    const url = new URL(req.url, config.publicUrl);
    const isApi = /^\/v\d\//.test(url.pathname);

    if (isApi) for (const [k, v] of Object.entries(corsHeaders)) res.setHeader(k, v);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");

    try {
        if (req.method === "OPTIONS") {
            res.writeHead(204);
            return res.end();
        }

        if (rateLimited(req)) throw new HttpError(429, "Too many requests, slow down");

        const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
        const route = match(req.method, pathname) ?? match(req.method, url.pathname);
        if (!route) throw new HttpError(404, "Not found");

        await route.handler(req, res, url, route.params);
    } catch (e) {
        const status = e instanceof HttpError ? e.status : 500;
        if (status === 500) console.error(e);
        if (res.headersSent) return res.end();

        const message = status === 500 ? "Internal server error" : e.message;
        if (isApi || (req.headers.accept || "").includes("application/json"))
            json(res, status, { error: message });
        else
            html(res, status, page(`${status}`, `<p>${message}</p><p><a href="/">Back home</a></p>`));
    } finally {
        const ms = Date.now() - started;
        console.log(`${new Date().toISOString()} ${req.method} ${url.pathname} ${res.statusCode} ${ms}ms`);
    }
});

server.listen(config.port, config.host, () => {
    console.log(`SnoreClient server listening on http://${config.host}:${config.port} (public: ${config.publicUrl})`);
    console.log(`Discord OAuth redirect URI: ${config.redirectUri}`);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => {
        console.log(`Received ${sig}, shutting down`);
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 3000).unref();
    });
}
