/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./ContributorModal.css";

import { isPluginEnabled } from "@api/PluginManager";
import { useSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { GithubIcon, WebsiteIcon } from "@components/Icons";
import { SnoreLogo } from "@components/SnoreLogo";
import BadgeAPI from "@plugins/_api/badges";
import { SnoreClientDevsById, VencordDevsById } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { fetchUserProfile, openUserProfile } from "@utils/discord";
import { pluralize } from "@utils/misc";
import { RenderModalProps, User } from "@vencord/discord-types";
import { Modal, openModal, showToast, useEffect, useMemo, UserProfileStore, UserUtils,useStateFromStores } from "@webpack/common";

import Plugins, { PluginMeta } from "~plugins";

import { PluginCard } from "./PluginCard";
import { makeDummyUser } from "./PluginModal";

const cl = classNameFactory("vc-dev-card-");

export function openContributorModal(user: User) {
    openModal(modalProps => <ContributorModal user={user} modalProps={modalProps} />);
}

export async function openDevCard(dev: { name: string; id: BigInt | bigint; }) {
    const user = dev.id && String(dev.id) !== "0"
        ? await UserUtils.getUser(String(dev.id)).catch(() => makeDummyUser({ username: dev.name }))
        : makeDummyUser({ username: dev.name });
    openContributorModal(user);
}

function ContributorModal({ user, modalProps }: { user: User; modalProps: RenderModalProps; }) {
    useSettings();

    const profile = useStateFromStores([UserProfileStore], () => UserProfileStore.getUserProfile(user.id));

    useEffect(() => {
        if (!profile && !user.bot && user.id)
            fetchUserProfile(user.id);
    }, [user.id, user.bot, profile]);

    const githubName = profile?.connectedAccounts?.find(a => a.type === "github")?.name;
    const website = profile?.connectedAccounts?.find(a => a.type === "domain")?.name;

    const isSnoreDev = Object.hasOwn(SnoreClientDevsById, user.id);
    const isVencordDev = Object.hasOwn(VencordDevsById, user.id);
    const snoreDonor = !!BadgeAPI.getSnoreClientDonorBadges(user.id);
    const vencordDonor = !!BadgeAPI.getDonorBadges(user.id);

    const plugins = useMemo(() => {
        const allPlugins = Object.values(Plugins);
        const dev = VencordDevsById[user.id] || SnoreClientDevsById[user.id];
        const pluginsByAuthor = dev
            ? allPlugins.filter(p => p.authors.includes(dev))
            : allPlugins.filter(p =>
                PluginMeta[p.name]?.userPlugin && p.authors.some(a => a.id.toString() === user.id)
                || p.authors.some(a => a.name === user.username)
            );

        return pluginsByAuthor
            .filter(p => !p.name.endsWith("API"))
            .sort((a, b) => Number(a.required ?? false) - Number(b.required ?? false));
    }, [user.id, user.username]);

    const enabledCount = plugins.filter(p => isPluginEnabled(p.name)).length;
    const snorePluginCount = plugins.filter(p => PluginMeta[p.name]?.folderName?.startsWith("src/snoreclientplugins")).length;
    const isRealUser = !user.id.startsWith("-");

    const chips = [
        isSnoreDev && { label: "SnoreClient Developer", kind: "snore" },
        isVencordDev && { label: "Vencord Developer", kind: "vencord" },
        snoreDonor && { label: "SnoreClient Donor", kind: "donor" },
        vencordDonor && { label: "Vencord Donor", kind: "donor" },
        !isSnoreDev && !isVencordDev && plugins.length > 0 && { label: "User Plugin Author", kind: "user" },
    ].filter(Boolean) as { label: string; kind: string; }[];

    return (
        <Modal {...modalProps} size="lg" title={null as any}>
            <div className={cl("root")}>
                <div className={cl("banner")}>
                    <SnoreLogo size={120} className={cl("banner-logo")} />
                </div>

                <div className={cl("head")}>
                    <img className={cl("avatar")} src={user.getAvatarURL(void 0, 256, true)} alt="" />
                    <div className={cl("identity")}>
                        <span className={cl("name")}>{user.globalName ?? user.username}</span>
                        <span className={cl("handle")}>@{user.username}</span>
                        {!!chips.length && (
                            <div className={cl("chips")}>
                                {chips.map(c => <span key={c.label} className={cl("chip", `chip-${c.kind}`)}>{c.label}</span>)}
                            </div>
                        )}
                    </div>
                    <div className={cl("links")}>
                        {isRealUser && (
                            <Button size="small" variant="secondary" onClick={() => openUserProfile(user.id)}>
                                Discord profile
                            </Button>
                        )}
                        {githubName && (
                            <Button size="small" variant="secondary" onClick={() => VencordNative.native.openExternal(`https://github.com/${githubName}`)}>
                                <GithubIcon width={16} height={16} /> {githubName}
                            </Button>
                        )}
                        {website && (
                            <Button size="small" variant="secondary" onClick={() => VencordNative.native.openExternal(`https://${website}`)}>
                                <WebsiteIcon width={16} height={16} /> {website}
                            </Button>
                        )}
                    </div>
                </div>

                <div className={cl("stats")}>
                    <div className={cl("stat")}>
                        <span className={cl("stat-value")}>{plugins.length}</span>
                        <span className={cl("stat-label")}>{pluralize(plugins.length, "plugin").replace(/^\d+ /, "")} written</span>
                    </div>
                    <div className={cl("stat")}>
                        <span className={cl("stat-value")}>{enabledCount}</span>
                        <span className={cl("stat-label")}>enabled by you</span>
                    </div>
                    <div className={cl("stat")}>
                        <span className={cl("stat-value")}>{snorePluginCount}</span>
                        <span className={cl("stat-label")}>SnoreClient exclusive</span>
                    </div>
                </div>

                {plugins.length
                    ? (
                        <>
                            <span className={cl("section-title")}>Plugins by {user.username}</span>
                            <div className={cl("plugins")}>
                                {plugins.map(p =>
                                    <PluginCard
                                        key={p.name}
                                        plugin={p}
                                        disabled={p.required ?? false}
                                        onRestartNeeded={() => showToast("Restart to apply changes!")}
                                    />
                                )}
                            </div>
                        </>
                    )
                    : (
                        <div className={cl("empty")}>
                            {user.username} has not written any plugins, but has most likely contributed to SnoreClient in other ways. Thank you!
                        </div>
                    )}
            </div>
        </Modal>
    );
}
