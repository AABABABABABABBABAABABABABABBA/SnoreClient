/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { SnoreClientDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const CustomStatus = getUserSettingLazy<any>("status", "customStatus")!;

const settings = definePluginSettings({
    frames: {
        type: OptionType.STRING,
        description: "One status per line. Optional emoji first, separated by a pipe:  😴 | sleeping on SnoreClient",
        default: "😴 | sleeping on SnoreClient\n🌙 | snore.pw\n✨ | plugins for days",
        multiline: true,
    },
    interval: {
        type: OptionType.SLIDER,
        description: "Seconds between frames. Discord rate limits status changes, so 30 seconds is the minimum.",
        markers: [30, 60, 120, 300, 600],
        default: 60,
        stickToMarkers: false,
    },
    restoreOnStop: {
        type: OptionType.BOOLEAN,
        description: "Put your previous custom status back when the plugin is disabled.",
        default: true,
    },
});

let timer: ReturnType<typeof setInterval> | undefined;
let index = 0;
let saved: any = null;

function parseFrames() {
    return settings.store.frames.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
        const [a, b] = line.split("|").map(s => s.trim());
        if (b === undefined) return { text: a, emoji: "" };
        return { text: b, emoji: a };
    });
}

function applyFrame() {
    const frames = parseFrames();
    if (!frames.length) return;
    const frame = frames[index++ % frames.length];
    CustomStatus.updateSetting({
        text: frame.text,
        emojiId: "0",
        emojiName: frame.emoji,
        expiresAtMs: "0",
    });
}

function schedule() {
    clearInterval(timer);
    timer = setInterval(applyFrame, Math.max(30, settings.store.interval) * 1000);
}

export default definePlugin({
    name: "AnimatedStatus",
    description: "Cycles your custom status through a list of frames, like an animated status.",
    authors: [SnoreClientDevs.founder],
    settings,

    start() {
        saved = CustomStatus.getSetting();
        index = 0;
        applyFrame();
        schedule();
    },

    stop() {
        clearInterval(timer);
        if (settings.store.restoreOnStop) CustomStatus.updateSetting(saved ?? null);
    },
});
