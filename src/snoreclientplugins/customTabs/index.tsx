/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { WebsiteIcon } from "@components/Icons";
import { SettingsTab } from "@components/settings/tabs/BaseTab";
import SettingsPlugin from "@plugins/_core/settings";
import { SnoreClientDevs } from "@utils/constants";
import { removeFromArray } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";

const PREFIX = "snoreclient_custom_tab_";

const settings = definePluginSettings({
    tabs: {
        type: OptionType.STRING,
        description: "One tab per line as  Title | https://url . Each becomes its own page in SnoreClient settings.",
        default: "SnoreClient site | https://snore.pw\nPlugins | https://snore.pw/plugins",
        multiline: true,
        onChange: register,
    },
});

function parse() {
    return settings.store.tabs.split("\n").map(l => {
        const [title, url] = l.split("|").map(s => s.trim());
        return title && url && /^https?:\/\//.test(url) ? { title, url } : null;
    }).filter((t): t is { title: string; url: string; } => t !== null);
}

function unregister() {
    removeFromArray(SettingsPlugin.customEntries, e => e.key.startsWith(PREFIX));
}

function register() {
    unregister();
    parse().forEach((tab, i) => {
        SettingsPlugin.customEntries.push({
            key: `${PREFIX}${i}`,
            title: tab.title,
            Component: () => (
                <SettingsTab>
                    <iframe
                        src={tab.url}
                        title={tab.title}
                        style={{ width: "100%", height: "calc(100vh - 120px)", border: "1px solid var(--border-subtle)", borderRadius: 12, background: "var(--background-base-lowest)" }}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                </SettingsTab>
            ),
            Icon: WebsiteIcon,
        });
    });
}

export default definePlugin({
    name: "CustomTabs",
    description: "Add your own pages to SnoreClient settings: any website shows up as a tab, like a dashboard, a wiki, or your bot panel.",
    authors: [SnoreClientDevs.founder],
    settings,
    start: register,
    stop: unregister,
});
