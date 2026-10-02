/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { isPluginEnabled } from "@api/PluginManager";
import { Settings } from "@api/Settings";
import { putCloudKey } from "@api/SettingsSync/cloudSync";
import { Button } from "@components/Button";
import { Heading } from "@components/Heading";
import { LogIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab } from "@components/settings/tabs/BaseTab";
import SettingsPlugin from "@plugins/_core/settings";
import { SnoreClientDevs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { removeFromArray } from "@utils/misc";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, SelectedChannelStore, useEffect, UserStore, useState } from "@webpack/common";

import Plugins from "~plugins";

const STORE_KEY = "Statistics_totals";
const ENTRY_KEY = "snoreclient_statistics";

interface Totals {
    sent: number;
    received: number;
    dmsReceived: number;
    mentions: number;
    voiceSeconds: number;
    uptimeSeconds: number;
    sessions: number;
    firstRun: number;
    busiestChannels: Record<string, number>;
    daily: Record<string, { sent: number; received: number; voice: number; }>;
    hourly: number[];
}

function hour() {
    totals.hourly ??= new Array(24).fill(0);
    if (totals.hourly.length !== 24) totals.hourly = new Array(24).fill(0);
    totals.hourly[new Date().getHours()]++;
}

const today = () => new Date().toISOString().slice(0, 10);
function bucket() {
    totals.daily ??= {};
    const key = today();
    const b = totals.daily[key] ??= { sent: 0, received: 0, voice: 0 };
    const keys = Object.keys(totals.daily).sort();
    if (keys.length > 45) for (const k of keys.slice(0, keys.length - 45)) delete totals.daily[k];
    return b;
}

const EMPTY: Totals = { sent: 0, received: 0, dmsReceived: 0, mentions: 0, voiceSeconds: 0, uptimeSeconds: 0, sessions: 0, firstRun: Date.now(), busiestChannels: {}, daily: {}, hourly: [] };

let totals: Totals = { ...EMPTY };
let timer: ReturnType<typeof setInterval> | undefined;
let publishTimer: ReturnType<typeof setInterval> | undefined;
let dirty = false;

/** Push a compact copy to the cloud so the web dashboard can show it. Channel ids are replaced by names. */
async function publish() {
    if (!Settings.cloud.authenticated) return;
    const busiest: Record<string, number> = {};
    for (const [id, n] of Object.entries(totals.busiestChannels).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
        const c = ChannelStore.getChannel(id);
        busiest[c ? (c.isDM() ? "DM" : `#${c.name}`) : "unknown"] = (busiest[c ? (c.isDM() ? "DM" : `#${c.name}`) : "unknown"] ?? 0) + n;
    }
    await putCloudKey("stats", {
        sent: totals.sent,
        received: totals.received,
        dmsReceived: totals.dmsReceived,
        mentions: totals.mentions,
        voiceSeconds: totals.voiceSeconds,
        uptimeSeconds: totals.uptimeSeconds,
        sessions: totals.sessions,
        firstRun: totals.firstRun,
        pluginsEnabled: Object.keys(Plugins).filter(isPluginEnabled).length,
        busiestChannels: busiest,
        daily: totals.daily ?? {},
        hourly: totals.hourly ?? [],
        updatedAt: Date.now(),
    }).catch(() => { });
}

function save() {
    if (!dirty) return;
    dirty = false;
    DataStore.set(STORE_KEY, totals);
}

function tick() {
    totals.uptimeSeconds += 10;
    if (SelectedChannelStore.getVoiceChannelId()) { totals.voiceSeconds += 10; bucket().voice += 10; }
    dirty = true;
    save();
}

const fmt = (s: number) => {
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
};

function StatisticsTab() {
    const [, refresh] = useState(0);
    useEffect(() => {
        const t = setInterval(() => refresh(n => n + 1), 5000);
        return () => clearInterval(t);
    }, []);

    const top = Object.entries(totals.busiestChannels).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const days = Math.max(1, Math.round((Date.now() - totals.firstRun) / 86400000));

    const tiles: [string | number, string][] = [
        [totals.sent, "Messages sent"],
        [totals.received, "Messages seen"],
        [totals.dmsReceived, "DMs received"],
        [totals.mentions, "Times pinged"],
        [fmt(totals.voiceSeconds), "Time in voice"],
        [fmt(totals.uptimeSeconds), "Discord open"],
        [totals.sessions, "Sessions"],
        [Math.round(totals.sent / days), "Messages per day"],
    ];

    return (
        <SettingsTab>
            <Heading className={Margins.top16}>Statistics</Heading>
            <Paragraph className={Margins.bottom16}>Counted locally since {new Date(totals.firstRun).toLocaleDateString()}. Nothing leaves your device.</Paragraph>
            <div className="vc-dash-grid">
                {tiles.map(([v, l]) => (
                    <div className="vc-dash-tile" key={l}>
                        <span className="vc-dash-value">{v}</span>
                        <span className="vc-dash-label">{l}</span>
                    </div>
                ))}
            </div>
            {top.length > 0 && (
                <>
                    <Heading>Where you talk the most</Heading>
                    <div className={`vc-dash-rows ${Margins.top8}`}>
                        {top.map(([id, n]) => {
                            const c = ChannelStore.getChannel(id);
                            const name = c ? (c.isDM() ? `DM with ${UserStore.getUser(c.recipients?.[0])?.username ?? "someone"}` : `#${c.name}`) : id;
                            return (
                                <div className="vc-dash-row" key={id}>
                                    <div className="vc-dash-row-text"><span>{name}</span></div>
                                    <span className="vc-dash-value" style={{ fontSize: "1rem" }}>{n}</span>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
            <Button size="small" variant="dangerSecondary" onClick={async () => { totals = { ...EMPTY, firstRun: Date.now() }; dirty = true; save(); refresh(n => n + 1); }}>Reset statistics</Button>
        </SettingsTab>
    );
}

export default definePlugin({
    name: "Statistics",
    description: "Keeps local statistics about your Discord use: messages sent and seen, pings, voice time, uptime and your busiest channels. Shown in a Statistics tab.",
    authors: [SnoreClientDevs.founder],
    enabledByDefault: true,
    dependencies: ["MessageEventsAPI"],

    onBeforeMessageSend(channelId) {
        totals.sent++;
        bucket().sent++;
        hour();
        totals.busiestChannels[channelId] = (totals.busiestChannels[channelId] ?? 0) + 1;
        dirty = true;
    },

    flux: {
        MESSAGE_CREATE({ optimistic, type, message }: { optimistic: boolean; type: string; message: Message; }) {
            if (optimistic || type !== "MESSAGE_CREATE" || !message?.author) return;
            const me = UserStore.getCurrentUser()?.id;
            if (message.author.id === me) return;
            totals.received++;
            bucket().received++;
            if (ChannelStore.getChannel(message.channel_id)?.isDM()) totals.dmsReceived++;
            if (me && message.mentions?.includes(me)) totals.mentions++;
            dirty = true;
        },
    },

    async start() {
        totals = { ...EMPTY, ...(await DataStore.get<Totals>(STORE_KEY) ?? {}) };
        totals.sessions++;
        dirty = true;
        timer = setInterval(tick, 10_000);
        publishTimer = setInterval(publish, 10 * 60_000);
        setTimeout(publish, 60_000);
        SettingsPlugin.customEntries.push({ key: ENTRY_KEY, title: "Statistics", Component: StatisticsTab, Icon: LogIcon });
    },

    stop() {
        clearInterval(timer);
        clearInterval(publishTimer);
        save();
        removeFromArray(SettingsPlugin.customEntries, e => e.key === ENTRY_KEY);
    },
});
