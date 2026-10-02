/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { SnoreClientDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { MessageStore, UserStore } from "@webpack/common";

interface Sniped {
    author: string;
    authorId: string;
    content: string;
    at: number;
    before?: string;
}

const deleted = new Map<string, Sniped[]>();
const edited = new Map<string, Sniped[]>();
const KEEP = 10;

function push(map: Map<string, Sniped[]>, channelId: string, entry: Sniped) {
    const list = map.get(channelId) ?? [];
    list.unshift(entry);
    if (list.length > KEEP) list.length = KEEP;
    map.set(channelId, list);
}

function describe(kind: "deleted" | "edited", entry: Sniped | undefined, n: number) {
    if (!entry) return `Nothing ${kind} here yet (I only remember what happened while Discord was open).`;
    const when = new Date(entry.at).toLocaleTimeString();
    return kind === "deleted"
        ? `**${entry.author}** deleted at ${when} (#${n}):\n>>> ${entry.content || "(no text)"}`
        : `**${entry.author}** edited at ${when} (#${n}):\n**Before:** ${entry.before}\n**After:** ${entry.content}`;
}

const indexOption = {
    name: "index",
    description: "1 is the most recent, 2 the one before, up to 10",
    type: ApplicationCommandOptionType.INTEGER,
    required: false,
};

export default definePlugin({
    name: "Snipe",
    description: "Adds /snipe and /editsnipe to show the last deleted or edited messages in a channel, only visible to you.",
    authors: [SnoreClientDevs.founder],
    dependencies: ["CommandsAPI"],

    flux: {
        MESSAGE_DELETE({ id, channelId }: { id: string; channelId: string; }) {
            const m = MessageStore.getMessage(channelId, id);
            if (!m?.author || m.author.id === UserStore.getCurrentUser()?.id) return;
            push(deleted, channelId, { author: m.author.username, authorId: m.author.id, content: m.content, at: Date.now() });
        },
        MESSAGE_UPDATE({ message }: { message: Message; }) {
            if (!message?.id) return;
            const old = MessageStore.getMessage(message.channel_id, message.id);
            if (!old?.author || old.author.id === UserStore.getCurrentUser()?.id) return;
            if (old.content === message.content || message.content === undefined) return;
            push(edited, message.channel_id, { author: old.author.username, authorId: old.author.id, content: message.content, before: old.content, at: Date.now() });
        },
    },

    commands: [
        {
            name: "snipe",
            description: "Show the last deleted message in this channel",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [indexOption],
            execute(opts, ctx) {
                const n = Math.max(1, findOption(opts, "index", 1));
                sendBotMessage(ctx.channel.id, { content: describe("deleted", deleted.get(ctx.channel.id)?.[n - 1], n) });
            },
        },
        {
            name: "editsnipe",
            description: "Show the last edited message in this channel",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [indexOption],
            execute(opts, ctx) {
                const n = Math.max(1, findOption(opts, "index", 1));
                sendBotMessage(ctx.channel.id, { content: describe("edited", edited.get(ctx.channel.id)?.[n - 1], n) });
            },
        },
    ],
});
