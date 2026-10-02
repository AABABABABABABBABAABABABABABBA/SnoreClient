/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { showNotification } from "@api/Notifications";
import { SnoreClientDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, Menu, NavigationRouter } from "@webpack/common";

interface Reminder {
    id: string;
    at: number;
    channelId: string;
    messageId: string;
    guildId: string | null;
    author: string;
    preview: string;
}

const STORE_KEY = "RemindMe_reminders";
const OPTIONS: [label: string, minutes: number][] = [
    ["In 10 minutes", 10],
    ["In 30 minutes", 30],
    ["In 1 hour", 60],
    ["In 3 hours", 180],
    ["Tomorrow", 24 * 60],
];

let reminders: Reminder[] = [];
let timer: ReturnType<typeof setInterval> | undefined;

async function save() {
    await DataStore.set(STORE_KEY, reminders);
}

function jump(r: Reminder) {
    NavigationRouter.transitionTo(`/channels/${r.guildId ?? "@me"}/${r.channelId}/${r.messageId}`);
}

function fire(r: Reminder) {
    showNotification({
        title: `Reminder: message from ${r.author}`,
        body: r.preview || "Click to jump to the message.",
        permanent: true,
        onClick: () => jump(r),
    });
}

function tick() {
    const now = Date.now();
    const due = reminders.filter(r => r.at <= now);
    if (!due.length) return;
    reminders = reminders.filter(r => r.at > now);
    save();
    due.forEach(fire);
}

const messageContextMenu: NavContextMenuPatchCallback = (children, { message }: { message?: Message; }) => {
    if (!message?.id) return;
    const channel = ChannelStore.getChannel(message.channel_id);

    children.push(
        <Menu.MenuItem id="vc-remind-me" label="Remind me">
            {OPTIONS.map(([label, minutes]) => (
                <Menu.MenuItem
                    key={label}
                    id={`vc-remind-me-${minutes}`}
                    label={label}
                    action={() => {
                        reminders.push({
                            id: `${message.id}-${Date.now()}`,
                            at: Date.now() + minutes * 60_000,
                            channelId: message.channel_id,
                            messageId: message.id,
                            guildId: channel?.guild_id ?? null,
                            author: message.author.username,
                            preview: (message.content || "").slice(0, 140),
                        });
                        save();
                        showNotification({ title: "Reminder set", body: `I'll remind you ${label.toLowerCase()}.`, noPersist: true });
                    }}
                />
            ))}
        </Menu.MenuItem>
    );
};

export default definePlugin({
    name: "RemindMe",
    description: "Right click a message and pick Remind me to get a notification later that jumps straight back to it.",
    authors: [SnoreClientDevs.founder],
    dependencies: ["ContextMenuAPI"],
    contextMenus: {
        message: messageContextMenu,
    },

    async start() {
        reminders = await DataStore.get<Reminder[]>(STORE_KEY) ?? [];
        timer = setInterval(tick, 30_000);
        tick();
    },

    stop() {
        clearInterval(timer);
    },
});
