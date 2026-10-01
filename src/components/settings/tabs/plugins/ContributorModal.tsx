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
import { Plugin } from "@utils/types";
import { RenderModalProps, User } from "@vencord/discord-types";
import { IconUtils, Modal, openModal, showToast, SnowflakeUtils, Tooltip, useEffect, useMemo, UserProfileStore, UserUtils,useStateFromStores } from "@webpack/common";

import Plugins, { PluginMeta } from "~plugins";

import { PluginCard } from "./PluginCard";
import { makeDummyUser } from "./PluginModal";

const cl = classNameFactory("vc-dev-card-");

const BADGE_CDN = "https://cdn.discordapp.com/badge-icons/";

/** Discord public flag badges, used until the full profile (which carries the real badge list) has loaded. */
const FLAG_BADGES: [bit: number, name: string, icon: string][] = [
    [0, "Discord Staff", "5e74e9b61934fc1f67c65515d1f7e60d"],
    [1, "Partnered Server Owner", "3f9748e53446a137a052f3454e2de41e"],
    [2, "HypeSquad Events", "bf01d1073931f921909045f3a39fd264"],
    [3, "Discord Bug Hunter", "2717692c7dca7289b35297368a940dd0"],
    [6, "HypeSquad Bravery", "8a88d63823d8a71cd5e390baa45efa02"],
    [7, "HypeSquad Brilliance", "011940fd013da3f7fb926e4a1cd2e618"],
    [8, "HypeSquad Balance", "3aa41de486fa12454c3761e8e223442e"],
    [9, "Early Supporter", "7060786766c9c840eb3019e725d2b358"],
    [14, "Discord Bug Hunter Gold", "848f79194d4be5ff5f81505cbd0ce1e6"],
    [17, "Early Verified Bot Developer", "6df5892e0f35b051f8b61eace34f4967"],
    [18, "Moderator Programs Alumni", "fee1624003e2fee35cb398e125dc479b"],
    [22, "Active Developer", "6bdc42827a38498929a4920da12695d9"],
];

const CONNECTION_LABELS: Record<string, string> = {
    github: "GitHub",
    domain: "Website",
    twitter: "X",
    bluesky: "Bluesky",
    mastodon: "Mastodon",
    youtube: "YouTube",
    twitch: "Twitch",
    reddit: "Reddit",
    steam: "Steam",
    spotify: "Spotify",
    tiktok: "TikTok",
};

const CONNECTION_URLS: Record<string, (name: string) => string> = {
    github: n => `https://github.com/${n}`,
    domain: n => `https://${n}`,
    twitter: n => `https://x.com/${n}`,
    bluesky: n => `https://bsky.app/profile/${n}`,
    youtube: n => `https://youtube.com/${n}`,
    twitch: n => `https://twitch.tv/${n}`,
    reddit: n => `https://reddit.com/u/${n}`,
    tiktok: n => `https://tiktok.com/@${n}`,
};

export function openContributorModal(user: User) {
    openModal(modalProps => <ContributorModal user={user} modalProps={modalProps} />);
}

export async function openDevCard(dev: { name: string; id: BigInt | bigint; }) {
    const user = dev.id && String(dev.id) !== "0"
        ? await UserUtils.getUser(String(dev.id)).catch(() => makeDummyUser({ username: dev.name }))
        : makeDummyUser({ username: dev.name });
    openContributorModal(user);
}

const formatDate = (d: Date) => d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

function pluginSource(p: Plugin) {
    const meta = PluginMeta[p.name];
    if (meta?.userPlugin) return "user";
    if (meta?.folderName?.startsWith("src/snoreclientplugins")) return "snore";
    return "vencord";
}

function ContributorModal({ user, modalProps }: { user: User; modalProps: RenderModalProps; }) {
    useSettings();

    const profile = useStateFromStores([UserProfileStore], () => UserProfileStore.getUserProfile(user.id));
    const isRealUser = !user.id.startsWith("-");

    useEffect(() => {
        if (!profile && !user.bot && isRealUser)
            fetchUserProfile(user.id);
    }, [user.id, user.bot, profile, isRealUser]);

    const connections = (profile?.connectedAccounts ?? []).filter(a => CONNECTION_URLS[a.type]);

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
            .sort((a, b) => Number(a.required ?? false) - Number(b.required ?? false) || a.name.localeCompare(b.name));
    }, [user.id, user.username]);

    const groups = [
        { key: "snore", title: "SnoreClient plugins", items: plugins.filter(p => pluginSource(p) === "snore") },
        { key: "vencord", title: "Vencord plugins", items: plugins.filter(p => pluginSource(p) === "vencord") },
        { key: "user", title: "User plugins", items: plugins.filter(p => pluginSource(p) === "user") },
    ].filter(g => g.items.length);

    const enabledCount = plugins.filter(p => isPluginEnabled(p.name)).length;

    const discordBadges = profile?.badges?.length
        ? profile.badges.map(b => ({ id: b.id, name: b.description, src: BADGE_CDN + b.icon + ".png" }))
        : FLAG_BADGES
            .filter(([bit]) => ((user.publicFlags ?? 0) & (1 << bit)) !== 0)
            .map(([bit, name, icon]) => ({ id: String(bit), name, src: BADGE_CDN + icon + ".png" }));

    const chips = [
        isSnoreDev && { label: "SnoreClient Developer", kind: "snore" },
        isVencordDev && { label: "Vencord Developer", kind: "vencord" },
        snoreDonor && { label: "SnoreClient Donor", kind: "donor" },
        vencordDonor && { label: "Vencord Donor", kind: "donor" },
        !isSnoreDev && !isVencordDev && plugins.length > 0 && { label: "User Plugin Author", kind: "user" },
    ].filter(Boolean) as { label: string; kind: string; }[];

    const bannerUrl = user.banner && isRealUser
        ? IconUtils.getUserBannerURL({ id: user.id, banner: user.banner, canAnimate: true, size: 1024 })
        : undefined;
    const accent = profile?.accentColor != null ? `#${profile.accentColor.toString(16).padStart(6, "0")}` : undefined;
    const bannerStyle: React.CSSProperties = bannerUrl
        ? { backgroundImage: `url(${bannerUrl})` }
        : accent
            ? { background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 40%, #120f23))` }
            : {};

    const memberSince = isRealUser ? new Date(SnowflakeUtils.extractTimestamp(user.id)) : null;
    const facts = [
        memberSince && { label: "On Discord since", value: formatDate(memberSince) },
        profile?.premiumSince && { label: "Nitro since", value: formatDate(new Date(profile.premiumSince)) },
        profile?.pronouns && { label: "Pronouns", value: profile.pronouns },
        profile?.legacyUsername && { label: "Formerly", value: profile.legacyUsername },
    ].filter(Boolean) as { label: string; value: string; }[];

    return (
        <Modal {...modalProps} size="lg" title={null as any}>
            <div className={cl("root")}>
                <div className={cl("banner", { "banner-image": !!bannerUrl })} style={bannerStyle}>
                    {!bannerUrl && <SnoreLogo size={140} className={cl("banner-logo")} />}
                    <div className={cl("banner-fade")} />
                </div>

                <div className={cl("head")}>
                    <img className={cl("avatar")} src={user.getAvatarURL(void 0, 256, true)} alt="" />
                    <div className={cl("identity")}>
                        <div className={cl("name-row")}>
                            <span className={cl("name")}>{user.globalName ?? user.username}</span>
                            {!!discordBadges.length && (
                                <div className={cl("badges")}>
                                    {discordBadges.map(b => (
                                        <Tooltip key={b.id} text={b.name}>
                                            {props => <img {...props} className={cl("badge")} src={b.src} alt={b.name} />}
                                        </Tooltip>
                                    ))}
                                </div>
                            )}
                        </div>
                        <span className={cl("handle")}>@{user.username}</span>
                        {!!chips.length && (
                            <div className={cl("chips")}>
                                {chips.map(c => <span key={c.label} className={cl("chip", `chip-${c.kind}`)}>{c.label}</span>)}
                            </div>
                        )}
                    </div>
                    <div className={cl("actions")}>
                        {isRealUser && (
                            <Button size="small" variant="primary" onClick={() => openUserProfile(user.id)}>
                                View Discord profile
                            </Button>
                        )}
                    </div>
                </div>

                <div className={cl("stats")}>
                    <div className={cl("stat")}>
                        <span className={cl("stat-value")}>{plugins.length}</span>
                        <span className={cl("stat-label")}>Plugins authored</span>
                    </div>
                    <div className={cl("stat")}>
                        <span className={cl("stat-value")}>{enabledCount}</span>
                        <span className={cl("stat-label")}>Enabled by you</span>
                    </div>
                    <div className={cl("stat")}>
                        <span className={cl("stat-value")}>{groups.find(g => g.key === "snore")?.items.length ?? 0}</span>
                        <span className={cl("stat-label")}>SnoreClient exclusive</span>
                    </div>
                    <div className={cl("stat")}>
                        <span className={cl("stat-value")}>{discordBadges.length}</span>
                        <span className={cl("stat-label")}>Discord badges</span>
                    </div>
                </div>

                {(profile?.bio || facts.length > 0 || connections.length > 0) && (
                    <div className={cl("about")}>
                        {profile?.bio && (
                            <div className={cl("about-block")}>
                                <span className={cl("section-title")}>About</span>
                                <p className={cl("bio")}>{profile.bio}</p>
                            </div>
                        )}
                        {facts.length > 0 && (
                            <div className={cl("about-block")}>
                                <span className={cl("section-title")}>Details</span>
                                <dl className={cl("facts")}>
                                    {facts.map(f => (
                                        <div key={f.label} className={cl("fact")}>
                                            <dt>{f.label}</dt>
                                            <dd>{f.value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        )}
                        {connections.length > 0 && (
                            <div className={cl("about-block")}>
                                <span className={cl("section-title")}>Connections</span>
                                <div className={cl("links")}>
                                    {connections.map(a => (
                                        <Button
                                            key={a.type + a.name}
                                            size="small"
                                            variant="secondary"
                                            onClick={() => VencordNative.native.openExternal(CONNECTION_URLS[a.type](a.name))}
                                        >
                                            {a.type === "github" ? <GithubIcon width={16} height={16} /> : <WebsiteIcon width={16} height={16} />}
                                            <span>{CONNECTION_LABELS[a.type] ?? a.type}</span>
                                            <span className={cl("link-name")}>{a.name}</span>
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {groups.length
                    ? groups.map(g => (
                        <div key={g.key} className={cl("group")}>
                            <div className={cl("group-head")}>
                                <span className={cl("section-title")}>{g.title}</span>
                                <span className={cl("group-count")}>{g.items.length}</span>
                            </div>
                            <div className={cl("plugins")}>
                                {g.items.map(p =>
                                    <PluginCard
                                        key={p.name}
                                        plugin={p}
                                        disabled={p.required ?? false}
                                        onRestartNeeded={() => showToast("Restart to apply changes!")}
                                    />
                                )}
                            </div>
                        </div>
                    ))
                    : (
                        <div className={cl("empty")}>
                            {user.username} has not authored any plugins, but has most likely contributed to SnoreClient in other ways. Thank you!
                        </div>
                    )}
            </div>
        </Modal>
    );
}
