/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Margins } from "@utils/margins";
import { useEffect, UserStore, useState } from "@webpack/common";

interface CloudAccount {
    id: string;
    username: string;
    created_at: number;
    last_seen_at: number;
    data_count: number;
}

function ago(ts: number) {
    const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    return `${Math.floor(s / 86400)} d ago`;
}

export function ConnectedAccounts({ url }: { url: string; }) {
    const [accounts, setAccounts] = useState<CloudAccount[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setError(null);
        fetch(new URL("/v1/accounts", url))
            .then(r => r.ok ? r.json() : Promise.reject(new Error(`API returned ${r.status}`)))
            .then(d => { if (!cancelled) setAccounts(d.accounts ?? []); })
            .catch(e => { if (!cancelled) { setError(String(e.message ?? e)); setAccounts([]); } });
        return () => { cancelled = true; };
    }, [url, tick]);

    const me = UserStore.getCurrentUser()?.id;

    return (
        <>
            <Heading className={Margins.top20}>Connected accounts</Heading>
            <Paragraph className={Margins.bottom8}>
                Everyone connected to this cloud, most recently active first.{accounts ? ` ${accounts.length} total.` : ""}
            </Paragraph>
            {error && <Paragraph className={Margins.bottom8}>Could not load accounts: {error}</Paragraph>}
            <div className="vc-dash-rows">
                {accounts === null && <BaseText size="sm" color="text-muted">Loading…</BaseText>}
                {accounts?.length === 0 && !error && <BaseText size="sm" color="text-muted">No accounts connected yet, or this instance keeps the list private.</BaseText>}
                {accounts?.map(a => {
                    const user = UserStore.getUser(a.id);
                    return (
                        <div className="vc-dash-row" key={a.id}>
                            {user
                                ? <img src={user.getAvatarURL(undefined, 64, true)} alt="" style={{ width: 32, height: 32, borderRadius: "50%" }} />
                                : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--background-base-lower)" }} />}
                            <div className="vc-dash-row-text">
                                <BaseText size="sm" weight="semibold">{user?.globalName ?? a.username}{a.id === me ? " (you)" : ""}</BaseText>
                                <BaseText size="xs" color="text-muted">@{a.username} · {a.data_count} synced {a.data_count === 1 ? "entry" : "entries"}</BaseText>
                            </div>
                            <BaseText size="xs" color="text-muted">Last sync {ago(a.last_seen_at)}</BaseText>
                        </div>
                    );
                })}
            </div>
            <Button size="small" variant="secondary" className={Margins.top8} onClick={() => setTick(t => t + 1)}>Refresh</Button>
        </>
    );
}
