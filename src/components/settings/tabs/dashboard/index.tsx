/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { deleteNotification, openNotificationLogModal, useLogs } from "@api/Notifications/notificationLog";
import { isPluginEnabled, startPlugin, stopPlugin } from "@api/PluginManager";
import { Settings, useSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import { Heading } from "@components/Heading";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Switch } from "@components/Switch";
import { gitHashShort } from "@shared/vencordUserAgent";
import { usePresence } from "@snoreclientplugins/cloudPresence";
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
    ["Notifier", "Notify me about everything"],
    ["DebugConsole", "Debug console"],
] as const;

const NITRO = ["Inactive", "Nitro Classic", "Nitro", "Nitro Basic"];

function pad(n: number) { return String(n).padStart(2, "0"); }

function Uptime() {
    const [, tick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => tick(n => n + 1), 1000);
        return () => clearInterval(t);
    }, []);
    const s = Math.floor((Date.now() - SESSION_START) / 1000);
    const parts = [["DD", Math.floor(s / 86400)], ["HH", Math.floor((s % 86400) / 3600)], ["MM", Math.floor((s % 3600) / 60)], ["SS", s % 60]] as const;
    return (
        <div className="vc-dash-uptime">
            {parts.map(([l, v]) => <div key={l}><small>{l}</small><strong>{pad(v)}</strong></div>)}
        </div>
    );
}

function Ring({ value, max, label }: { value: number; max: number; label: string; }) {
    return (
        <div className="vc-dash-ring" style={{ "--p": Math.min(100, Math.round(value / max * 100)) } as React.CSSProperties}>
            <div><strong>{value}</strong><em>/{max}</em><br /><small>{label}</small></div>
        </div>
    );
}

function NotificationCenter() {
    const [log] = useLogs();
    const items = [...log].sort((a, b) => b.timestamp - a.timestamp).slice(0, 12);
    const ago = (t: number) => {
        const s = Math.floor((Date.now() - t) / 1000);
        return s < 60 ? `${s} seconds ago` : s < 3600 ? `${Math.floor(s / 60)} minutes ago` : s < 86400 ? `${Math.floor(s / 3600)} hours ago` : `${Math.floor(s / 86400)} days ago`;
    };
    return (
        <div className="vc-dash-card">
            <div className="vc-dash-nc-head">
                <span className="vc-dash-nc-title">🔔 Notification Center</span>
                <Button size="small" variant="secondary" onClick={openNotificationLogModal}>Open</Button>
            </div>
            <div className="vc-dash-nc-list">
                {items.length === 0 && <BaseText size="sm" color="text-muted">Nothing yet. Pings, ghost pings, friend changes and more land here as they happen.</BaseText>}
                {items.map(n => {
                    const color = n.color ?? "#5b8cff";
                    const title = n.title.replace(/^SnoreClient \| /, "");
                    return (
                        <div className="vc-dash-nc-item" key={n.id}>
                            <div className="vc-dash-nc-main">
                                <div className="vc-dash-nc-icon" style={{ background: color }}>{n.icon ? <img src={n.icon} alt="" /> : "i"}</div>
                                <div className="vc-dash-nc-text">{title}{n.body ? ` | ${n.body}` : ""}</div>
                            </div>
                            <div className="vc-dash-nc-foot">
                                <span><b>{ago(n.timestamp)}</b></span>
                                <Button size="min" variant="secondary" onClick={() => deleteNotification(n.id)}>Dismiss</Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function DashboardTab() {
    const settings = useSettings(["cloud.authenticated", "cloud.url", "autoUpdate", "updateChannel", "plugins.*"]);
    const forceUpdate = useForceUpdater();
    const { presence, connected } = usePresence();

    const me = UserStore.getCurrentUser();
    const enabledPlugins = Object.keys(Plugins).filter(isPluginEnabled);
    const friends = RelationshipStore.getFriendIDs().length;
    const guilds = GuildStore.getGuildCount();
    const dmCount = ChannelStore.getSortedPrivateChannels().length;

    const ghost = Settings.plugins.CloudPresence?.ghostMode ?? false;
    const privateMode = Settings.plugins.PrivateMode?.enabled ?? false;

    function togglePlugin(name: string, enable: boolean) {
        const plugin = Plugins[name];
        if (!plugin) return;
        const pluginSettings = Settings.plugins[name] ??= { enabled: false };
        pluginSettings.enabled = enable;
        if (!plugin.patches?.length) (enable ? startPlugin : stopPlugin)(plugin);
        forceUpdate();
    }

    function setPrivateMode(on: boolean) {
        if (!isPluginEnabled("PrivateMode")) togglePlugin("PrivateMode", true);
        Settings.plugins.PrivateMode.enabled = on;
        forceUpdate();
    }

    return (
        <SettingsTab>
            <div className="vc-dash-hello">Hello, <span>{me?.globalName ?? me?.username}</span> 👋</div>

            <div className="vc-dash-home">
                <div>
                    <div className="vc-dash-card">
                        <div className="vc-dash-account">
                            <div className="vc-dash-avatar-wrap">
                                <img className="vc-dash-avatar" src={me?.getAvatarURL(undefined, 128, true)} alt="" />
                                <span className="vc-dash-status" />
                            </div>
                            <div className="vc-dash-identity">
                                <div className="vc-dash-name">{me?.globalName ?? me?.username}</div>
                                <div className="vc-dash-handle">@{me?.username}</div>
                                <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    {settings.cloud.authenticated && <span className="vc-dash-chip"><span className="vc-dash-dot" />cloud</span>}
                                    {connected && !ghost && <span className="vc-dash-chip">{presence.count} online</span>}
                                    {ghost && <span className="vc-dash-chip">👻 ghost</span>}
                                </div>
                            </div>
                            <div className="vc-dash-actions">
                                <Button size="small" onClick={() => SettingsRouter.openUserSettings("my_account_panel")}>Switch Account</Button>
                                <Button size="small" variant="secondary" onClick={() => SettingsRouter.openUserSettings("my_account_panel")}>Add new</Button>
                            </div>
                        </div>
                        <div className="vc-dash-facts">
                            <div>
                                <div className="vc-dash-fact-label">User ID</div>
                                <div className="vc-dash-fact-value">{me?.id}</div>
                                <div className={`vc-dash-fact-label ${Margins.top8}`}>Nitro status</div>
                                <div className="vc-dash-fact-value">{NITRO[me?.premiumType ?? 0] ?? "Inactive"}</div>
                            </div>
                            <Ring value={guilds} max={100} label="SERVERS" />
                            <Ring value={friends} max={1000} label="FRIENDS" />
                        </div>
                    </div>

                    <div className="vc-dash-meta">
                        <div className="vc-dash-card">
                            <div className="vc-dash-meta-tiles">
                                <div><span className="vc-dash-chip">Version</span><div className="vc-dash-fact-value">v{VERSION} · {gitHashShort}</div></div>
                                <div><span className="vc-dash-chip">Plugins on</span><div className="vc-dash-fact-value">{enabledPlugins.length} / {Object.keys(Plugins).length}</div></div>
                            </div>
                            <div className={Margins.top16}><span className="vc-dash-chip">Uptime</span><Uptime /></div>
                            <div className={Margins.top16}>
                                <span className="vc-dash-chip">Open DMs</span>
                                <div className="vc-dash-fact-value">{dmCount}</div>
                            </div>
                        </div>
                        <div className="vc-dash-card vc-dash-toggles">
                            <div className="vc-dash-toggle">
                                <div><BaseText size="sm" weight="semibold">Enable Snore Discoverable</BaseText><BaseText size="xs" color="text-muted">Show me in the Online now list on snore.pw and in other clients.</BaseText></div>
                                <Switch checked={!ghost} onChange={v => { (Settings.plugins.CloudPresence ??= { enabled: true }).ghostMode = !v; forceUpdate(); }} />
                            </div>
                            <div className="vc-dash-toggle">
                                <div><BaseText size="sm" weight="semibold">Enable Private Mode</BaseText><BaseText size="xs" color="text-muted">Blur names, avatars and messages for screenshots and streams. Ctrl+Shift+P.</BaseText></div>
                                <Switch checked={isPluginEnabled("PrivateMode") && privateMode} onChange={setPrivateMode} />
                            </div>
                            <div className="vc-dash-toggle">
                                <div><BaseText size="sm" weight="semibold">Snore Stats</BaseText><BaseText size="xs" color="text-muted">Messages, voice time, busiest channels and more.</BaseText></div>
                                <Button size="small" variant="secondary" onClick={() => SettingsRouter.openUserSettings("snoreclient_statistics_panel")}>Open</Button>
                            </div>
                            <div className="vc-dash-toggle">
                                <div><BaseText size="sm" weight="semibold">{isOutdated ? "Update ready" : "Updates"}</BaseText><BaseText size="xs" color="text-muted">{isOutdated ? "Restart to apply the new build." : `${settings.updateChannel === "dev" ? "Dev" : "Stable"} channel, auto update ${settings.autoUpdate ? "on" : "off"}.`}</BaseText></div>
                                <Button size="small" variant={isOutdated ? "primary" : "secondary"} onClick={isOutdated ? relaunch : () => SettingsRouter.openUserSettings("snoreclient_updater_panel")}>{isOutdated ? "Restart" : "Open"}</Button>
                            </div>
                        </div>
                    </div>
                </div>

                <NotificationCenter />
            </div>

            <Heading className={Margins.top20}>Quick switches</Heading>
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
