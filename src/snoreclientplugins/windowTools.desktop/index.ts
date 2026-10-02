/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { SnoreClientDevs } from "@utils/constants";
import definePlugin, { OptionType, PluginNative } from "@utils/types";

const Native = VencordNative.pluginHelpers.WindowTools as PluginNative<typeof import("./native")>;

const settings = definePluginSettings({
    alwaysOnTop: {
        type: OptionType.BOOLEAN,
        description: "Keep the Discord window above every other window.",
        default: false,
        onChange: (v: boolean) => Native.setAlwaysOnTop(v),
    },
    opacity: {
        type: OptionType.SLIDER,
        description: "Window opacity. Lower it to see what is behind Discord.",
        markers: [0.4, 0.6, 0.8, 0.9, 1],
        default: 1,
        stickToMarkers: false,
        onChange: (v: number) => Native.setOpacity(v),
    },
    miniWidth: {
        type: OptionType.NUMBER,
        description: "Mini mode window width.",
        default: 420,
    },
    miniHeight: {
        type: OptionType.NUMBER,
        description: "Mini mode window height.",
        default: 640,
    },
    hotkeys: {
        type: OptionType.BOOLEAN,
        description: "Enable hotkeys: Ctrl+Shift+T always on top, Ctrl+Shift+M mini mode, Ctrl+Shift+H hide to tray.",
        default: true,
    },
});

function onKey(e: KeyboardEvent) {
    if (!settings.store.hotkeys || !e.ctrlKey || !e.shiftKey) return;
    switch (e.code) {
        case "KeyT":
            settings.store.alwaysOnTop = !settings.store.alwaysOnTop;
            break;
        case "KeyM":
            Native.toggleMini(settings.store.miniWidth, settings.store.miniHeight);
            break;
        case "KeyH":
            Native.minimizeToTray();
            break;
        default:
            return;
    }
    e.preventDefault();
}

export default definePlugin({
    name: "WindowTools",
    description: "Desktop window controls: always on top, window opacity, a compact mini mode and hide to tray, all with hotkeys.",
    authors: [SnoreClientDevs.founder],
    settings,

    start() {
        Native.setAlwaysOnTop(settings.store.alwaysOnTop);
        Native.setOpacity(settings.store.opacity);
        document.addEventListener("keydown", onKey);
    },

    stop() {
        Native.setAlwaysOnTop(false);
        Native.setOpacity(1);
        document.removeEventListener("keydown", onKey);
    },
});
