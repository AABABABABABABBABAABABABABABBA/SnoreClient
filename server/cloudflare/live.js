/*
 * SnoreClient live presence: a Durable Object that holds every open WebSocket
 * and broadcasts who is online. Clients connect with their cloud credentials,
 * the website connects anonymously as a viewer.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
const sha256 = async s => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));

export class LiveHub {
    constructor(ctx, env) {
        this.ctx = ctx;
        this.env = env;
        this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
    }

    async fetch(request) {
        const url = new URL(request.url);

        if (url.pathname === "/snapshot") {
            return Response.json(this.snapshot());
        }

        if (request.headers.get("Upgrade") !== "websocket") {
            return new Response("Expected a WebSocket", { status: 426 });
        }

        let user = null;
        const token = url.searchParams.get("auth") || request.headers.get("Authorization");
        if (token) {
            user = await this.authenticate(token.replace(/^Basic /, ""));
            if (!user) return new Response("Unauthorized", { status: 401 });
        }

        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);
        this.ctx.acceptWebSocket(server);
        server.serializeAttachment({
            id: user?.id ?? null,
            username: user?.username ?? null,
            since: Date.now(),
            viewer: !user,
        });

        server.send(JSON.stringify({ type: "hello", you: user ? { id: user.id, username: user.username } : null, ...this.snapshot() }));
        if (user) this.broadcast({ type: "join", user: { id: user.id, username: user.username } });
        this.broadcast({ type: "presence", ...this.snapshot() });

        return new Response(null, { status: 101, webSocket: client });
    }

    async authenticate(token) {
        let decoded;
        try {
            decoded = atob(token);
        } catch {
            return null;
        }
        const sep = decoded.lastIndexOf(":");
        if (sep === -1) return null;
        const secret = decoded.slice(0, sep);
        const id = decoded.slice(sep + 1);
        if (!/^\d{15,22}$/.test(id)) return null;

        const row = await this.env.DB.prepare("SELECT id, username, secret_hash FROM users WHERE id = ?").bind(id).first();
        if (!row || row.secret_hash !== await sha256(secret)) return null;
        await this.env.DB.prepare("UPDATE users SET last_seen_at = ? WHERE id = ?").bind(Date.now(), id).run();
        return { id: row.id, username: row.username };
    }

    members() {
        const seen = new Map();
        for (const ws of this.ctx.getWebSockets()) {
            const a = ws.deserializeAttachment();
            if (!a || a.viewer || !a.id) continue;
            const prev = seen.get(a.id);
            if (!prev || a.since < prev.since) seen.set(a.id, { id: a.id, username: a.username, since: a.since });
        }
        return [...seen.values()].sort((x, y) => x.since - y.since);
    }

    snapshot() {
        const online = this.members();
        const viewers = this.ctx.getWebSockets().filter(ws => ws.deserializeAttachment()?.viewer).length;
        return { online, count: online.length, viewers, at: Date.now() };
    }

    broadcast(msg) {
        const data = JSON.stringify(msg);
        for (const ws of this.ctx.getWebSockets()) {
            try { ws.send(data); } catch { }
        }
    }

    webSocketMessage(ws, message) {
        if (typeof message !== "string") return;
        let msg;
        try { msg = JSON.parse(message); } catch { return; }
        const a = ws.deserializeAttachment();

        if (msg.type === "snapshot") {
            ws.send(JSON.stringify({ type: "presence", ...this.snapshot() }));
        } else if (msg.type === "status" && a && !a.viewer && typeof msg.status === "string") {
            ws.serializeAttachment({ ...a, status: msg.status.slice(0, 32) });
            this.broadcast({ type: "presence", ...this.snapshot() });
        }
    }

    webSocketClose(ws) {
        const a = ws.deserializeAttachment();
        try { ws.close(); } catch { }
        if (a && !a.viewer && a.id && !this.members().some(m => m.id === a.id)) {
            this.broadcast({ type: "leave", user: { id: a.id, username: a.username } });
        }
        this.broadcast({ type: "presence", ...this.snapshot() });
    }

    webSocketError(ws) {
        this.webSocketClose(ws);
    }
}
