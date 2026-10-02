/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { SnoreClientDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { StreamerModeStore } from "@webpack/common";

import style from "./style.css?managed";

const settings = definePluginSettings({
    revealOnHover: {
        type: OptionType.BOOLEAN,
        description: "Show the device names while hovering over them.",
        default: true,
        onChange: () => apply(),
    },
    always: {
        type: OptionType.BOOLEAN,
        description: "Blur device names even when streamer mode is off.",
        default: false,
        onChange: () => apply(),
    },
});

function apply() {
    const blur = settings.store.always || StreamerModeStore.enabled;
    if (blur) enableStyle(style);
    else disableStyle(style);
    document.body.classList.toggle("vc-smd-no-hover", !settings.store.revealOnHover);
}

export default definePlugin({
    name: "StreamerModeDevices",
    description: "Blurs your microphone, speaker and camera names in Voice & Video settings while streamer mode is on, so viewers can't see your hardware.",
    authors: [SnoreClientDevs.founder],
    enabledByDefault: true,
    settings,

    flux: {
        STREAMER_MODE_UPDATE: apply,
    },

    start: apply,

    stop() {
        disableStyle(style);
        document.body.classList.remove("vc-smd-no-hover");
    },
});
