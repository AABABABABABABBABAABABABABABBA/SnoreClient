import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

process.env.DISCORD_CLIENT_ID = "1";
process.env.DISCORD_CLIENT_SECRET = "x";
process.env.PORT = "0";
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "snore-"));
process.env.PUBLIC_URL = "http://localhost";
process.env.PUBLIC_ACCOUNTS = "1";

let base, auth;

before(async () => {
    const { server } = await import("../src/index.js");
    await new Promise(r => server.listening ? r() : server.once("listening", r));
    base = `http://127.0.0.1:${server.address().port}`;

    const { users } = await import("../src/db.js");
    const { hashSecret } = await import("../src/auth.js");
    users.upsert("123456789012345678", "tester", hashSecret("s3cret"));
    auth = Buffer.from("s3cret:123456789012345678").toString("base64");
});

after(async () => {
    const { server } = await import("../src/index.js");
    server.close();
});



test("ping", async () => {
    const res = await fetch(`${base}/v1/`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ping, "pong");
});

test("oauth settings", async () => {
    const res = await fetch(`${base}/v1/oauth/settings`);
    const body = await res.json();
    assert.equal(body.clientId, "1");
    assert.equal(body.redirectUri, "http://localhost/v1/oauth/callback");
});

test("rejects bad auth", async () => {
    const res = await fetch(`${base}/v1/settings`, { headers: { Authorization: Buffer.from("nope:123456789012345678").toString("base64") } });
    assert.equal(res.status, 401);
});

test("v1 settings round trip", async () => {
    assert.equal((await fetch(`${base}/v1/settings`, { headers: { Authorization: auth } })).status, 404);

    const put = await fetch(`${base}/v1/settings`, { method: "PUT", headers: { Authorization: auth, "Content-Type": "application/octet-stream" }, body: Buffer.from([1, 2, 3]) });
    assert.equal(put.status, 200);
    const { written } = await put.json();

    const get = await fetch(`${base}/v1/settings`, { headers: { Authorization: `Basic ${auth}` } });
    assert.equal(get.status, 200);
    assert.equal(get.headers.get("etag"), String(written));
    assert.deepEqual([...new Uint8Array(await get.arrayBuffer())], [1, 2, 3]);

    const cached = await fetch(`${base}/v1/settings`, { headers: { Authorization: auth, "If-None-Match": String(written) } });
    assert.equal(cached.status, 304);

    assert.equal((await fetch(`${base}/v1/settings`, { method: "DELETE", headers: { Authorization: auth } })).status, 204);
    assert.equal((await fetch(`${base}/v1/settings`, { headers: { Authorization: auth } })).status, 404);
});

test("v2 sync", async () => {
    const value = Buffer.from("hello").toString("base64");
    const sync = (body) => fetch(`${base}/v2/sync`, { method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());

    let r = await sync({ client_manifest: [], uploads: [{ key: "settings", value }] });
    assert.equal(r.uploaded.length, 1);
    assert.equal(r.uploaded[0].version, 1);
    assert.equal(r.downloads.length, 0);
    assert.equal(r.errors.length, 0);

    r = await sync({ client_manifest: [], uploads: [] });
    assert.equal(r.downloads.length, 1);
    assert.equal(r.downloads[0].value, value);

    r = await sync({ client_manifest: r.server_manifest, uploads: [] });
    assert.equal(r.downloads.length, 0);

    r = await sync({ client_manifest: [], uploads: [{ key: "bad key!", value }] });
    assert.equal(r.errors[0].error, "Invalid key");

    const manifest = await fetch(`${base}/v2/manifest`, { headers: { Authorization: auth } }).then(r => r.json());
    assert.equal(manifest.entries[0].key, "settings");

    assert.equal((await fetch(`${base}/v2/data/settings`, { method: "DELETE", headers: { Authorization: auth } })).status, 204);
    assert.equal((await fetch(`${base}/v2/data/settings`, { method: "DELETE", headers: { Authorization: auth } })).status, 404);
});

test("site pages render", async () => {
    for (const p of ["/", "/privacy", "/download", "/health", "/assets/icon.svg"])
        assert.equal((await fetch(`${base}${p}`)).status, 200, p);
    assert.equal((await fetch(`${base}/nope`)).status, 404);
});

test("erase account", async () => {
    assert.equal((await fetch(`${base}/v1/`, { method: "DELETE", headers: { Authorization: auth } })).status, 204);
    assert.equal((await fetch(`${base}/v1/settings`, { headers: { Authorization: auth } })).status, 401);
});

test("accounts list", async () => {
    const { users } = await import("../src/db.js");
    const { hashSecret } = await import("../src/auth.js");
    users.upsert("223456789012345678", "second", hashSecret("x"));
    const res = await fetch(`${base}/v1/accounts`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.total, body.accounts.length);
    assert.ok(body.accounts.some(a => a.id === "223456789012345678" && a.username === "second" && typeof a.data_count === "number"));
    assert.equal((await fetch(`${base}/accounts`)).status, 200);
});

test("web dashboard session", async () => {
    const { createHash, createHmac } = await import("node:crypto");
    assert.equal((await fetch(`${base}/v1/me`)).status, 401);
    assert.equal((await fetch(`${base}/dashboard`, { redirect: "manual" })).status, 302);
    const login = await fetch(`${base}/login`, { redirect: "manual" });
    assert.equal(login.status, 302);
    assert.ok(login.headers.get("location").includes("state=web"));

    const { users } = await import("../src/db.js");
    const { hashSecret } = await import("../src/auth.js");
    users.upsert("423456789012345678", "dash", hashSecret("d"));
    const key = createHash("sha256").update("x:snore-session").digest();
    const payload = `423456789012345678.${Date.now() + 60_000}`;
    const cookie = `snore_session=${payload}.${createHmac("sha256", key).update(payload).digest("base64url")}`;
    const me = await fetch(`${base}/v1/me`, { headers: { Cookie: cookie } });
    assert.equal(me.status, 200);
    const body = await me.json();
    assert.equal(body.user.username, "dash");
    assert.deepEqual(body.entries, []);
    assert.equal((await fetch(`${base}/dashboard`, { headers: { Cookie: cookie } })).status, 200);
    assert.equal((await fetch(`${base}/v1/me/disconnect`, { method: "POST", headers: { Cookie: cookie } })).status, 200);
    assert.equal((await fetch(`${base}/v1/me`, { headers: { Cookie: cookie } })).status, 401);
});
