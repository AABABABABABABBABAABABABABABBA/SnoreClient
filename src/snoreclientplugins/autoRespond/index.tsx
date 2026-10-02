/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { SnoreClientDevs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Message, User } from "@vencord/discord-types";
import { Menu, React, RestAPI, UserSettingsActionCreators, UserStore } from "@webpack/common";

const logger = new Logger("AutoRespond");
const STORE_KEY = "AutoRespond_users";

const settings = definePluginSettings({
    cooldown: {
        type: OptionType.SLIDER,
        description: "Seconds to wait before replying to the same person again.",
        markers: [5, 15, 30, 60, 120],
        default: 15,
        stickToMarkers: false,
    },
    reply: {
        type: OptionType.BOOLEAN,
        description: "Send the GIF as a reply to their message instead of a plain message.",
        default: true,
    },
    source: {
        type: OptionType.SELECT,
        description: "Where the GIFs come from.",
        options: [
            { label: "My favorited GIFs that match their message, trending as fallback", value: "favorites-match", default: true },
            { label: "Only my favorited GIFs (random)", value: "favorites" },
            { label: "Tenor search for their message", value: "search" },
        ],
    },
    useAi: {
        type: OptionType.BOOLEAN,
        description: "Ask a free AI (pollinations.ai, no account) to pick the GIF search term from their message. Falls back to keywords when it is unavailable.",
        default: true,
    },
});

let enabledUsers = new Set<string>();
const lastReply = new Map<string, number>();

async function saveUsers() {
    await DataStore.set(STORE_KEY, [...enabledUsers]);
}

const STOP_WORDS = new Set(["the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "to", "of", "in", "on", "it", "i", "you", "he", "she", "we", "they", "me", "my", "your", "this", "that", "so", "just", "be", "do", "for", "with", "at", "lol", "lmao", "u", "ur", "im", "its"]);

function keywordTerm(text: string) {
    const words = text.toLowerCase().replace(/<[^>]+>|https?:\S+|[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w && !STOP_WORDS.has(w));
    return words.slice(0, 3).join(" ") || "reaction";
}

async function aiTerm(text: string) {
    const prompt = `Reply with only 1 to 3 words: the best GIF search term to react to this Discord message. No punctuation, no quotes. Message: "${text.slice(0, 300)}"`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
        const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const term = (await res.text()).replace(/["'.!?\n]/g, " ").trim().split(/\s+/).slice(0, 3).join(" ");
        return term || null;
    } catch (e) {
        logger.warn("AI term failed, using keywords", e);
        return null;
    } finally {
        clearTimeout(timer);
    }
}

interface FavoriteGif {
    url: string;
    src?: string;
    format?: number;
    width?: number;
    height?: number;
    order?: number;
}

function favoriteGifs(): FavoriteGif[] {
    try {
        const frecency = UserSettingsActionCreators.FrecencyUserSettingsActionCreators.getCurrentValue();
        const gifs = frecency?.favoriteGifs?.gifs ?? {};
        return Object.entries(gifs).map(([url, g]: [string, any]) => ({ url, ...g }));
    } catch {
        return [];
    }
}

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

/** Match a search term against the words in a favorite's URL (tenor slugs carry the gif's title). */
function matchingFavorites(term: string, favs: FavoriteGif[]) {
    const words = term.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (!words.length) return [];
    return favs.filter(g => {
        const hay = `${g.url} ${g.src ?? ""}`.toLowerCase().replace(/[^a-z0-9]+/g, " ");
        return words.some(w => hay.includes(w));
    });
}

async function findGif(term: string): Promise<string | null> {
    const { source } = settings.store;
    if (source !== "search") {
        const favs = favoriteGifs();
        if (favs.length) {
            if (source === "favorites") return pick(favs).url;
            const matched = matchingFavorites(term, favs);
            if (matched.length) return pick(matched).url;
        }
        if (source === "favorites") return null;
    }
    return searchGif(term);
}

async function searchGif(term: string): Promise<string | null> {
    const search = await RestAPI.get({
        url: "/gifs/search",
        query: { q: term, media_format: "gif", provider: "tenor", limit: 20 },
    }).catch(() => null);
    let gifs: any[] = search?.body ?? [];

    if (!gifs.length) {
        const trending = await RestAPI.get({
            url: "/gifs/trending",
            query: { media_format: "gif", provider: "tenor" },
        }).catch(() => null);
        gifs = trending?.body?.gifs ?? [];
    }

    const top = gifs.slice(0, 10);
    const pick = top[Math.floor(Math.random() * top.length)];
    return pick?.url ?? pick?.src ?? null;
}

async function respond(message: Message) {
    const now = Date.now();
    if (now - (lastReply.get(message.author.id) ?? 0) < settings.store.cooldown * 1000) return;
    lastReply.set(message.author.id, now);

    const text = message.content?.trim() || "hello";
    const term = (settings.store.useAi ? await aiTerm(text) : null) ?? keywordTerm(text);
    const gif = await findGif(term);
    if (!gif) return;

    logger.info(`Replying to ${message.author.username} with "${term}"`);
    await sendMessage(
        message.channel_id,
        { content: gif },
        true,
        settings.store.reply
            ? {
                messageReference: { channel_id: message.channel_id, message_id: message.id, guild_id: (message as any).guild_id },
                allowedMentions: { parse: [], replied_user: false },
            }
            : {},
    );
}

const userContextMenu: NavContextMenuPatchCallback = (children, { user }: { user?: User; }) => {
    if (!user?.id || user.id === UserStore.getCurrentUser()?.id) return;
    const [checked, setChecked] = React.useState(enabledUsers.has(user.id));

    children.push(
        <Menu.MenuCheckboxItem
            id="vc-auto-respond"
            label="Auto Respond"
            checked={checked}
            action={() => {
                if (enabledUsers.has(user.id)) enabledUsers.delete(user.id);
                else enabledUsers.add(user.id);
                setChecked(enabledUsers.has(user.id));
                saveUsers();
            }}
        />
    );
};

export default definePlugin({
    name: "AutoRespond",
    description: "Tick Auto Respond on someone's right click menu and every message they send gets a trending GIF reply that matches what they said.",
    authors: [SnoreClientDevs.founder],
    dependencies: ["ContextMenuAPI"],
    settings,
    contextMenus: {
        "user-context": userContextMenu,
    },

    flux: {
        MESSAGE_CREATE({ optimistic, type, message }: { optimistic: boolean; type: string; message: Message; }) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (!message?.author || message.author.bot) return;
            if (!enabledUsers.has(message.author.id)) return;
            if (message.author.id === UserStore.getCurrentUser()?.id) return;
            respond(message).catch(e => logger.error("Failed to respond", e));
        },
    },

    async start() {
        enabledUsers = new Set(await DataStore.get<string[]>(STORE_KEY) ?? []);
    },
});
