/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings, useSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { fetchNowPlaying, local, NowPlayingCard, settings as lastFmSettings, useLastFm } from "@snoreclientplugins/lastFm";
import { Margins } from "@utils/margins";
import { TextInput, UserStore, useState } from "@webpack/common";

function LastFmCard() {
    useSettings(["plugins.LastFm.*"]);
    const { store } = lastFmSettings;
    const [draft, setDraft] = useState(store.username);
    const [key, setKey] = useState(store.apiKey);
    const [status, setStatus] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const state = useLastFm(UserStore.getCurrentUser()?.id ?? "");
    const linked = !!store.username;

    async function link() {
        const name = draft.trim();
        if (!name) return;
        setBusy(true);
        setStatus(null);
        try {
            await fetchNowPlaying(name, key.trim() || undefined);
            store.apiKey = key.trim();
            store.username = name;
            Settings.plugins.LastFm.enabled = true;
            setStatus("Linked. Your profile updates within 30 seconds of a new track.");
        } catch (e) {
            setStatus(`Could not reach that account: ${(e as Error).message}`);
        } finally {
            setBusy(false);
        }
    }

    function unlink() {
        store.username = "";
        local.state = null;
        setDraft("");
        setStatus("Unlinked. It will disappear from your profile within two minutes.");
    }

    return (
        <div className="vc-dash-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#d51007", display: "grid", placeItems: "center", color: "#fff", fontWeight: 700 }}>fm</div>
                <div>
                    <BaseText size="md" weight="semibold">Last.fm</BaseText>
                    <BaseText size="xs" color="text-muted">{linked ? `Linked as ${store.username}` : "Not linked"}</BaseText>
                </div>
            </div>
            {linked && <NowPlayingCard state={state} />}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <TextInput value={draft} onChange={setDraft} placeholder="Last.fm username" />
                <TextInput value={key} onChange={setKey} placeholder="API key (optional)" />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
                <Button size="small" onClick={link} disabled={busy || !draft.trim()}>{linked ? "Update" : "Link account"}</Button>
                {linked && <Button size="small" variant="dangerSecondary" onClick={unlink}>Unlink</Button>}
            </div>
            <FormSwitch title="Show on my profile" description="Other SnoreClient users see what you are listening to, live, on your profile." value={store.showOnProfile} onChange={v => store.showOnProfile = v} hideBorder />
            {status && <BaseText size="sm" color="text-muted">{status}</BaseText>}
        </div>
    );
}

function ConnectionsTab() {
    return (
        <SettingsTab>
            <Heading>Connections</Heading>
            <Paragraph className={Margins.bottom16}>
                Link outside services to your SnoreClient profile. Linked services sync through your SnoreClient cloud, so they need <Link href="https://snore.pw">Cloud Integration</Link> turned on to show for other people.
            </Paragraph>
            <LastFmCard />
        </SettingsTab>
    );
}

export default wrapTab(ConnectionsTab, "Connections");
