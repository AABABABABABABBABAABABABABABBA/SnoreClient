/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { SnoreClientDevs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, PresenceStore, UserStore } from "@webpack/common";

const settings = definePluginSettings({
    message: {
        type: OptionType.STRING,
        description: "What to reply with while you are away.",
        default: "I'm away right now, I'll get back to you later.",
    },
    when: {
        type: OptionType.SELECT,
        description: "When to send the away reply.",
        options: [
            { label: "Only while my status is Idle or Do Not Disturb", value: "status", default: true },
            { label: "Always while this plugin is enabled", value: "always" },
        ],
    },
    dms: {
        type: OptionType.BOOLEAN,
        description: "Reply to direct messages.",
        default: true,
    },
    mentions: {
        type: OptionType.BOOLEAN,
        description: "Reply when someone pings you in a server.",
        default: false,
    },
    cooldown: {
        type: OptionType.SLIDER,
        description: "Minutes before replying to the same person again.",
        markers: [1, 5, 15, 30, 60, 180],
        default: 15,
        stickToMarkers: false,
    },
});

const lastReply = new Map<string, number>();

function isAway() {
    if (settings.store.when === "always") return true;
    const me = UserStore.getCurrentUser();
    const status = PresenceStore.getStatus(me.id);
    return status === "idle" || status === "dnd";
}

export default definePlugin({
    name: "AwayReply",
    description: "Automatically answers DMs and pings with an away message while you are idle or on Do Not Disturb.",
    authors: [SnoreClientDevs.founder],
    settings,

    flux: {
        MESSAGE_CREATE({ optimistic, type, message }: { optimistic: boolean; type: string; message: Message; }) {
            if (optimistic || type !== "MESSAGE_CREATE" || !message?.author || message.author.bot) return;
            const me = UserStore.getCurrentUser();
            if (!me || message.author.id === me.id || !isAway()) return;

            const channel = ChannelStore.getChannel(message.channel_id);
            if (!channel) return;
            const isDm = channel.isDM() || channel.isGroupDM();
            const pinged = message.mentions?.includes(me.id);
            if (!(isDm && settings.store.dms) && !(pinged && settings.store.mentions)) return;

            const now = Date.now();
            if (now - (lastReply.get(message.author.id) ?? 0) < settings.store.cooldown * 60_000) return;
            lastReply.set(message.author.id, now);

            sendMessage(message.channel_id, { content: settings.store.message }, true, {
                messageReference: { channel_id: message.channel_id, message_id: message.id, guild_id: channel.guild_id },
                allowedMentions: { parse: [], replied_user: !isDm },
            });
        },
    },
});
