/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./SnoreHero.css";

import { useSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { SnoreLogo } from "@components/SnoreLogo";
import { gitHashShort, gitRemote } from "@shared/vencordUserAgent";
import { classNameFactory } from "@utils/css";
import { SettingsRouter } from "@webpack/common";

const cl = classNameFactory("vc-snore-");

const platform = IS_WEB
    ? (IS_EXTENSION ? "Browser Extension" : IS_USERSCRIPT ? "Userscript" : "Web")
    : IS_EQUIBOP ? "Equibop" : IS_VESKTOP ? "Vesktop" : "Discord Desktop";

export function SnoreHero() {
    const { cloud } = useSettings(["cloud.authenticated", "cloud.url"]);
    let cloudHost = "cloud off";
    try {
        if (cloud.authenticated) cloudHost = new URL(cloud.url).host;
    } catch { }

    return (
        <div className={cl("hero")}>
            <SnoreLogo size={64} className={cl("hero-logo")} />
            <div className={cl("hero-body")}>
                <span className={cl("hero-title")}>SnoreClient</span>
                <span className={cl("hero-tagline")}>Discord, but cozier. Plugins, themes and your own cloud.</span>
                <div className={cl("hero-badges")}>
                    <span className={cl("badge")}>v{VERSION}</span>
                    <span className={cl("badge")}>{gitHashShort}</span>
                    <span className={cl("badge")}>{platform}</span>
                    <span className={cl("badge")}>
                        <span className={cl("badge-dot", { "badge-dot-off": !cloud.authenticated })} />
                        {cloudHost}
                    </span>
                </div>
            </div>
            <div className={cl("hero-actions")}>
                <Button size="small" variant="secondary" onClick={() => SettingsRouter.openUserSettings("snoreclient_cloud_panel")}>Cloud</Button>
                <Button size="small" variant="secondary" onClick={() => VencordNative.native.openExternal(`https://github.com/${gitRemote}`)}>GitHub</Button>
            </div>
        </div>
    );
}
