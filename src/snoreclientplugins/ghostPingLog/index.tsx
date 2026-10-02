/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { Paragraph } from "@components/Paragraph";
import { SnoreClientDevs } from "@utils/constants";
import { Margins } from "@utils/margins";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, GuildMemberStore, GuildStore, MessageStore, NavigationRouter, UserStore } from "@webpack/common";

const Native = IS_WEB ? null : VencordNative.pluginHelpers.GhostPingLog as PluginNative<typeof import("./native")>;

const STORE_KEY = "GhostPingLog_entries";

interface Entry {
    at: number;
    authorId: string;
    author: string;
    guild: string;
    channel: string;
    channelId: string;
    messageId: string;
    content: string;
    how: "deleted" | "edited";
}

const settings = definePluginSettings({
    notify: {
        type: OptionType.BOOLEAN,
        description: "Show a notification when someone ghost pings you.",
        default: true,
    },
    includeEveryone: {
        type: OptionType.BOOLEAN,
        description: "Also count deleted @everyone, @here and role pings.",
        default: true,
    },
    ignoreBots: {
        type: OptionType.BOOLEAN,
        description: "Ignore pings from bots.",
        default: true,
    },
    maxEntries: {
        type: OptionType.NUMBER,
        description: "How many entries to keep in the in app log (the .txt file keeps everything).",
        default: 500,
    },
});

let entries: Entry[] = [];

function mentionsMe(message: Message) {
    const me = UserStore.getCurrentUser();
    if (!me) return false;
    if (message.mentions?.includes(me.id)) return true;
    if (!settings.store.includeEveryone) return false;
    if (message.mentionEveryone) return true;
    const channel = ChannelStore.getChannel(message.channel_id);
    if (!channel?.guild_id || !message.mentionRoles?.length) return false;
    const roles = GuildMemberStore.getMember(channel.guild_id, me.id)?.roles ?? [];
    return message.mentionRoles.some(r => roles.includes(r));
}

function formatLine(e: Entry) {
    const when = new Date(e.at).toISOString().replace("T", " ").slice(0, 19);
    return `[${when}] ${e.how.toUpperCase()} | ${e.author} (${e.authorId}) | ${e.guild} #${e.channel} | ${e.content.replace(/\s+/g, " ")}`;
}

async function record(message: Message, how: Entry["how"]) {
    const channel = ChannelStore.getChannel(message.channel_id);
    const entry: Entry = {
        at: Date.now(),
        authorId: message.author.id,
        author: message.author.username,
        guild: channel?.guild_id ? GuildStore.getGuild(channel.guild_id)?.name ?? "Unknown server" : "DM",
        channel: channel?.name || "dm",
        channelId: message.channel_id,
        messageId: message.id,
        content: message.content || "(no text)",
        how,
    };

    entries.push(entry);
    if (entries.length > settings.store.maxEntries) entries = entries.slice(-settings.store.maxEntries);
    await DataStore.set(STORE_KEY, entries);
    await Native?.appendLine(formatLine(entry)).catch(() => { });

    if (settings.store.notify) {
        showNotification({
            title: `Ghost ping from ${entry.author}`,
            body: `${entry.guild} #${entry.channel}: ${entry.content.slice(0, 120)}`,
            onClick: () => NavigationRouter.transitionTo(`/channels/${channel?.guild_id ?? "@me"}/${entry.channelId}`),
        });
    }
}

function exportTxt() {
    const text = entries.map(formatLine).join("\n") + "\n";
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ghostpings.txt";
    a.click();
    URL.revokeObjectURL(a.href);
}

function AboutComponent() {
    return (
        <>
            <Paragraph className={Margins.bottom8}>
                {entries.length} ghost ping{entries.length === 1 ? "" : "s"} logged.
                {!IS_WEB && " Every ping is also appended to ghostpings.txt in your SnoreClient settings folder."}
            </Paragraph>
            <Flex gap="8px">
                <Button size="small" onClick={exportTxt}>Download as .txt</Button>
                {!IS_WEB && <Button size="small" variant="secondary" onClick={() => Native?.openLog()}>Show log file</Button>}
                <Button size="small" variant="dangerSecondary" onClick={async () => { entries = []; await DataStore.set(STORE_KEY, entries); }}>Clear in app log</Button>
            </Flex>
        </>
    );
}

export default definePlugin({
    name: "GhostPingLog",
    description: "Logs everyone who ghost pings you (pings you then deletes or edits the message) and saves the log to a .txt file.",
    authors: [SnoreClientDevs.founder],
    settings,
    settingsAboutComponent: AboutComponent,

    flux: {
        MESSAGE_DELETE({ id, channelId }: { id: string; channelId: string; }) {
            const message = MessageStore.getMessage(channelId, id);
            if (!message?.author) return;
            if (message.author.id === UserStore.getCurrentUser()?.id) return;
            if (settings.store.ignoreBots && message.author.bot) return;
            if (!mentionsMe(message)) return;
            record(message, "deleted");
        },

        MESSAGE_UPDATE({ message }: { message: Message; }) {
            if (!message?.id || !message.channel_id) return;
            const old = MessageStore.getMessage(message.channel_id, message.id);
            if (!old?.author || old.author.id === UserStore.getCurrentUser()?.id) return;
            if (settings.store.ignoreBots && old.author.bot) return;
            if (!mentionsMe(old)) return;
            const me = UserStore.getCurrentUser().id;
            const stillPings = (message.mentions as any[] | undefined)?.some(m => (typeof m === "string" ? m : m?.id) === me)
                || (settings.store.includeEveryone && (message as any).mention_everyone);
            if (!stillPings) record(old, "edited");
        },
    },

    async start() {
        entries = await DataStore.get<Entry[]>(STORE_KEY) ?? [];
    },
});
