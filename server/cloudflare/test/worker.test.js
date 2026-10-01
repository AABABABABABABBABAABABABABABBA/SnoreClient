import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";

import worker from "../worker.js";
import { createD1 } from "./d1shim.js";

const DB = createD1(join(import.meta.dirname, "../schema.sql"));
const env = { DB, PUBLIC_URL: "https://snore.pw", DISCORD_CLIENT_ID: "1", DISCORD_CLIENT_SECRET: "x" };
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
