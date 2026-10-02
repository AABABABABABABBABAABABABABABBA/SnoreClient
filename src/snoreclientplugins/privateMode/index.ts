/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { SnoreClientDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { showToast } from "@webpack/common";

import style from "./style.css?managed";

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Private mode on. Ctrl+Shift+P toggles it from anywhere.",
        default: false,
        onChange: apply,
    },
    blurMessages: {
        type: OptionType.BOOLEAN,
        description: "Also blur message text, embeds and images.",
        default: true,
        onChange: apply,
    },
    revealOnHover: {
        type: OptionType.BOOLEAN,
        description: "Un-blur whatever is under the mouse.",
        default: true,
        onChange: apply,
    },
});

function apply() {
    const on = settings.store.enabled;
    document.body.classList.toggle("vc-private-mode", on);
    document.body.classList.toggle("vc-private-mode-messages", on && settings.store.blurMessages);
    document.body.classList.toggle("vc-private-mode-no-hover", on && !settings.store.revealOnHover);
}

function onKey(e: KeyboardEvent) {
    if (e.ctrlKey && e.shiftKey && e.code === "KeyP") {
        settings.store.enabled = !settings.store.enabled;
        showToast(`Private mode ${settings.store.enabled ? "on" : "off"}`);
        e.preventDefault();
    }
}

export default definePlugin({
    name: "PrivateMode",
    description: "One hotkey blurs names, avatars, servers, DMs and optionally messages so you can share your screen or take screenshots safely. Ctrl+Shift+P.",
    authors: [SnoreClientDevs.founder],
    settings,
    managedStyle: style,

    start() {
        apply();
        document.addEventListener("keydown", onKey);
    },

    stop() {
        document.removeEventListener("keydown", onKey);
        document.body.classList.remove("vc-private-mode", "vc-private-mode-messages", "vc-private-mode-no-hover");
    },
});
