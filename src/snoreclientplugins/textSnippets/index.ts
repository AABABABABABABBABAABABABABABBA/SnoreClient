/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { SnoreClientDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const DEFAULT_SNIPPETS = [
    ";shrug = ¯\\_(ツ)_/¯",
    ";flip = (╯°□°)╯︵ ┻━┻",
    ";unflip = ┬─┬ノ( º _ ºノ)",
    ";lenny = ( ͡° ͜ʖ ͡°)",
    ";gh = https://github.com/aababababababbabaabababababba/SnoreClient",
].join("\n");

const settings = definePluginSettings({
    snippets: {
        type: OptionType.STRING,
        description: "One per line as  trigger = replacement . Triggers are replaced anywhere in your message before it is sent.",
        default: DEFAULT_SNIPPETS,
        multiline: true,
    },
    wholeWord: {
        type: OptionType.BOOLEAN,
        description: "Only replace a trigger when it stands on its own (surrounded by spaces or line edges).",
        default: true,
    },
});

function parse(): [string, string][] {
    return settings.store.snippets.split("\n").map(line => {
        const i = line.indexOf("=");
        if (i === -1) return null;
        const trigger = line.slice(0, i).trim();
        const replacement = line.slice(i + 1).trim();
        return trigger ? [trigger, replacement] as [string, string] : null;
    }).filter((x): x is [string, string] => x !== null);
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function expand(content: string) {
    let out = content;
    for (const [trigger, replacement] of parse()) {
        const re = settings.store.wholeWord
            ? new RegExp(`(^|\\s)${escapeRegex(trigger)}(?=\\s|$)`, "g")
            : new RegExp(escapeRegex(trigger), "g");
        out = out.replace(re, (m, lead = "") => (settings.store.wholeWord ? lead : "") + replacement.replace(/\$/g, "$$$$"));
    }
    return out;
}

export default definePlugin({
    name: "TextSnippets",
    description: "Text expander for the chat box. Type ;shrug and it becomes ¯\\_(ツ)_/¯ when you send. Add your own shortcuts in settings.",
    authors: [SnoreClientDevs.founder],
    dependencies: ["MessageEventsAPI"],
    settings,

    onBeforeMessageSend(_channelId, msg) {
        if (!msg.content) return;
        const expanded = expand(msg.content);
        if (expanded !== msg.content) msg.content = expanded;
    },

    onBeforeMessageEdit(_channelId, _messageId, msg) {
        if (!msg.content) return;
        const expanded = expand(msg.content);
        if (expanded !== msg.content) msg.content = expanded;
    },
});
