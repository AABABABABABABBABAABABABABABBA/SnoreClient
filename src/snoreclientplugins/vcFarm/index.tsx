/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { popNotice, showNotice } from "@api/Notices";
import { definePluginSettings } from "@api/Settings";
import { SnoreClientDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Channel, VoiceState } from "@vencord/discord-types";
import { ChannelActions, ChannelStore, MediaEngineStore, Menu, SelectedChannelStore, UserStore, VoiceActions } from "@webpack/common";

const ACTIVE_KEY = "VcFarm_active";
const LABEL = "24/7 Voice Connected";

const settings = definePluginSettings({
    channelId: {
        type: OptionType.STRING,
        description: "Voice channel to sit in. Right click any voice channel and pick \"Farm 24/7 here\" to set it.",
        default: "",
    },
    muteSelf: {
        type: OptionType.BOOLEAN,
        description: "Keep yourself muted while farming so nobody can hear you.",
        default: true,
    },
    deafenSelf: {
        type: OptionType.BOOLEAN,
        description: "Keep yourself deafened while farming so you don't hear them, their soundboards or stream audio.",
        default: true,
    },
    rejoinDelay: {
        type: OptionType.SLIDER,
        description: "Seconds to wait before rejoining after a disconnect.",
        markers: [2, 5, 10, 30, 60],
        default: 5,
        stickToMarkers: false,
    },
});

let active = false;
let rejoinTimer: ReturnType<typeof setTimeout> | undefined;
let observer: MutationObserver | undefined;

const myId = () => UserStore.getCurrentUser()?.id;

function enforceAudioState() {
    if (settings.store.muteSelf && !MediaEngineStore.isSelfMute()) VoiceActions.toggleSelfMute();
    if (settings.store.deafenSelf && !MediaEngineStore.isSelfDeaf()) VoiceActions.toggleSelfDeaf();
}

function join() {
    const { channelId } = settings.store;
    if (!channelId || !ChannelStore.getChannel(channelId)) return;
    if (SelectedChannelStore.getVoiceChannelId() !== channelId)
        ChannelActions.selectVoiceChannel(channelId);
    setTimeout(enforceAudioState, 1500);
}

function scheduleRejoin() {
    if (!active || rejoinTimer) return;
    rejoinTimer = setTimeout(() => {
        rejoinTimer = undefined;
        if (active) join();
    }, settings.store.rejoinDelay * 1000);
}

function relabel() {
    for (const el of document.querySelectorAll<HTMLElement>('[class*="rtcConnectionStatusConnected"] [class*="default_"] > div')) {
        if (el.textContent === "Voice Connected") el.textContent = LABEL;
    }
}

function startObserver() {
    if (observer) return;
    observer = new MutationObserver(relabel);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    relabel();
}

function stopObserver() {
    observer?.disconnect();
    observer = undefined;
    for (const el of document.querySelectorAll<HTMLElement>('[class*="rtcConnectionStatusConnected"] [class*="default_"] > div')) {
        if (el.textContent === LABEL) el.textContent = "Voice Connected";
    }
}

function channelName() {
    const c = ChannelStore.getChannel(settings.store.channelId);
    return c ? `#${c.name}` : "a voice channel";
}

function showFarmNotice() {
    popNotice();
    if (active) {
        showNotice(`${LABEL} to ${channelName()}. You are muted and deafened, and SnoreClient will rejoin if you get disconnected.`, "Leave", stopFarming);
    } else {
        showNotice(
            settings.store.channelId
                ? `24/7 Voice is off. Press Join to sit in ${channelName()} muted and deafened.`
                : "24/7 Voice: join a voice channel (or right click one and pick \"Farm 24/7 here\"), then press Join.",
            "Join voice",
            () => startFarming(),
        );
    }
}

async function startFarming(channelId = settings.store.channelId || SelectedChannelStore.getVoiceChannelId()) {
    if (!channelId) {
        showFarmNotice();
        return;
    }
    settings.store.channelId = channelId;
    active = true;
    await DataStore.set(ACTIVE_KEY, true);
    join();
    startObserver();
    showFarmNotice();
}

async function stopFarming() {
    active = false;
    clearTimeout(rejoinTimer);
    rejoinTimer = undefined;
    await DataStore.set(ACTIVE_KEY, false);
    stopObserver();
    if (SelectedChannelStore.getVoiceChannelId() === settings.store.channelId)
        ChannelActions.disconnect();
    popNotice();
}

const channelContextMenu = (children: any[], { channel }: { channel: Channel; }) => {
    if (!channel?.isGuildVocal?.()) return;
    const isHere = active && settings.store.channelId === channel.id;
    children.push(
        <Menu.MenuItem
            id="vc-farm-here"
            label={isHere ? "Stop farming 24/7" : "Farm 24/7 here"}
            action={() => isHere ? stopFarming() : startFarming(channel.id)}
        />
    );
};

export default definePlugin({
    name: "VcFarm",
    description: "Sits in a voice channel 24/7, muted and deafened, rejoining whenever you get disconnected. Shows 24/7 Voice Connected while it is on.",
    authors: [SnoreClientDevs.founder],
    dependencies: ["ContextMenuAPI"],
    settings,
    contextMenus: {
        "channel-context": channelContextMenu,
    },

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            if (!active) return;
            const me = myId();
            for (const state of voiceStates) {
                if (state.userId !== me) continue;
                if (state.channelId !== settings.store.channelId) scheduleRejoin();
                else enforceAudioState();
            }
        },
        RTC_CONNECTION_STATE({ state }: { state: string; }) {
            if (active && state === "DISCONNECTED") scheduleRejoin();
        },
        CONNECTION_OPEN() {
            if (active) scheduleRejoin();
        },
    },

    async start() {
        active = await DataStore.get<boolean>(ACTIVE_KEY) ?? false;
        if (active) {
            join();
            startObserver();
        }
        showFarmNotice();
    },

    stop() {
        clearTimeout(rejoinTimer);
        rejoinTimer = undefined;
        stopObserver();
        popNotice();
    },

    startFarming,
    stopFarming,
});
