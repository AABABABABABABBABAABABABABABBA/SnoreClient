/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings, Settings } from "@api/Settings";
import { putCloudKey } from "@api/SettingsSync/cloudSync";
import { BaseText } from "@components/BaseText";
import ErrorBoundary from "@components/ErrorBoundary";
import { SnoreClientDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { useEffect, UserStore, useState } from "@webpack/common";

const Section = findComponentByCodeLazy("headingVariant:", '"section"', "headingIcon:");
const logger = new Logger("LastFm", "#d51007");
const DEFAULT_KEY = "feff915bf5987580c9dc354d523dc6b9";

export interface NowPlaying {
    name: string;
    artist: string;
    album: string;
    image: string;
    url: string;
    since: number;
}

export interface LastFmState {
    username: string;
    nowPlaying: NowPlaying | null;
    updatedAt: number;
}

export const settings = definePluginSettings({
    username: {
        type: OptionType.STRING,
        description: "Your Last.fm username. Link it under SnoreClient → Connections.",
        default: "",
        onChange: () => restart(),
    },
    apiKey: {
        type: OptionType.STRING,
        description: "Optional Last.fm API key. Leave empty to use the shared one.",
        default: "",
    },
    showOnProfile: {
        type: OptionType.BOOLEAN,
        description: "Show what you are listening to on your profile for other SnoreClient users, live.",
        default: true,
        onChange: () => publish(true),
    },
});

export const local: { state: LastFmState | null; listeners: Set<() => void>; } = { state: null, listeners: new Set() };
let timer: ReturnType<typeof setInterval> | undefined;
let lastKey = "";

function trackKey(t: NowPlaying | null) {
    return t ? `${t.name}|${t.artist}` : "";
}

export async function fetchNowPlaying(username: string, apiKey = settings.store.apiKey || DEFAULT_KEY): Promise<NowPlaying | null> {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${apiKey}&format=json&limit=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Last.fm returned ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.message ?? `Last.fm error ${data.error}`);
    const t = data.recenttracks?.track?.[0];
    if (!t || t["@attr"]?.nowplaying !== "true") return null;
    return {
        name: t.name ?? "",
        artist: t.artist?.["#text"] ?? t.artist?.name ?? "",
        album: t.album?.["#text"] ?? "",
        image: (t.image ?? []).find((i: { size: string; }) => i.size === "large")?.["#text"] ?? "",
        url: t.url ?? "",
        since: local.state?.nowPlaying && trackKey(local.state.nowPlaying) === `${t.name}|${t.artist?.["#text"] ?? ""}` ? local.state.nowPlaying.since : Date.now(),
    };
}

async function publish(force = false) {
    const username = settings.store.username.trim();
    if (!username) return;
    const state = local.state ?? { username, nowPlaying: null, updatedAt: Date.now() };
    const key = settings.store.showOnProfile ? trackKey(state.nowPlaying) : "hidden";
    if (!force && key === lastKey) return;
    lastKey = key;
    if (!Settings.cloud.authenticated) return;
    await putCloudKey("lastfm", settings.store.showOnProfile ? state : { username, nowPlaying: null, updatedAt: Date.now(), hidden: true }).catch(e => logger.warn("Could not publish", e));
}

async function poll() {
    const username = settings.store.username.trim();
    if (!username) return;
    try {
        const nowPlaying = await fetchNowPlaying(username);
        local.state = { username, nowPlaying, updatedAt: Date.now() };
        local.listeners.forEach(l => l());
        await publish();
    } catch (e) {
        logger.warn("Poll failed", e);
    }
}

function restart() {
    clearInterval(timer);
    local.state = null;
    lastKey = "";
    if (!settings.store.username.trim()) { publish(true); return; }
    poll();
    timer = setInterval(poll, 30_000);
}

const remoteCache = new Map<string, { at: number; state: LastFmState | null; }>();

export async function fetchRemote(userId: string): Promise<LastFmState | null> {
    const cached = remoteCache.get(userId);
    if (cached && Date.now() - cached.at < 20_000) return cached.state;
    try {
        const res = await fetch(`${SNORE_SERVER_URL}/v1/profile/${userId}/lastfm`);
        const state: LastFmState | null = res.ok ? await res.json() : null;
        remoteCache.set(userId, { at: Date.now(), state: state?.username ? state : null });
        return remoteCache.get(userId)?.state ?? null;
    } catch {
        return null;
    }
}

export function useLastFm(userId: string) {
    const me = UserStore.getCurrentUser()?.id;
    const [state, setState] = useState<LastFmState | null>(userId === me ? local.state : null);
    useEffect(() => {
        let alive = true;
        if (userId === me) {
            const l = () => setState(local.state ? { ...local.state } : null);
            local.listeners.add(l);
            l();
            return () => { local.listeners.delete(l); };
        }
        const tick = () => fetchRemote(userId).then(s => { if (alive) setState(s); });
        tick();
        const t = setInterval(tick, 30_000);
        return () => { alive = false; clearInterval(t); };
    }, [userId, me]);
    return state;
}

export function NowPlayingCard({ state, compact }: { state: LastFmState | null; compact?: boolean; }) {
    if (!state?.username) return null;
    const t = state.nowPlaying;
    return (
        <a className="vc-lastfm-card" href={t?.url || `https://www.last.fm/user/${encodeURIComponent(state.username)}`} target="_blank" rel="noreferrer">
            {t?.image ? <img className="vc-lastfm-art" src={t.image} alt="" /> : <div className="vc-lastfm-art" />}
            <div className="vc-lastfm-text">
                <BaseText size="sm" weight="semibold">{t ? t.name : "Not playing right now"}</BaseText>
                <BaseText size="xs" color="text-muted">{t ? `${t.artist}${t.album && !compact ? ` · ${t.album}` : ""}` : `last.fm/${state.username}`}</BaseText>
            </div>
            {t && <span className="vc-lastfm-live" title="Live" />}
        </a>
    );
}

const ProfileSection = ErrorBoundary.wrap(({ userId }: { userId: string; isSideBar: boolean; }) => {
    const state = useLastFm(userId);
    if (!state?.username) return null;
    return (
        <Section heading="Listening on Last.fm" headingVariant="text-xs/medium" headingColor="text-default" className="vc-lastfm-section">
            <NowPlayingCard state={state} />
        </Section>
    );
}, { noop: true });

export default definePlugin({
    name: "LastFm",
    description: "Link your Last.fm under SnoreClient → Connections. What you are listening to shows live on your profile for every SnoreClient user, and on your SnoreClient profile page.",
    authors: [SnoreClientDevs.founder],
    dependencies: ["ProfileSectionsAPI"],
    enabledByDefault: true,
    settings,
    renderProfileSection: { render: ProfileSection, priority: 9 },

    start() { restart(); },
    stop() { clearInterval(timer); },
});
