/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Paragraph } from "@components/Paragraph";
import { SnoreClientDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, GuildMemberStore, GuildRoleStore, GuildStore, MessageStore, NavigationRouter, SelectedChannelStore, UserStore } from "@webpack/common";

const logger = new Logger("Notifier", "#a78bfa");

const settings = definePluginSettings({
    pinged: { type: OptionType.BOOLEAN, description: "You got pinged (direct mention, with a Jump button).", default: true },
    keywords: { type: OptionType.STRING, description: "Keyword detected. Comma separated words or phrases to watch for in any channel.", default: "" },
    ghostPing: { type: OptionType.BOOLEAN, description: "Ghost ping detected (someone pinged you then deleted or edited it).", default: true },
    friendRemoved: { type: OptionType.BOOLEAN, description: "Friend removed you.", default: true },
    friendRequest: { type: OptionType.BOOLEAN, description: "New friend request received.", default: true },
    serverLeft: { type: OptionType.BOOLEAN, description: "Kicked, banned or removed from a server.", default: true },
    roles: { type: OptionType.BOOLEAN, description: "Role added or removed in a server.", default: true },
    nickname: { type: OptionType.BOOLEAN, description: "Your nickname got updated.", default: true },
    typingDm: { type: OptionType.BOOLEAN, description: "Someone is typing in your DMs.", default: false },
    voiceJoin: { type: OptionType.BOOLEAN, description: "Someone joined your voice channel.", default: true },
    serverJoined: { type: OptionType.BOOLEAN, description: "Joined a server.", default: true },
    groupRename: { type: OptionType.BOOLEAN, description: "Group DM renamed, with a warning when a group gets renamed a lot.", default: true },
    giveawayJoined: { type: OptionType.BOOLEAN, description: "Joined a giveaway (you reacted 🎉 to a giveaway message).", default: true },
    giveaway: { type: OptionType.BOOLEAN, description: "Giveaway detected (a bot posted a giveaway in a channel you can see). Detection only, nothing is entered for you.", default: false },
    sound: { type: OptionType.BOOLEAN, description: "Play a short chime with each notification.", default: true },
    webhook: { type: OptionType.STRING, description: "Discord webhook URL. Every event is also posted there as an embed, so you can get them on your phone.", default: "" },
    desktopHint: { type: OptionType.COMPONENT, description: "", component: () => (
        <>
            <Paragraph className={Margins.bottom8}>
                Desktop (system) notifications follow the global setting under SnoreClient → Notifications → Notification style. Everything also lands in the Notification Center.
            </Paragraph>
            <Button size="small" variant="secondary" onClick={openNotificationLogModal}>Open Notification Center</Button>
        </>
    ) },
});

type Kind = "info" | "success" | "warning" | "danger";
const COLORS: Record<Kind, string> = { info: "#5b8cff", success: "#4ade80", warning: "#fbbf24", danger: "#f23f43" };
const EMBED_COLORS: Record<Kind, number> = { info: 0x5b8cff, success: 0x4ade80, warning: 0xfbbf24, danger: 0xf23f43 };

let audio: AudioContext | undefined;
function chime() {
    if (!settings.store.sound) return;
    try {
        audio ??= new AudioContext();
        const now = audio.currentTime;
        for (const [freq, start] of [[880, 0], [1174, 0.12]] as const) {
            const osc = audio.createOscillator();
            const gain = audio.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, now + start);
            gain.gain.exponentialRampToValueAtTime(0.12, now + start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.25);
            osc.connect(gain).connect(audio.destination);
            osc.start(now + start);
            osc.stop(now + start + 0.3);
        }
    } catch { }
}

function webhook(title: string, body: string, kind: Kind, context?: string) {
    const url = settings.store.webhook.trim();
    if (!/^https:\/\/(canary\.|ptb\.)?discord(app)?\.com\/api\/webhooks\//.test(url)) return;
    fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: "SnoreClient",
            avatar_url: `${SNORE_SERVER_URL}/assets/icon.png`,
            embeds: [{ title: `SnoreClient | ${title}`, description: body, color: EMBED_COLORS[kind], footer: { text: context ?? "snore.pw" }, timestamp: new Date().toISOString() }],
        }),
    }).catch(e => logger.warn("Webhook failed", e));
}

export interface ActivityEvent { id: string; at: number; title: string; body: string; kind: Kind; category: string; icon?: string; jump?: string; }
export const activityListeners = new Set<(e: ActivityEvent) => void>();

function categoryOf(title: string) {
    const t = title.toLowerCase();
    if (t.includes("giveaway")) return "giveaway";
    if (t.includes("ghost")) return "ghostping";
    if (t.includes("pinged") || t.includes("keyword")) return "ping";
    if (t.includes("friend")) return "friends";
    if (t.includes("server")) return "server";
    if (t.includes("role") || t.includes("nickname")) return "roles";
    if (t.includes("group")) return "group";
    if (t.includes("voice")) return "voice";
    if (t.includes("typing") || t.includes("dm")) return "dm";
    return "other";
}

export function notify(title: string, body: string, kind: Kind = "info", opts: { icon?: string; jump?: string; context?: string; permanent?: boolean; } = {}) {
    const event: ActivityEvent = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, at: Date.now(), title, body, kind, category: categoryOf(title), icon: opts.icon, jump: opts.jump };
    activityListeners.forEach(l => { try { l(event); } catch { } });
    showNotification({
        title: `SnoreClient | ${title}`,
        body,
        color: COLORS[kind],
        icon: opts.icon,
        permanent: opts.permanent,
        onClick: opts.jump ? () => NavigationRouter.transitionTo(opts.jump!) : undefined,
    });
    chime();
    webhook(title, body, kind, opts.context);
}

const me = () => UserStore.getCurrentUser();
const avatar = (id: string) => UserStore.getUser(id)?.getAvatarURL(undefined, 64, true);
const where = (channelId: string) => {
    const c = ChannelStore.getChannel(channelId);
    if (!c) return { label: "somewhere", jump: "/channels/@me" };
    if (c.isDM() || c.isGroupDM()) return { label: c.isDM() ? "DMs" : c.name || "group DM", jump: `/channels/@me/${c.id}` };
    return { label: `#${c.name}, ${GuildStore.getGuild(c.guild_id)?.name ?? "server"}`, jump: `/channels/${c.guild_id}/${c.id}` };
};

const typingSeen = new Map<string, number>();
const groupNames = new Map<string, string>();
const groupRenames = new Map<string, number[]>();
const knownGuilds = new Set<string>();
let guildsReady = false;
const lastRoles = new Map<string, string[]>();
const lastNick = new Map<string, string | null>();

export default definePlugin({
    name: "Notifier",
    description: "Stay notified about everything: pings, keywords, ghost pings, friend changes, kicks, roles, nicknames, DMs typing, voice joins and giveaways, through the notification center, desktop alerts, a chime and a Discord webhook.",
    authors: [SnoreClientDevs.founder],
    enabledByDefault: true,
    settings,

    flux: {
        MESSAGE_CREATE({ optimistic, type, message }: { optimistic: boolean; type: string; message: Message; }) {
            if (optimistic || type !== "MESSAGE_CREATE" || !message?.author) return;
            const my = me();
            if (!my || message.author.id === my.id) return;
            const w = where(message.channel_id);
            const jump = `${w.jump}/${message.id}`;

            if (settings.store.pinged && message.mentions?.includes(my.id)) {
                notify("You got pinged", `${message.author.username}: ${(message.content || "").slice(0, 160)}`, "info", { icon: avatar(message.author.id), jump, context: w.label });
                return;
            }

            const words = settings.store.keywords.split(",").map(k => k.trim().toLowerCase()).filter(Boolean);
            if (words.length && message.content) {
                const text = message.content.toLowerCase();
                const hit = words.find(k => text.includes(k));
                if (hit) notify("Keyword detected", `"${hit}" by ${message.author.username}: ${message.content.slice(0, 160)}`, "warning", { icon: avatar(message.author.id), jump, context: w.label });
            }

            if (settings.store.giveaway && message.author.bot) {
                const text = `${message.content ?? ""} ${(message.embeds ?? []).map((e: any) => `${e.rawTitle ?? e.title ?? ""} ${e.rawDescription ?? e.description ?? ""}`).join(" ")}`.toLowerCase();
                if (/giveaway|🎉/.test(text)) notify("Giveaway detected", `${message.author.username} posted a giveaway in ${w.label}.`, "success", { icon: avatar(message.author.id), jump, context: w.label });
            }
        },

        MESSAGE_DELETE({ id, channelId }: { id: string; channelId: string; }) {
            if (!settings.store.ghostPing) return;
            const my = me();
            const m = MessageStore.getMessage(channelId, id);
            if (!my || !m?.author || m.author.id === my.id || !m.mentions?.includes(my.id)) return;
            const w = where(channelId);
            notify("You got ghost pinged", `By ${m.author.username}: ${(m.content || "").slice(0, 160)}`, "danger", { icon: avatar(m.author.id), jump: w.jump, context: w.label, permanent: true });
        },

        RELATIONSHIP_REMOVE({ relationship }: { relationship: { id: string; type: number; }; }) {
            if (!settings.store.friendRemoved || relationship?.type !== 1) return;
            const user = UserStore.getUser(relationship.id);
            notify("Friend removed you", `${user?.username ?? relationship.id} is no longer your friend.`, "danger", { icon: avatar(relationship.id), jump: "/channels/@me" });
        },

        RELATIONSHIP_ADD({ relationship }: { relationship: { id: string; type: number; }; }) {
            if (!settings.store.friendRequest || relationship?.type !== 3) return;
            const user = UserStore.getUser(relationship.id);
            notify("Friend request", `${user?.username ?? relationship.id} sent you a friend request.`, "info", { icon: avatar(relationship.id), jump: "/channels/@me" });
        },

        CONNECTION_OPEN() {
            knownGuilds.clear();
            for (const g of Object.values(GuildStore.getGuilds())) knownGuilds.add(g.id);
            guildsReady = true;
        },

        GUILD_CREATE({ guild }: { guild: { id: string; name?: string; unavailable?: boolean; }; }) {
            if (!guildsReady) return;
            if (knownGuilds.has(guild.id) || guild?.unavailable) return;
            knownGuilds.add(guild.id);
            if (!settings.store.serverJoined) return;
            notify("Joined server", `You joined ${guild.name ?? GuildStore.getGuild(guild.id)?.name ?? guild.id}.`, "success", { jump: `/channels/${guild.id}` });
        },

        CHANNEL_UPDATE({ channel }: { channel: { id: string; type: number; name?: string; }; }) {
            if (!settings.store.groupRename || channel?.type !== 3) return;
            const before = groupNames.get(channel.id) ?? ChannelStore.getChannel(channel.id)?.name ?? "";
            const after = channel.name ?? "";
            groupNames.set(channel.id, after);
            if (!before || before === after) return;
            const times = (groupRenames.get(channel.id) ?? []).filter(t => Date.now() - t < 10 * 60_000);
            times.push(Date.now());
            groupRenames.set(channel.id, times);
            const hot = times.length >= 3;
            notify(hot ? "Group renamed a lot" : "Group DM renamed", `${before} → ${after || "(no name)"}${hot ? ` · ${times.length} renames in 10 min` : ""}`, hot ? "warning" : "info", { jump: `/channels/@me/${channel.id}` });
        },

        MESSAGE_REACTION_ADD({ channelId, messageId, userId, emoji }: { channelId: string; messageId: string; userId: string; emoji: { name?: string; }; }) {
            if (!settings.store.giveawayJoined || userId !== me()?.id || !["🎉", "🎊", "🎁"].includes(emoji?.name ?? "")) return;
            const m = MessageStore.getMessage(channelId, messageId);
            const text = `${m?.content ?? ""} ${m?.embeds?.map(e => `${e.rawTitle ?? ""} ${e.rawDescription ?? ""}`).join(" ") ?? ""}`.toLowerCase();
            if (!m?.author?.bot || !text.includes("giveaway")) return;
            const w = where(channelId);
            notify("Joined giveaway", `You entered a giveaway in ${w.label}.`, "success", { jump: w.jump });
        },

        GUILD_DELETE({ guild }: { guild: { id: string; unavailable?: boolean; }; }) {
            if (!settings.store.serverLeft || guild?.unavailable) return;
            const g = GuildStore.getGuild(guild.id);
            notify("Left/kicked from server", `You are no longer in ${g?.name ?? guild.id}.`, "warning");
        },

        GUILD_MEMBER_UPDATE({ guildId, user, roles, nick }: { guildId: string; user: { id: string; }; roles?: string[]; nick?: string | null; }) {
            const my = me();
            if (!my || user?.id !== my.id) return;
            const guild = GuildStore.getGuild(guildId)?.name ?? "a server";

            if (settings.store.roles && roles) {
                const before = lastRoles.get(guildId) ?? GuildMemberStore.getMember(guildId, my.id)?.roles ?? [];
                const added = roles.filter(r => !before.includes(r));
                const removed = before.filter(r => !roles.includes(r));
                const name = (id: string) => GuildRoleStore.getRole(guildId, id)?.name ?? id;
                if (lastRoles.has(guildId) || added.length || removed.length) {
                    if (added.length) notify("Role added in server", `${added.map(name).join(", ")} in ${guild}`, "success", { jump: `/channels/${guildId}` });
                    if (removed.length) notify("Role removed in server", `${removed.map(name).join(", ")} in ${guild}`, "warning", { jump: `/channels/${guildId}` });
                }
                lastRoles.set(guildId, roles);
            }

            if (settings.store.nickname && nick !== undefined) {
                const before = lastNick.has(guildId) ? lastNick.get(guildId) : GuildMemberStore.getMember(guildId, my.id)?.nick ?? null;
                if (before !== nick) notify("Your nickname got updated", `${guild}: ${before ?? my.username} → ${nick ?? my.username}`, "info", { jump: `/channels/${guildId}` });
                lastNick.set(guildId, nick);
            }
        },

        TYPING_START({ channelId, userId }: { channelId: string; userId: string; }) {
            if (!settings.store.typingDm || userId === me()?.id) return;
            const c = ChannelStore.getChannel(channelId);
            if (!c?.isDM()) return;
            const last = typingSeen.get(channelId) ?? 0;
            if (Date.now() - last < 60_000) return;
            typingSeen.set(channelId, Date.now());
            const user = UserStore.getUser(userId);
            notify("User is typing in DMs", `${user?.username ?? userId} is typing…`, "info", { icon: avatar(userId), jump: `/channels/@me/${channelId}` });
        },

        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: { userId: string; channelId: string | null; oldChannelId?: string | null; }[]; }) {
            if (!settings.store.voiceJoin) return;
            const my = me();
            const mine = SelectedChannelStore.getVoiceChannelId();
            if (!my || !mine) return;
            for (const s of voiceStates) {
                if (s.userId === my.id || s.channelId !== mine || s.oldChannelId === mine) continue;
                const user = UserStore.getUser(s.userId);
                const w = where(mine);
                notify("Joined your voice channel", `${user?.username ?? s.userId} joined ${w.label}.`, "info", { icon: avatar(s.userId), jump: w.jump });
            }
        },
    },

    notify,
});
