/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import * as DataStore from "@api/DataStore";
import { Settings } from "@api/Settings";
import { Button } from "@components/Button";
import { Heading } from "@components/Heading";
import { PaintbrushIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab } from "@components/settings/tabs/BaseTab";
import SettingsPlugin from "@plugins/_core/settings";
import { SnoreClientDevs } from "@utils/constants";
import { copyWithToast } from "@utils/discord";
import { Margins } from "@utils/margins";
import { removeFromArray } from "@utils/misc";
import definePlugin, { PluginNative } from "@utils/types";
import { showToast, useEffect, useState } from "@webpack/common";

const Native = IS_WEB ? null : VencordNative.pluginHelpers.ThemeBuilder as PluginNative<typeof import("./native")>;
const STORE_KEY = "ThemeBuilder_draft";
const PREVIEW_ID = "vc-theme-builder-preview";
const ENTRY_KEY = "snoreclient_theme_builder";

interface Draft {
    name: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    font: string;
    radius: number;
    glass: number;
    image: string;
    imageDim: number;
}

const DEFAULT: Draft = {
    name: "My SnoreClient theme",
    accent: "#a78bfa",
    background: "#12101d",
    surface: "#1a1729",
    text: "#f3f0ff",
    font: "",
    radius: 10,
    glass: 0,
    image: "",
    imageDim: 60,
};

const FONTS = ["", "Inter", "Segoe UI", "Roboto", "Poppins", "Nunito", "JetBrains Mono", "Comic Sans MS", "Georgia"];

function hexToRgb(hex: string) {
    const n = parseInt(hex.slice(1), 16);
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function shade(hex: string, amount: number) {
    const n = parseInt(hex.slice(1), 16);
    const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amount)));
    const r = c((n >> 16) & 255), g = c((n >> 8) & 255), b = c(n & 255);
    return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

export function buildCss(d: Draft) {
    const bg = d.image ? `rgba(${hexToRgb(d.background)}, ${d.imageDim / 100})` : d.background;
    const lower = d.image ? `rgba(${hexToRgb(shade(d.background, -8))}, ${Math.min(1, d.imageDim / 100 + 0.1)})` : shade(d.background, -8);
    const lowest = d.image ? `rgba(${hexToRgb(shade(d.background, -16))}, ${Math.min(1, d.imageDim / 100 + 0.15)})` : shade(d.background, -16);
    const glass = d.glass ? `backdrop-filter: blur(${d.glass}px);` : "";
    return `/**
 * @name ${d.name}
 * @author SnoreClient Theme Builder
 * @description Built with the SnoreClient theme builder.
 * @version 1.0.0
 */

:root, .theme-dark, .theme-light {
    --brand-500: ${d.accent};
    --brand-560: ${shade(d.accent, -20)};
    --brand-600: ${shade(d.accent, -35)};
    --brand-experiment: ${d.accent};
    --snore-accent: ${d.accent};
    --text-link: ${shade(d.accent, 30)};
    --background-base-low: ${d.surface};
    --background-base-lower: ${lower};
    --background-base-lowest: ${lowest};
    --background-primary: ${bg};
    --background-secondary: ${lower};
    --background-secondary-alt: ${lower};
    --background-tertiary: ${lowest};
    --card-background-default: ${d.surface};
    --text-default: ${d.text};
    --text-normal: ${d.text};
    --header-primary: ${d.text};
    --radius-xs: ${Math.round(d.radius * 0.4)}px;
    --radius-sm: ${Math.round(d.radius * 0.7)}px;
    --radius-md: ${d.radius}px;
    --radius-lg: ${Math.round(d.radius * 1.4)}px;
    ${d.font ? `--font-primary: "${d.font}", sans-serif;\n    --font-display: "${d.font}", sans-serif;` : ""}
}
${d.image ? `
#app-mount {
    background: url("${d.image}") center / cover no-repeat fixed;
}

[class*="chat_"], [class*="sidebar_"], [class*="guilds_"], [class*="panels_"], [class*="membersWrap_"], [class*="content_"] > [class*="chat"] {
    background: ${bg};
    ${glass}
}
` : glass ? `
[class*="sidebar_"], [class*="panels_"], [class*="membersWrap_"] {
    ${glass}
}
` : ""}
`;
}

function Field({ label, children, value }: { label: string; children: React.ReactNode; value?: string; }) {
    return (
        <div className="vc-tb-field">
            <label>{label}{value !== undefined && <span className="vc-tb-value"> · {value}</span>}</label>
            {children}
        </div>
    );
}

function ThemeBuilderTab() {
    const [draft, setDraft] = useState<Draft>(DEFAULT);
    const [preview, setPreview] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        DataStore.get<Draft>(STORE_KEY).then(d => {
            if (d) setDraft({ ...DEFAULT, ...d });
            setLoaded(true);
        });
        return () => document.getElementById(PREVIEW_ID)?.remove();
    }, []);

    useEffect(() => {
        if (!loaded) return;
        DataStore.set(STORE_KEY, draft);
        let el = document.getElementById(PREVIEW_ID) as HTMLStyleElement | null;
        if (!preview) {
            el?.remove();
            return;
        }
        if (!el) {
            el = document.createElement("style");
            el.id = PREVIEW_ID;
            document.head.appendChild(el);
        }
        el.textContent = buildCss(draft);
    }, [draft, preview, loaded]);

    const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft(d => ({ ...d, [k]: v }));
    const css = buildCss(draft);
    const fileName = `${draft.name.replace(/[^\w -]/g, "").trim() || "SnoreClient"}.theme.css`;

    async function apply() {
        try {
            if (Native) await Native.saveTheme(fileName, css);
            else await VencordNative.themes.uploadTheme(fileName, css);
            if (!Settings.enabledThemes.includes(fileName)) Settings.enabledThemes = [...Settings.enabledThemes, fileName];
            setPreview(false);
            showToast(`Theme "${draft.name}" saved and enabled.`);
        } catch (e) {
            showToast(`Could not save theme: ${e}`);
        }
    }

    function download() {
        const blob = new Blob([css], { type: "text/css" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    return (
        <SettingsTab>
            <Heading className={Margins.top16}>Theme Builder</Heading>
            <Paragraph className={Margins.bottom8}>
                Build a full theme without writing CSS. Turn on live preview, tweak the controls, then apply it as a real theme file that shows up under Themes, or download it to share.
            </Paragraph>

            <div className="vc-tb-actions">
                <Button size="small" variant={preview ? "primary" : "secondary"} onClick={() => setPreview(p => !p)}>{preview ? "Live preview on" : "Live preview off"}</Button>
                <Button size="small" onClick={apply}>Apply as theme</Button>
                <Button size="small" variant="secondary" onClick={download}>Download .theme.css</Button>
                <Button size="small" variant="secondary" onClick={() => copyWithToast(css, "CSS copied")}>Copy CSS</Button>
                <Button size="small" variant="dangerSecondary" onClick={() => setDraft(DEFAULT)}>Reset</Button>
            </div>

            <div className="vc-tb-grid">
                <Field label="Theme name"><input type="text" value={draft.name} onChange={e => set("name", e.target.value)} /></Field>
                <Field label="Accent" value={draft.accent}><input type="color" value={draft.accent} onChange={e => set("accent", e.target.value)} /></Field>
                <Field label="Background" value={draft.background}><input type="color" value={draft.background} onChange={e => set("background", e.target.value)} /></Field>
                <Field label="Cards and surfaces" value={draft.surface}><input type="color" value={draft.surface} onChange={e => set("surface", e.target.value)} /></Field>
                <Field label="Text" value={draft.text}><input type="color" value={draft.text} onChange={e => set("text", e.target.value)} /></Field>
                <Field label="Font">
                    <select value={draft.font} onChange={e => set("font", e.target.value)}>
                        {FONTS.map(f => <option key={f} value={f}>{f || "Discord default"}</option>)}
                    </select>
                </Field>
                <Field label="Corner radius" value={`${draft.radius}px`}><input type="range" min={0} max={24} value={draft.radius} onChange={e => set("radius", Number(e.target.value))} /></Field>
                <Field label="Glass blur" value={draft.glass ? `${draft.glass}px` : "off"}><input type="range" min={0} max={30} value={draft.glass} onChange={e => set("glass", Number(e.target.value))} /></Field>
                <Field label="Background image URL"><input type="text" placeholder="https://…/wallpaper.png" value={draft.image} onChange={e => set("image", e.target.value.trim())} /></Field>
                <Field label="Image dimming" value={`${draft.imageDim}%`}><input type="range" min={0} max={100} value={draft.imageDim} onChange={e => set("imageDim", Number(e.target.value))} /></Field>
            </div>

            <Heading>Generated CSS</Heading>
            <textarea className="vc-tb-css" readOnly value={css} />
        </SettingsTab>
    );
}

export default definePlugin({
    name: "ThemeBuilder",
    description: "Adds a Theme Builder tab: pick colors, font, corner radius, glass blur and a wallpaper, preview live, then save it as a theme or download it to share.",
    authors: [SnoreClientDevs.founder],
    enabledByDefault: true,

    start() {
        SettingsPlugin.customEntries.push({
            key: ENTRY_KEY,
            title: "Theme Builder",
            Component: ThemeBuilderTab,
            Icon: PaintbrushIcon,
        });
    },

    stop() {
        removeFromArray(SettingsPlugin.customEntries, e => e.key === ENTRY_KEY);
        document.getElementById(PREVIEW_ID)?.remove();
    },
});
