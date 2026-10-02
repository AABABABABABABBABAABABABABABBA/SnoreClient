/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { isPluginEnabled, startPlugin, stopPlugin } from "@api/PluginManager";
import { definePluginSettings, Settings, SettingsStore } from "@api/Settings";
import { getCloudAuth } from "@api/SettingsSync/cloudSetup";
import { onCloudKey, pullCloudKeys, putCloudKey } from "@api/SettingsSync/cloudSync";
import { gitHashShort } from "@shared/vencordUserAgent";
import { perf } from "@snoreclientplugins/optimizer";
import { SnoreClientDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { RelationshipType } from "@vencord/discord-types/enums";
import { findByPropsLazy } from "@webpack";
import { AuthSessionsStore, ChannelStore, GuildStore, MessageRequestStore, MessageStore, PresenceStore, RelationshipStore, RestAPI, SelectedChannelStore, SessionsStore, useEffect, UserStore, useState, VoiceStateStore } from "@webpack/common";

import Plugins from "~plugins";

const logger = new Logger("CloudPresence", "#a78bfa");

const settings = definePluginSettings({
    ghostMode: {
        type: OptionType.BOOLEAN,
        description: "Ghost mode: stay hidden from the Online now list on the website and in other people's clients. You still see everyone else.",
        default: false,
        onChange: () => connect(),
    },
    publicProfile: {
        type: OptionType.BOOLEAN,
        description: "Public profile page. Shows your name, avatar, client version and plugin count at /u/<your id> on the SnoreClient site.",
        default: false,
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
let remoteTimer: ReturnType<typeof setInterval> | undefined;
let unregisterRemote: (() => void) | undefined;

const platformName = () => IS_WEB ? (IS_EXTENSION ? "Browser extension" : IS_USERSCRIPT ? "Userscript" : "Web") : IS_EQUIBOP ? "Equibop" : IS_VESKTOP ? "Vesktop" : "Discord Desktop";

interface AuthSessionJson { id_hash: string; approx_last_used_time: string; client_info?: { os?: string; platform?: string; location?: string; }; }

async function authorizedSessions() {
    try {
        const res = await RestAPI.get({ url: "/auth/sessions" });
        const list = (res.body?.user_sessions ?? []) as AuthSessionJson[];
        return list.map(x => ({ id: x.id_hash.slice(0, 8), os: x.client_info?.os ?? "", platform: x.client_info?.platform ?? "", lastUsed: Date.parse(x.approx_last_used_time) }));
    } catch {
        return AuthSessionsStore.getSessions().map(x => ({ id: x.id_hash.slice(0, 8), os: x.client_info?.os ?? "", platform: x.client_info?.platform ?? "", lastUsed: new Date(x.approx_last_used_time).getTime() }));
    }
}

function gatewaySessions() {
    return Object.values(SessionsStore.getSessions()).map(x => ({
        id: x.sessionId, status: x.status, active: x.active,
        os: x.clientInfo?.os ?? "", client: x.clientInfo?.client ?? "",
        activities: (x.activities ?? []).map(a => a.name).slice(0, 5),
    }));
}

function accountInfo() {
    const me = UserStore.getCurrentUser();
    const voiceId = SelectedChannelStore.getVoiceChannelId();
    const voice = voiceId ? ChannelStore.getChannel(voiceId) : null;
    const vs = voiceId ? VoiceStateStore.getVoiceStateForUser(me.id) : undefined;
    return {
        createdAt: Number(BigInt(me.id) >> 22n) + 1420070400000,
        premiumType: me.premiumType ?? 0,
        mfaEnabled: !!me.mfaEnabled,
        verified: !!me.verified,
        status: PresenceStore.getStatus(me.id),
        activities: PresenceStore.getActivities(me.id).map(a => a.name).slice(0, 5),
        voice: voice ? { channel: voice.name, guild: voice.guild_id ? GuildStore.getGuild(voice.guild_id)?.name ?? "" : "DM", muted: !!vs?.selfMute, deafened: !!vs?.selfDeaf, video: !!vs?.selfVideo, streaming: !!vs?.selfStream } : null,
    };
}

function systemInfo() {
    const env = window.GLOBAL_ENV ?? {};
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { effectiveType?: string; }; userAgentData?: { platform?: string; }; };
    return {
        discordBuild: env.RELEASE_CHANNEL ?? "", buildNumber: env.BUILD_NUMBER ?? "",
        appVersion: typeof DiscordNative !== "undefined" ? String(DiscordNative.app?.getVersion?.() ?? "") : "",
        cores: nav.hardwareConcurrency ?? 0, memoryGb: nav.deviceMemory ?? 0,
        screen: `${screen.width}x${screen.height}@${window.devicePixelRatio}`,
        locale: nav.language, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        connection: nav.connection?.effectiveType ?? "", onLine: nav.onLine,
        startedAt: performance.timeOrigin,
        perf: isPluginEnabled("Optimizer") ? { ...perf } : null,
        optimizer: { reduceMotion: !!Settings.plugins.Optimizer?.reduceMotion, lowSpec: !!Settings.plugins.Optimizer?.lowSpec, idleThrottle: Settings.plugins.Optimizer?.idleThrottle !== false, noGifPlay: Settings.plugins.Optimizer?.noGifPlay !== false, trimMemory: Settings.plugins.Optimizer?.trimMemory !== false },
    };
}

async function publishDevice() {
    if (!Settings.cloud.authenticated) return;
    const plugins = Object.values(Plugins)
        .filter(p => !p.name.endsWith("API"))
        .map(p => ({ name: p.name, enabled: isPluginEnabled(p.name), required: !!p.required, description: p.description }));
    await putCloudKey("device", {
        platform: platformName(),
        os: navigator.platform,
        version: VERSION,
        hash: gitHashShort,
        channel: Settings.updateChannel,
        ghostMode: settings.store.ghostMode,
        privateMode: !!(isPluginEnabled("PrivateMode") && Settings.plugins.PrivateMode?.enabled),
        awayReply: isPluginEnabled("AwayReply"),
        awayMessage: Settings.plugins.AwayReply?.message ?? "",
        keywords: Settings.plugins.Notifier?.keywords ?? "",
        webhook: Settings.plugins.Notifier?.webhook ? "set" : "",
        snippets: Settings.plugins.TextSnippets?.snippets ?? "",
        publicProfile: settings.store.publicProfile,
        sessions: gatewaySessions(),
        authSessions: await authorizedSessions(),
        account: accountInfo(),
        system: systemInfo(),
        guilds: Object.values(GuildStore.getGuilds()).map(g => ({ id: g.id, name: g.name, icon: g.icon, owner: g.ownerId === UserStore.getCurrentUser()?.id })),
        plugins,
        updatedAt: Date.now(),
    }).catch(() => { });
}

const MessageRequestActions = findByPropsLazy("acceptMessageRequest", "rejectMessageRequest");

function describeUser(id: string) {
    const u = UserStore.getUser(id);
    return { id, username: u?.username ?? id, globalName: u?.globalName ?? null, avatar: u?.avatar ?? null };
}

async function publishSocial() {
    if (!Settings.cloud.authenticated) return;
    const incoming: (ReturnType<typeof describeUser> & { since?: string; })[] = [];
    const outgoing: ReturnType<typeof describeUser>[] = [];
    for (const [id, type] of RelationshipStore.getMutableRelationships()) {
        if (type === RelationshipType.INCOMING_REQUEST) incoming.push({ ...describeUser(id), since: RelationshipStore.getSince(id) });
        else if (type === RelationshipType.OUTGOING_REQUEST) outgoing.push(describeUser(id));
    }
    const messageRequests = [...MessageRequestStore.getMessageRequestChannelIds()].map(channelId => {
        const c = ChannelStore.getChannel(channelId);
        const last = MessageStore.getLastMessage(channelId);
        const other = c?.recipients?.[0];
        return { channelId, ...(other ? describeUser(other) : { id: "", username: c?.name ?? "Unknown", globalName: null, avatar: null }), preview: last?.content?.slice(0, 200) ?? "", at: last ? new Date(last.timestamp as unknown as string).getTime() : 0 };
    });
    await putCloudKey("social", {
        friends: RelationshipStore.getFriendCount(),
        blocked: RelationshipStore.getBlockedIDs().length,
        incoming, outgoing, messageRequests,
        updatedAt: Date.now(),
    }).catch(() => { });
}

const socialDone = new Set<string>();
async function applySocial(cmd: NonNullable<RemoteCommands["social"]>) {
    const run = async (tag: string, fn: () => Promise<unknown>) => {
        if (socialDone.has(tag)) return;
        socialDone.add(tag);
        try { await fn(); } catch (e) { logger.warn(`Dashboard social action ${tag} failed`, e); }
    };
    for (const id of cmd.accept ?? []) await run(`accept:${id}`, () => RestAPI.put({ url: `/users/@me/relationships/${id}`, body: {} }));
    for (const id of cmd.deny ?? []) await run(`deny:${id}`, () => RestAPI.del({ url: `/users/@me/relationships/${id}` }));
    for (const id of cmd.block ?? []) await run(`block:${id}`, () => RestAPI.put({ url: `/users/@me/relationships/${id}`, body: { type: RelationshipType.BLOCKED } }));
    for (const id of cmd.acceptMessage ?? []) await run(`acceptMsg:${id}`, () => MessageRequestActions.acceptMessageRequest?.(id) ?? RestAPI.put({ url: `/channels/${id}/recipients/@me` }));
    for (const id of cmd.denyMessage ?? []) await run(`denyMsg:${id}`, () => MessageRequestActions.rejectMessageRequest?.(id) ?? RestAPI.del({ url: `/channels/${id}` }));
    setTimeout(publishSocial, 3000);
}

async function publishNotifications() {
    if (!Settings.cloud.authenticated) return;
    const log = await DataStore.get<any[]>("notification-log") ?? [];
    const recent = [...log].sort((a, b) => b.timestamp - a.timestamp).slice(0, 100)
        .map(n => ({ id: n.id, title: n.title, body: n.body, color: n.color, icon: n.icon, at: n.timestamp }));
    await putCloudKey("notifications", { entries: recent, updatedAt: Date.now() }).catch(() => { });
}

interface RemoteCommands {
    issuedAt?: number;
    ghostMode?: boolean;
    privateMode?: boolean;
    awayReply?: boolean;
    awayMessage?: string;
    keywords?: string;
    webhook?: string;
    snippets?: string;
    publicProfile?: boolean;
    plugins?: Record<string, boolean>;
    optimizer?: Record<string, boolean>;
    social?: { accept?: string[]; deny?: string[]; block?: string[]; acceptMessage?: string[]; denyMessage?: string[]; };
}

let lastRemote = 0;

function togglePlugin(name: string, enable: boolean) {
    const plugin = Plugins[name];
    if (!plugin || plugin.required || plugin.name.endsWith("API")) return;
    const ps = Settings.plugins[name] ??= { enabled: false };
    if (ps.enabled === enable) return;
    ps.enabled = enable;
    if (!plugin.patches?.length) (enable ? startPlugin : stopPlugin)(plugin);
}

async function applyRemote(value: unknown) {
    const cmd = value as RemoteCommands;
    if (!cmd || typeof cmd !== "object") return;
    if ((cmd.issuedAt ?? 0) <= lastRemote) return;
    lastRemote = cmd.issuedAt ?? Date.now();
    logger.info("Applying remote commands from the dashboard", cmd);

    if (typeof cmd.ghostMode === "boolean") settings.store.ghostMode = cmd.ghostMode;
    if (typeof cmd.privateMode === "boolean") {
        togglePlugin("PrivateMode", true);
        (Settings.plugins.PrivateMode ??= { enabled: true }).enabled = cmd.privateMode;
    }
    if (typeof cmd.awayReply === "boolean") togglePlugin("AwayReply", cmd.awayReply);
    if (typeof cmd.awayMessage === "string" && cmd.awayMessage.trim()) (Settings.plugins.AwayReply ??= { enabled: false }).message = cmd.awayMessage.slice(0, 500);
    if (typeof cmd.keywords === "string") (Settings.plugins.Notifier ??= { enabled: false }).keywords = cmd.keywords.slice(0, 500);
    if (typeof cmd.webhook === "string") (Settings.plugins.Notifier ??= { enabled: false }).webhook = cmd.webhook.slice(0, 500);
    if (typeof cmd.snippets === "string") (Settings.plugins.TextSnippets ??= { enabled: false }).snippets = cmd.snippets.slice(0, 8000);
    if (typeof cmd.publicProfile === "boolean") settings.store.publicProfile = cmd.publicProfile;
    if (cmd.plugins) for (const [name, on] of Object.entries(cmd.plugins)) if (typeof on === "boolean") togglePlugin(name, on);
    if (cmd.optimizer && typeof cmd.optimizer === "object") {
        togglePlugin("Optimizer", true);
        const o = Settings.plugins.Optimizer ??= { enabled: true };
        for (const k of ["reduceMotion", "lowSpec", "idleThrottle", "noGifPlay", "trimMemory"]) if (typeof cmd.optimizer[k] === "boolean") o[k] = cmd.optimizer[k];
    }
    if (cmd.social && typeof cmd.social === "object") await applySocial(cmd.social);

    await publishDevice();
}

export default definePlugin({
    name: "CloudPresence",
    description: "Keeps a live connection to your SnoreClient cloud so the site, the Cloud tab and the dashboard show who is online, and feeds the web dashboard. Ghost mode hides you from the online list.",
    authors: [SnoreClientDevs.founder],
    required: true,
    settings,

    flux: {
        SESSIONS_REPLACE() { setTimeout(publishDevice, 2000); },
        VOICE_STATE_UPDATES() { setTimeout(publishDevice, 5000); },
        RELATIONSHIP_ADD() { setTimeout(publishSocial, 2000); },
        RELATIONSHIP_REMOVE() { setTimeout(publishSocial, 2000); },
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
        publishTimer = setInterval(() => { publishMessageLog(); publishDevice(); publishNotifications(); publishSocial(); }, 5 * 60_000);
        setTimeout(() => { publishDevice(); publishNotifications(); publishSocial(); }, 20_000);
        unregisterRemote = onCloudKey("remote", applyRemote);
        remoteTimer = setInterval(() => pullCloudKeys().catch(() => { }), 2 * 60_000);
        setTimeout(() => pullCloudKeys().catch(() => { }), 30_000);
    },

    stop() {
        clearInterval(publishTimer);
        clearInterval(remoteTimer);
        unregisterRemote?.();
        SettingsStore.removeGlobalChangeListener(onSettingChange);
        disconnect();
    },
});
