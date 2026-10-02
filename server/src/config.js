/*
 * SnoreClient server
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv(file) {
    if (!existsSync(file)) return;
    for (const line of readFileSync(file, "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
        if (!m || line.trim().startsWith("#")) continue;
        const value = m[2].replace(/^(["'])(.*)\1$/, "$2");
        process.env[m[1]] ??= value;
    }
}

loadDotEnv(resolve(process.cwd(), ".env"));

function required(name) {
    const v = process.env[name];
    if (!v) {
        console.error(`Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`);
        process.exit(1);
    }
    return v;
}

const publicUrl = required("PUBLIC_URL").replace(/\/+$/, "");
if (!/^https?:\/\//.test(publicUrl)) {
    console.error("PUBLIC_URL must start with https:// (or http:// for an IP without TLS), e.g. https://snore.pw");
    process.exit(1);
}

export const config = {
    host: process.env.HOST || "0.0.0.0",
    port: Number(process.env.PORT || 8080),
    publicUrl,
    dataDir: resolve(process.env.DATA_DIR || "./data"),
    discordClientId: required("DISCORD_CLIENT_ID"),
    discordClientSecret: required("DISCORD_CLIENT_SECRET"),
    redirectUri: process.env.DISCORD_REDIRECT_URI || `${publicUrl}/v1/oauth/callback`,
    maxBlobBytes: Number(process.env.MAX_BLOB_BYTES || 8 * 1024 * 1024),
    maxKeysPerUser: Number(process.env.MAX_KEYS_PER_USER || 64),
    allowedUserIds: (process.env.ALLOWED_USER_IDS || "").split(",").map(s => s.trim()).filter(Boolean),
    githubRepo: process.env.GITHUB_REPO || "aababababababbabaabababababba/SnoreClient",
    siteName: process.env.SITE_NAME || "SnoreClient",
    trustProxy: process.env.TRUST_PROXY === "1",
    rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE || 120),
    publicAccounts: process.env.PUBLIC_ACCOUNTS === "1",
};
