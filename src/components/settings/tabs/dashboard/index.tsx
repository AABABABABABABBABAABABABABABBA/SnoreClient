/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { isPluginEnabled, startPlugin, stopPlugin } from "@api/PluginManager";
import { Settings, useSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Switch } from "@components/Switch";
import { gitHashShort } from "@shared/vencordUserAgent";
import { Margins } from "@utils/margins";
import { relaunch } from "@utils/native";
import { useForceUpdater } from "@utils/react";
import { isOutdated } from "@utils/updater";
import { ChannelStore, GuildStore, RelationshipStore, SettingsRouter, useEffect, UserStore, useState } from "@webpack/common";

import Plugins from "~plugins";

const SESSION_START = Date.now();

const QUICK_TOGGLES = [
    ["AwayReply", "Answer DMs while I'm away"],
    ["VcFarm", "Sit in voice 24/7"],
    ["GhostPingLog", "Log ghost pings"],
    ["AutoRespond", "GIF auto responses"],
    ["StreamerModeDevices", "Hide my devices in streamer mode"],
    ["Status3D", "3D status orbs"],
    ["DebugConsole", "Debug console"],
] as const;

function uptime() {
    const s = Math.floor((Date.now() - SESSION_START) / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
}

function Tile({ value, label }: { value: string | number; label: string; }) {
    return (
        <div className="vc-dash-tile">
            <span className="vc-dash-value">{value}</span>
            <span className="vc-dash-label">{label}</span>
        </div>
    );
}

function Row({ on, warn, title, subtitle, action, actionLabel }: { on: boolean; warn?: boolean; title: string; subtitle: string; action?: () => void; actionLabel?: string; }) {
    return (
        <div className="vc-dash-row">
            <span className={`vc-dash-dot${warn ? " vc-dash-dot-warn" : on ? "" : " vc-dash-dot-off"}`} />
            <div className="vc-dash-row-text">
                <BaseText size="sm" weight="semibold">{title}</BaseText>
                <BaseText size="xs" color="text-muted">{subtitle}</BaseText>
            </div>
            {action && <Button size="small" variant="secondary" onClick={action}>{actionLabel}</Button>}
        </div>
    );
}

function DashboardTab() {
    const settings = useSettings(["cloud.authenticated", "cloud.url", "autoUpdate", "updateChannel", "plugins.*"]);
    const forceUpdate = useForceUpdater();
    const [, tick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => tick(n => n + 1), 1000);
        return () => clearInterval(t);
    }, []);

    const me = UserStore.getCurrentUser();
    const enabledPlugins = Object.keys(Plugins).filter(isPluginEnabled);
    const dmCount = ChannelStore.getSortedPrivateChannels().length;

    function togglePlugin(name: string, enable: boolean) {
        const plugin = Plugins[name];
        if (!plugin) return;
        const pluginSettings = Settings.plugins[name] ??= { enabled: false };
        if (enable) {
            pluginSettings.enabled = true;
            if (!plugin.patches?.length) startPlugin(plugin);
        } else {
            pluginSettings.enabled = false;
            if (!plugin.patches?.length) stopPlugin(plugin);
        }
        forceUpdate();
    }

    return (
        <SettingsTab>
            <Heading className={Margins.top16}>Dashboard</Heading>
            <Paragraph className={Margins.bottom16}>
                Everything about your SnoreClient at a glance, with one click switches for the features you use most.
            </Paragraph>

            <div className="vc-dash-grid">
                <Tile value={RelationshipStore.getFriendIDs().length} label="Friends" />
                <Tile value={GuildStore.getGuildCount()} label="Servers" />
                <Tile value={dmCount} label="Open DMs" />
                <Tile value={`${enabledPlugins.length} / ${Object.keys(Plugins).length}`} label="Plugins on" />
                <Tile value={uptime()} label="Session uptime" />
                <Tile value={gitHashShort} label={`Build v${VERSION}`} />
            </div>

            <Heading>Status</Heading>
            <div className={`vc-dash-rows ${Margins.top8}`}>
                <Row
                    on={settings.cloud.authenticated}
                    title={settings.cloud.authenticated ? "Cloud connected" : "Cloud off"}
                    subtitle={settings.cloud.authenticated ? `Syncing to ${new URL(settings.cloud.url).host} as ${me?.username}` : "Settings only live on this device"}
                    action={() => SettingsRouter.openUserSettings("snoreclient_cloud_panel")}
                    actionLabel="Open"
                />
                <Row
                    on={!isOutdated}
                    warn={isOutdated}
                    title={isOutdated ? "Update downloaded" : "Up to date"}
                    subtitle={isOutdated ? "Restart to apply the new build" : `${settings.updateChannel === "dev" ? "Dev" : "Stable"} channel, auto update ${settings.autoUpdate ? "on" : "off"}`}
                    action={isOutdated ? relaunch : () => SettingsRouter.openUserSettings("snoreclient_updater_panel")}
                    actionLabel={isOutdated ? "Restart" : "Open"}
                />
            </div>

            <Heading>Quick switches</Heading>
            <div className={`vc-dash-rows ${Margins.top8}`}>
                {QUICK_TOGGLES.filter(([name]) => Plugins[name]).map(([name, label]) => (
                    <div className="vc-dash-row" key={name}>
                        <div className="vc-dash-row-text">
                            <BaseText size="sm" weight="semibold">{label}</BaseText>
                            <BaseText size="xs" color="text-muted">{Plugins[name].description}</BaseText>
                        </div>
                        <Switch checked={isPluginEnabled(name)} onChange={v => togglePlugin(name, v)} />
                    </div>
                ))}
            </div>
        </SettingsTab>
    );
}

export default wrapTab(DashboardTab, "Dashboard");
