import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";

import worker from "../worker.js";
import { createD1 } from "./d1shim.js";

const DB = createD1(join(import.meta.dirname, "../schema.sql"));
const env = { DB, PUBLIC_URL: "https://snore.pw", DISCORD_CLIENT_ID: "1", DISCORD_CLIENT_SECRET: "x", PUBLIC_ACCOUNTS: "1" };
const call = (path, init = {}) => worker.fetch(new Request(`https://snore.pw${path}`, init), env);

const secret = "s3cret";
const userId = "123456789012345678";
const auth = btoa(`${secret}:${userId}`);

async function seedUser() {
    const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)))].map(b => b.toString(16).padStart(2, "0")).join("");
    await DB.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?)").bind(userId, "tester", hash, 1, 1).run();
}

test("ping and oauth settings", async () => {
    const ping = await call("/v1/");
    assert.equal(ping.status, 200);
    assert.equal((await ping.json()).ping, "pong");
    assert.equal(ping.headers.get("access-control-allow-origin"), "*");

    const settings = await (await call("/v1/oauth/settings")).json();
    assert.deepEqual(settings, { clientId: "1", redirectUri: "https://snore.pw/v1/oauth/callback" });
});

test("auth", async () => {
    await seedUser();
    assert.equal((await call("/v1/settings")).status, 401);
    assert.equal((await call("/v1/settings", { headers: { Authorization: btoa(`nope:${userId}`) } })).status, 401);
    assert.equal((await call("/v1/settings", { headers: { Authorization: `Basic ${auth}` } })).status, 404);
});

test("v1 settings round trip", async () => {
    const put = await call("/v1/settings", { method: "PUT", headers: { Authorization: auth }, body: new Uint8Array([1, 2, 3]) });
    assert.equal(put.status, 200);
    const { written } = await put.json();

    const get = await call("/v1/settings", { headers: { Authorization: auth } });
    assert.equal(get.status, 200);
    assert.equal(get.headers.get("etag"), String(written));
    assert.deepEqual([...new Uint8Array(await get.arrayBuffer())], [1, 2, 3]);

    assert.equal((await call("/v1/settings", { headers: { Authorization: auth, "If-None-Match": String(written) } })).status, 304);
    assert.equal((await call("/v1/settings", { method: "DELETE", headers: { Authorization: auth } })).status, 204);
    assert.equal((await call("/v1/settings", { headers: { Authorization: auth } })).status, 404);
});

test("v2 sync", async () => {
    const value = btoa("hello");
    const sync = body => call("/v2/sync", { method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());

    let r = await sync({ client_manifest: [], uploads: [{ key: "settings", value }] });
    assert.equal(r.uploaded[0].version, 1);
    assert.equal(r.downloads.length, 0);

    r = await sync({ client_manifest: [], uploads: [{ key: "settings", value: btoa("hello2") }] });
    assert.equal(r.uploaded[0].version, 2);

    r = await sync({ client_manifest: [], uploads: [] });
    assert.equal(r.downloads.length, 1);
    assert.equal(r.downloads[0].value, btoa("hello2"));

    r = await sync({ client_manifest: r.server_manifest, uploads: [] });
    assert.equal(r.downloads.length, 0);

    r = await sync({ client_manifest: [], uploads: [{ key: "bad key!", value }] });
    assert.equal(r.errors[0].error, "Invalid key");

    const manifest = await (await call("/v2/manifest", { headers: { Authorization: auth } })).json();
    assert.equal(manifest.entries[0].key, "settings");

    assert.equal((await call("/v2/data/settings", { method: "DELETE", headers: { Authorization: auth } })).status, 204);
    assert.equal((await call("/v2/data/settings", { method: "DELETE", headers: { Authorization: auth } })).status, 404);
});

test("site pages", async () => {
    for (const p of ["/", "/privacy", "/download", "/health"])
        assert.equal((await call(p)).status, 200, p);
    assert.equal((await call("/nope")).status, 404);
    assert.equal((await call("/release/desktop.asar", { redirect: "manual" })).status, 302);
});

test("erase account", async () => {
    assert.equal((await call("/v1/", { method: "DELETE", headers: { Authorization: auth } })).status, 204);
    assert.equal((await call("/v1/settings", { headers: { Authorization: auth } })).status, 401);
});

test("accounts list", async () => {
    await DB.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?)").bind("323456789012345678", "third", "00", 1, 2).run();
    const res = await call("/v1/accounts");
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.total, body.accounts.length);
    assert.equal(body.accounts[0].id, "323456789012345678");
    assert.equal(body.accounts[0].data_count, 0);
    assert.equal((await call("/accounts")).status, 200);
});

test("web dashboard session", async () => {
    assert.equal((await call("/v1/me")).status, 401);
    assert.equal((await call("/dashboard", { redirect: "manual" })).status, 302);
    const login = await call("/login", { redirect: "manual" });
    assert.equal(login.status, 302);
    assert.ok(login.headers.get("location").includes("state=web"));

    await DB.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?)").bind("423456789012345678", "dash", "00", 1, 2).run();
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode("x:snore-session"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const payload = `423456789012345678.${Date.now() + 60_000}`;
    const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
    const b64url = btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const cookie = `snore_session=${payload}.${b64url}`;
    const me = await call("/v1/me", { headers: { Cookie: cookie } });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).user.username, "dash");
    assert.equal((await call("/dashboard", { headers: { Cookie: cookie } })).status, 200);
    assert.equal((await call("/v1/me/disconnect", { method: "POST", headers: { Cookie: cookie } })).status, 200);
    assert.equal((await call("/v1/me", { headers: { Cookie: cookie } })).status, 401);
});

test("settings history is kept and can be restored from the dashboard", async () => {
    const uid = "523456789012345678";
    const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("h1")))].map(b => b.toString(16).padStart(2, "0")).join("");
    await DB.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?)").bind(uid, "hist", hash, 1, 1).run();
    const a = btoa(`h1:${uid}`);
    const up = v => call("/v2/sync", { method: "POST", headers: { Authorization: a, "Content-Type": "application/json" }, body: JSON.stringify({ client_manifest: [], uploads: [{ key: "settings", value: btoa(v) }] }) });
    assert.equal((await up('{"a":1}')).status, 200);
    assert.equal((await up('{"a":2}')).status, 200);
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode("x:snore-session"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const payload = `${uid}.${Date.now() + 60_000}`;
    const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
    const cookie = `snore_session=${payload}.${btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
    const backups = await (await call("/v1/me/backups", { headers: { Cookie: cookie } })).json();
    assert.equal(backups.backups.length, 1);
    const r = await call("/v1/me/restore", { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ id: backups.backups[0].id }) });
    assert.equal(r.status, 200);
    const cur = await (await call("/v1/me/key/settings", { headers: { Cookie: cookie } })).json();
    assert.equal(cur.value, '{"a":1}');
    assert.equal((await call("/v1/me/key/quickCss", { method: "PUT", headers: { Cookie: cookie }, body: "body{}" })).status, 200);
    assert.equal((await (await call("/v1/me/key/quickCss", { headers: { Cookie: cookie } })).json()).value, "body{}");
    assert.equal((await call("/status")).status, 200);
    assert.equal((await call("/u/" + uid)).status, 404);
    assert.equal((await call("/v1/me/remote", { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify({ publicProfile: true, snippets: ";a = b" }) })).status, 200);
    assert.equal((await call("/u/" + uid)).status, 200);
});
