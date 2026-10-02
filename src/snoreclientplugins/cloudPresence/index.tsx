/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings, Settings, SettingsStore } from "@api/Settings";
import { getCloudAuth } from "@api/SettingsSync/cloudSetup";
import { putCloudKey } from "@api/SettingsSync/cloudSync";
import { SnoreClientDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, GuildStore, MessageStore, useEffect, UserStore, useState } from "@webpack/common";

const logger = new Logger("CloudPresence", "#a78bfa");

const settings = definePluginSettings({
    ghostMode: {
        type: OptionType.BOOLEAN,
        description: "Ghost mode: stay hidden from the Online now list on the website and in other people's clients. You still see everyone else.",
        default: false,
        onChange: () => connect(),
    },
    uploadMessageLog: {
        type: OptionType.BOOLEAN,
        description: "Show deleted and edited messages on your web dashboard. Only works while the MessageLogger plugin is enabled.",
        default: true,
    },
    messageLogSize: {
        type: OptionType.SLIDER,
        description: "How many logged messages to keep on the dashboard.",
        markers: [100, 250, 500, 1000],
        default: 250,
        stickToMarkers: true,
    },
});

interface LoggedMessage {
    type: "deleted" | "edited";
    at: number;
    id: string;
    author: string;
    authorId: string;
    guild: string;
    channel: string;
    channelId: string;
    content: string;
    before?: string;
    attachments?: number;
}

const LOG_KEY = "CloudPresence_messageLog";
let messageLog: LoggedMessage[] = [];
let logDirty = false;

function describeChannel(channelId: string) {
    const c = ChannelStore.getChannel(channelId);
    if (!c) return { guild: "Unknown", channel: channelId };
    if (c.isDM() || c.isGroupDM()) return { guild: "DM", channel: c.isDM() ? UserStore.getUser(c.recipients?.[0])?.username ?? "dm" : c.name || "group" };
    return { guild: GuildStore.getGuild(c.guild_id)?.name ?? "Unknown server", channel: `#${c.name}` };
}

function logMessage(entry: LoggedMessage) {
    messageLog.unshift(entry);
    if (messageLog.length > settings.store.messageLogSize) messageLog.length = settings.store.messageLogSize;
    logDirty = true;
    DataStore.set(LOG_KEY, messageLog);
}

async function publishMessageLog() {
    if (!logDirty || !settings.store.uploadMessageLog || !isPluginEnabled("MessageLogger")) return;
    logDirty = false;
    await putCloudKey("messagelog", { entries: messageLog, updatedAt: Date.now() }).catch(() => { });
}

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
    if (!settings.store.ghostMode) url.searchParams.set("auth", auth);

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

let publishTimer: ReturnType<typeof setInterval> | undefined;

export default definePlugin({
    name: "CloudPresence",
    description: "Keeps a live connection to your SnoreClient cloud so the site, the Cloud tab and the dashboard show who is online, and feeds the web dashboard. Ghost mode hides you from the online list.",
    authors: [SnoreClientDevs.founder],
    required: true,
    settings,

    flux: {
        MESSAGE_DELETE({ id, channelId }: { id: string; channelId: string; }) {
            if (!settings.store.uploadMessageLog || !isPluginEnabled("MessageLogger")) return;
            const m = MessageStore.getMessage(channelId, id);
            if (!m?.author || m.author.id === UserStore.getCurrentUser()?.id) return;
            logMessage({ type: "deleted", at: Date.now(), id, author: m.author.username, authorId: m.author.id, ...describeChannel(channelId), channelId, content: m.content || "", attachments: m.attachments?.length || 0 });
        },
        MESSAGE_UPDATE({ message }: { message: Message; }) {
            if (!settings.store.uploadMessageLog || !isPluginEnabled("MessageLogger")) return;
            if (!message?.id || message.content === undefined) return;
            const old = MessageStore.getMessage(message.channel_id, message.id);
            if (!old?.author || old.author.id === UserStore.getCurrentUser()?.id || old.content === message.content) return;
            logMessage({ type: "edited", at: Date.now(), id: message.id, author: old.author.username, authorId: old.author.id, ...describeChannel(message.channel_id), channelId: message.channel_id, content: message.content, before: old.content });
        },
    },

    async start() {
        messageLog = await DataStore.get<LoggedMessage[]>(LOG_KEY) ?? [];
        connect();
        SettingsStore.addGlobalChangeListener(onSettingChange);
        publishTimer = setInterval(publishMessageLog, 5 * 60_000);
    },

    stop() {
        clearInterval(publishTimer);
        SettingsStore.removeGlobalChangeListener(onSettingChange);
        disconnect();
    },
});
