/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings, Settings, SettingsStore } from "@api/Settings";
import { SnoreClientDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher } from "@webpack/common";
import { patches } from "@webpack/patcher";

import Plugins from "~plugins";

const logger = new Logger("Debug", "#a78bfa");

const NOISY_EVENTS = new Set([
    "TYPING_START", "TYPING_STOP", "PRESENCE_UPDATES", "GUILD_MEMBER_LIST_UPDATE", "VOICE_STATE_UPDATES",
    "WINDOW_FOCUS", "MOUSE_MOVE", "SPEAKING", "RTC_CONNECTION_PING", "LOCAL_ACTIVITY_UPDATE",
    "RUNNING_GAMES_CHANGE", "MESSAGE_ACK", "CHANNEL_PINS_ACK", "RTC_CONNECTION_LOSS_RATE", "GUILD_SUBSCRIPTIONS_MEMBERS_ADD",
]);

const settings = definePluginSettings({
    flux: {
        type: OptionType.BOOLEAN,
        description: "Log every Discord event (flux dispatch) with its payload. Noisy ones like typing and presence are skipped unless \"Include noisy events\" is on.",
        default: false,
    },
    noisy: {
        type: OptionType.BOOLEAN,
        description: "Include noisy events (typing, presence, voice state, pings).",
        default: false,
    },
    eventFilter: {
        type: OptionType.STRING,
        description: "Only log events whose name contains this text (leave empty for all).",
        default: "",
    },
    settingsChanges: {
        type: OptionType.BOOLEAN,
        description: "Log every SnoreClient setting change with the path and new value.",
        default: true,
    },
    errors: {
        type: OptionType.BOOLEAN,
        description: "Log uncaught errors and unhandled promise rejections with a SnoreClient tag.",
        default: true,
    },
    startupReport: {
        type: OptionType.BOOLEAN,
        description: "Print a startup report: build info, enabled plugins, and patches that did not apply.",
        default: true,
    },
});

function fluxInterceptor(event: { type: string; }) {
    if (!settings.store.flux) return false;
    if (!settings.store.noisy && NOISY_EVENTS.has(event.type)) return false;
    const filter = settings.store.eventFilter.trim().toUpperCase();
    if (filter && !event.type.includes(filter)) return false;
    console.debug(`%c SnoreClient %c flux %c ${event.type}`, "background:#a78bfa;color:black;font-weight:bold;border-radius:5px", "", "color:#a78bfa;font-weight:bold", event);
    return false;
}

function onError(e: ErrorEvent) {
    if (settings.store.errors) logger.error("Uncaught error:", e.error ?? e.message);
}

function onRejection(e: PromiseRejectionEvent) {
    if (settings.store.errors) logger.error("Unhandled rejection:", e.reason);
}

function onSettingChange(value: unknown, path: string) {
    if (settings.store.settingsChanges) logger.info(`Setting changed: ${path} =`, value);
}

function unappliedPatches() {
    return patches.filter(p => !p.all && p.predicate?.() !== false && isPluginEnabled(p.plugin));
}

function report() {
    const enabled = Object.keys(Plugins).filter(isPluginEnabled).sort();
    const pending = unappliedPatches();
    console.group("%c SnoreClient debug report ", "background:#a78bfa;color:black;font-weight:bold;border-radius:5px");
    console.log("Version:", VERSION, "Hash:", (Settings as any).gitHash ?? "unknown", "Platform:", IS_WEB ? "web" : IS_EQUIBOP ? "equibop" : IS_VESKTOP ? "vesktop" : "discord desktop", "Dev build:", IS_DEV, "Standalone:", IS_STANDALONE);
    console.log("Server:", SNORE_SERVER_URL, "Cloud:", Settings.cloud.authenticated ? Settings.cloud.url : "off");
    console.log(`Enabled plugins (${enabled.length}):`, enabled.join(", "));
    if (pending.length) {
        console.warn(`${pending.length} patches have not applied yet (may be lazy loaded modules):`);
        console.table(pending.map(p => ({ plugin: p.plugin, find: String(p.find).slice(0, 80) })));
    } else {
        console.log("All patches applied.");
    }
    console.groupEnd();
}

const api = {
    report,
    patches: () => patches.map(p => ({ plugin: p.plugin, find: p.find, applied: !unappliedPatches().includes(p) })),
    plugins: () => Object.keys(Plugins).map(name => ({ name, enabled: isPluginEnabled(name) })),
    settings: () => JSON.parse(JSON.stringify(Settings)),
    flux(on = true) {
        settings.store.flux = on;
        logger.info(`Flux event logging ${on ? "on" : "off"}`);
    },
};

export default definePlugin({
    name: "DebugConsole",
    description: "Debugs SnoreClient in the DevTools console: startup report, every setting change, uncaught errors, and optionally every Discord event. Adds window.SnoreDebug with report(), patches(), plugins(), settings() and flux().",
    authors: [SnoreClientDevs.founder],
    settings,

    start() {
        (window as any).SnoreDebug = api;
        FluxDispatcher._interceptors ??= [];
        FluxDispatcher._interceptors.push(fluxInterceptor);
        window.addEventListener("error", onError);
        window.addEventListener("unhandledrejection", onRejection);
        SettingsStore.addGlobalChangeListener(onSettingChange);
        if (settings.store.startupReport) setTimeout(report, 5000);
        logger.info("Debug console ready. Open DevTools with Ctrl+Shift+I and type SnoreDebug.report()");
    },

    stop() {
        delete (window as any).SnoreDebug;
        const i = FluxDispatcher._interceptors?.indexOf(fluxInterceptor) ?? -1;
        if (i !== -1) FluxDispatcher._interceptors.splice(i, 1);
        window.removeEventListener("error", onError);
        window.removeEventListener("unhandledrejection", onRejection);
        SettingsStore.removeGlobalChangeListener(onSettingChange);
    },
});
