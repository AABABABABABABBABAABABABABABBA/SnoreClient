/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SnoreClientDevs } from "@utils/constants";
import definePlugin from "@utils/types";

import style from "./style.css?managed";

const STATUSES: Record<string, [light: string, base: string, dark: string]> = {
    online: ["#7be0a0", "#45a366", "#1f6b3c"],
    idle: ["#ffd37a", "#f0b232", "#9c6a0d"],
    dnd: ["#ff8a8d", "#f23f43", "#9b1c1f"],
    offline: ["#b8bcc4", "#80848e", "#4a4d55"],
    streaming: ["#a988d6", "#593695", "#2e1a52"],
};

const DEFS_ID = "vc-status-3d-defs";

function gradient(name: string, [light, base, dark]: [string, string, string]) {
    return `<radialGradient id="vc-status-3d-${name}" cx="35%" cy="30%" r="75%">` +
        `<stop offset="0" stop-color="${light}"/>` +
        `<stop offset="0.45" stop-color="${base}"/>` +
        `<stop offset="1" stop-color="${dark}"/>` +
        "</radialGradient>";
}

export default definePlugin({
    name: "Status3D",
    description: "Turns the flat status dots into glossy 3D orbs.",
    authors: [SnoreClientDevs.founder],
    enabledByDefault: true,
    managedStyle: style,

    start() {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.id = DEFS_ID;
        svg.setAttribute("width", "0");
        svg.setAttribute("height", "0");
        svg.style.position = "absolute";
        svg.innerHTML = "<defs>" + Object.entries(STATUSES).map(([n, c]) => gradient(n, c)).join("") + "</defs>";
        document.body.appendChild(svg);
    },

    stop() {
        document.getElementById(DEFS_ID)?.remove();
    },
});
