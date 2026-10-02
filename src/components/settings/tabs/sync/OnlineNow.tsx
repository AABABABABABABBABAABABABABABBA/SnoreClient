/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { usePresence } from "@snoreclientplugins/cloudPresence";
import { Margins } from "@utils/margins";
import { UserStore } from "@webpack/common";

export function OnlineNow() {
    const { presence, connected } = usePresence();
    const me = UserStore.getCurrentUser()?.id;

    return (
        <>
            <Heading className={Margins.top20}>Online now</Heading>
            <Paragraph className={Margins.bottom8}>
                {connected
                    ? `${presence.count} ${presence.count === 1 ? "person is" : "people are"} connected to the cloud right now${presence.viewers ? `, plus ${presence.viewers} watching on the website` : ""}.`
                    : "Live presence is not connected. Enable Cloud Integration and the CloudPresence plugin."}
            </Paragraph>
            <div className="vc-dash-rows">
                {presence.online.map(u => {
                    const user = UserStore.getUser(u.id);
                    return (
                        <div className="vc-dash-row" key={u.id}>
                            <span className="vc-dash-dot" />
                            {user && <img src={user.getAvatarURL(undefined, 64, true)} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} />}
                            <div className="vc-dash-row-text">
                                <BaseText size="sm" weight="semibold">{user?.globalName ?? u.username}{u.id === me ? " (you)" : ""}</BaseText>
                                <BaseText size="xs" color="text-muted">@{u.username} · online since {new Date(u.since).toLocaleTimeString()}</BaseText>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
