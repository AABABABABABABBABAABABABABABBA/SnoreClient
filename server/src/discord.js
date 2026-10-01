/*
 * SnoreClient server
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { config } from "./config.js";

const API = "https://discord.com/api/v10";

export async function exchangeCode(code) {
    const res = await fetch(`${API}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: config.discordClientId,
            client_secret: config.discordClientSecret,
            grant_type: "authorization_code",
            code,
            redirect_uri: config.redirectUri,
        }),
    });

    if (!res.ok) throw new Error(`Discord token exchange failed (${res.status}): ${await res.text()}`);
    return res.json();
}

export async function fetchUser(accessToken) {
    const res = await fetch(`${API}/users/@me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Discord user lookup failed (${res.status})`);
    return res.json();
}

export async function revokeToken(token) {
    await fetch(`${API}/oauth2/token/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: config.discordClientId,
            client_secret: config.discordClientSecret,
            token,
        }),
    }).catch(() => { });
}
