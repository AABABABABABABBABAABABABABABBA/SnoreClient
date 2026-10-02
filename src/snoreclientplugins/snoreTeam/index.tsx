/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { BadgePosition, ProfileBadge } from "@api/Badges";
import { BaseText } from "@components/BaseText";
import ErrorBoundary from "@components/ErrorBoundary";
import { SnoreClientDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";

const Section = findComponentByCodeLazy("headingVariant:", '"section"', "headingIcon:");

const BADGE_CDN = "https://cdn.discordapp.com/badge-icons/";

const DISCORD_BADGES: [name: string, icon: string][] = [
    ["Discord Staff", "5e74e9b61934fc1f67c65515d1f7e60d"],
    ["Partnered Server Owner", "3f9748e53446a137a052f3454e2de41e"],
    ["HypeSquad Events", "bf01d1073931f921909045f3a39fd264"],
    ["Discord Bug Hunter", "2717692c7dca7289b35297368a940dd0"],
    ["Discord Bug Hunter Gold", "848f79194d4be5ff5f81505cbd0ce1e6"],
    ["HypeSquad Bravery", "8a88d63823d8a71cd5e390baa45efa02"],
    ["HypeSquad Brilliance", "011940fd013da3f7fb926e4a1cd2e618"],
    ["HypeSquad Balance", "3aa41de486fa12454c3761e8e223442e"],
    ["Early Supporter", "7060786766c9c840eb3019e725d2b358"],
    ["Early Verified Bot Developer", "6df5892e0f35b051f8b61eace34f4967"],
    ["Moderator Programs Alumni", "fee1624003e2fee35cb398e125dc479b"],
    ["Active Developer", "6bdc42827a38498929a4920da12695d9"],
    ["Subscriber since forever", "2ba85e8026a8614b640c2837bcdfe21b"],
    ["Server booster", "ec92202290b48d0879b7413d2dde3bab"],
    ["Completed a Quest", "7d9ae358c8c5e118768335dbe68b4fb8"],
    ["Originally known as", "6de6d34650760ba5551a79732e98ed60"],
];

interface TeamMember {
    role: string;
    contributions: string[];
    allDiscordBadges?: boolean;
    github?: string;
}

export const TEAM_GITHUB = (userId: string) => TEAM[userId]?.github;

const TEAM: Record<string, TeamMember> = {
    "454986373623971840": {
        role: "Founder @ SnoreClient",
        contributions: [
            "Helped wt tiktok font method",
            "Helped wt instagram font method",
        ],
        allDiscordBadges: true,
        github: "https://github.com/AABABABABABABBABAABABABABABBA?tab=repositories",
    },
};

const founderBadge: ProfileBadge = {
    id: "snoreclient-founder",
    description: "Founder @ SnoreClient",
    iconSrc: `${SNORE_SERVER_URL}/assets/icon.png`,
    position: BadgePosition.START,
    props: { style: { borderRadius: "6px" } },
    shouldShow: ({ userId }) => TEAM[userId]?.role.startsWith("Founder") ?? false,
};

const discordBadges: ProfileBadge = {
    id: "snoreclient-team-discord-badges",
    position: BadgePosition.START,
    shouldShow: ({ userId }) => TEAM[userId]?.allDiscordBadges ?? false,
    getBadges: () => DISCORD_BADGES.map(([name, icon]) => ({
        id: `snoreclient-team-${icon}`,
        description: name,
        iconSrc: `${BADGE_CDN}${icon}.png`,
        position: BadgePosition.START,
    })),
};

const TeamSection = ErrorBoundary.wrap(({ userId }: { userId: string; isSideBar: boolean; }) => {
    const member = TEAM[userId];
    if (!member) return null;

    return (
        <Section
            heading="SnoreClient"
            headingVariant="text-xs/medium"
            headingColor="text-default"
            className="vc-snore-team-section"
        >
            <div className="vc-snore-team-role">
                <img src={`${SNORE_SERVER_URL}/assets/icon.png`} alt="" className="vc-snore-team-icon" />
                <BaseText size="sm" weight="semibold">{member.role}</BaseText>
            </div>
            <ul className="vc-snore-team-contributions">
                {member.contributions.map(c => (
                    <li key={c}><BaseText size="sm" color="text-muted">{c}</BaseText></li>
                ))}
            </ul>
        </Section>
    );
}, { noop: true });

export default definePlugin({
    name: "SnoreTeam",
    description: "Shows the SnoreClient team's badges and a SnoreClient section on their profiles.",
    authors: [SnoreClientDevs.founder],
    dependencies: ["BadgeAPI", "ProfileSectionsAPI"],
    required: true,
    userProfileBadges: [founderBadge, discordBadges],
    renderProfileSection: {
        render: TeamSection,
        priority: 10,
    },
});
