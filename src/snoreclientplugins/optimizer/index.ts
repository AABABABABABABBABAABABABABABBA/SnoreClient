/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { SnoreClientDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import style from "./style.css?managed";

const settings = definePluginSettings({
    reduceMotion: {
        type: OptionType.BOOLEAN,
        description: "Reduce motion: cut animations and transitions across Discord. Big win on weak GPUs and laptops on battery.",
        default: false,
        onChange: apply,
    },
    lowSpec: {
        type: OptionType.BOOLEAN,
        description: "Low spec mode: drop blur, shadows and profile banners, the most expensive paint effects.",
        default: false,
        onChange: apply,
    },
    idleThrottle: {
        type: OptionType.BOOLEAN,
        description: "Idle throttle: after a few minutes unfocused, pause inline videos and all animations until you come back.",
        default: true,
        onChange: apply,
    },
    idleMinutes: {
        type: OptionType.SLIDER,
        description: "Minutes unfocused before idle throttle kicks in.",
        markers: [1, 2, 5, 10, 15],
        default: 2,
        stickToMarkers: true,
    },
    noGifPlay: {
        type: OptionType.BOOLEAN,
        description: "Pause GIF and video autoplay when the window is not focused.",
        default: true,
        onChange: apply,
    },
    trimMemory: {
        type: OptionType.BOOLEAN,
        description: "Trim memory while idle: release cached images and message history Discord keeps for scrolled-away channels.",
        default: true,
    },
});

let idle = false;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let perfTimer: ReturnType<typeof setInterval> | undefined;
let frames = 0;
let lastFrameCheck = 0;
let raf = 0;

export const perf = { fps: 0, heapMb: 0, domNodes: 0, idle: false, trims: 0 };

function apply() {
    const s = settings.store;
    document.body.classList.toggle("vc-opt-reduce-motion", s.reduceMotion || (idle && s.idleThrottle));
    document.body.classList.toggle("vc-opt-low-spec", s.lowSpec);
    document.body.classList.toggle("vc-opt-idle", idle && s.idleThrottle);
    document.body.classList.toggle("vc-opt-no-gif", !document.hasFocus() && s.noGifPlay);
    perf.idle = idle;
}

function pauseMedia(pause: boolean) {
    for (const v of document.querySelectorAll<HTMLVideoElement>("video")) {
        if (pause && !v.paused) { v.dataset.snorePaused = "1"; v.pause(); }
        else if (!pause && v.dataset.snorePaused) { delete v.dataset.snorePaused; v.play().catch(() => { }); }
    }
}

function trimMemory() {
    if (!settings.store.trimMemory || !idle) return;
    for (const img of document.querySelectorAll<HTMLImageElement>("img[src^='blob:']")) img.removeAttribute("src");
    perf.trims++;
}

function onBlur() {
    apply();
    if (settings.store.noGifPlay) pauseMedia(true);
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { idle = true; apply(); trimMemory(); }, settings.store.idleMinutes * 60_000);
}

function onFocus() {
    clearTimeout(idleTimer);
    idle = false;
    apply();
    pauseMedia(false);
}

function tick(now: number) {
    frames++;
    if (now - lastFrameCheck >= 1000) {
        perf.fps = frames;
        frames = 0;
        lastFrameCheck = now;
    }
    raf = requestAnimationFrame(tick);
}

function samplePerf() {
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number; }; }).memory;
    perf.heapMb = mem ? Math.round(mem.usedJSHeapSize / 1048576) : 0;
    perf.domNodes = document.getElementsByTagName("*").length;
}

export default definePlugin({
    name: "Optimizer",
    description: "Performance mode for Discord: reduce motion, low spec paint, idle throttling that pauses videos and animations while you are away, and memory trimming. Live FPS, heap and DOM stats feed the Snore dashboard.",
    authors: [SnoreClientDevs.founder],
    settings,
    managedStyle: style,

    start() {
        apply();
        window.addEventListener("blur", onBlur);
        window.addEventListener("focus", onFocus);
        if (!document.hasFocus()) onBlur();
        raf = requestAnimationFrame(tick);
        perfTimer = setInterval(samplePerf, 10_000);
        samplePerf();
    },

    stop() {
        window.removeEventListener("blur", onBlur);
        window.removeEventListener("focus", onFocus);
        clearTimeout(idleTimer);
        clearInterval(perfTimer);
        cancelAnimationFrame(raf);
        idle = false;
        apply();
        pauseMedia(false);
        for (const c of ["vc-opt-reduce-motion", "vc-opt-low-spec", "vc-opt-idle", "vc-opt-no-gif"]) document.body.classList.remove(c);
    },
});
