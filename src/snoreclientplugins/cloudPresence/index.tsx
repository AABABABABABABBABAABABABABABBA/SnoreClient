/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings, SettingsStore } from "@api/Settings";
import { getCloudAuth } from "@api/SettingsSync/cloudSetup";
import { SnoreClientDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { useEffect, useState } from "@webpack/common";

const logger = new Logger("CloudPresence", "#a78bfa");

export interface OnlineUser {
    id: string;
    username: string;
    since: number;
}

export interface Presence {
    online: OnlineUser[];
    count: number;
    viewers: number;
    at: number;
}

let socket: WebSocket | null = null;
let retry = 2000;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let pingTimer: ReturnType<typeof setInterval> | undefined;
let presence: Presence = { online: [], count: 0, viewers: 0, at: 0 };
let connected = false;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach(l => l());

export const getPresence = () => presence;
export const isLiveConnected = () => connected;

export function usePresence() {
    const [, tick] = useState(0);
    useEffect(() => {
        const l = () => tick(n => n + 1);
        listeners.add(l);
        return () => { listeners.delete(l); };
    }, []);
    return { presence, connected };
}

async function connect() {
    disconnect(false);
    if (!Settings.cloud.authenticated) return;

    let auth: string;
    try {
        auth = await getCloudAuth();
    } catch {
        return;
    }

    const url = new URL("/v1/live", Settings.cloud.url);
    url.protocol = url.protocol === "http:" ? "ws:" : "wss:";
    url.searchParams.set("auth", auth);

    const ws = new WebSocket(url);
    socket = ws;

    ws.onopen = () => {
        connected = true;
        retry = 2000;
        logger.info("Live presence connected");
        pingTimer = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send("ping"); }, 25_000);
        notify();
    };
    ws.onmessage = e => {
        if (typeof e.data !== "string" || e.data === "pong") return;
        try {
            const msg = JSON.parse(e.data);
            if (msg.type === "hello" || msg.type === "presence") {
                presence = { online: msg.online ?? [], count: msg.count ?? 0, viewers: msg.viewers ?? 0, at: msg.at ?? Date.now() };
                notify();
            }
        } catch { }
    };
    ws.onclose = () => {
        if (socket !== ws) return;
        connected = false;
        clearInterval(pingTimer);
        notify();
        if (Settings.cloud.authenticated) {
            reconnectTimer = setTimeout(connect, retry);
            retry = Math.min(retry * 2, 60_000);
        }
    };
    ws.onerror = () => ws.close();
}

function disconnect(final = true) {
    clearTimeout(reconnectTimer);
    clearInterval(pingTimer);
    const ws = socket;
    socket = null;
    if (ws) {
        ws.onclose = null;
        try { ws.close(); } catch { }
    }
    connected = false;
    if (final) {
        presence = { online: [], count: 0, viewers: 0, at: 0 };
        notify();
    }
}

function onSettingChange(_: unknown, path: string) {
    if (path === "cloud.authenticated" || path === "cloud.url") connect();
}

export default definePlugin({
    name: "CloudPresence",
    description: "Keeps a live connection to your SnoreClient cloud so the site, the Cloud tab and the dashboard show who is online right now.",
    authors: [SnoreClientDevs.founder],
    enabledByDefault: true,

    start() {
        connect();
        SettingsStore.addGlobalChangeListener(onSettingChange);
    },

    stop() {
        SettingsStore.removeGlobalChangeListener(onSettingChange);
        disconnect();
    },
});
