/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import { Paragraph } from "@components/Paragraph";
import { SnoreClientDevs } from "@utils/constants";
import { Margins } from "@utils/margins";
import definePlugin, { OptionType } from "@utils/types";
import { createRoot, React, showToast, TextInput, UserStore, useState } from "@webpack/common";

import { base32Encode, hashPassword, PasskeyRecord, PasswordRecord, randomBytes, registerPasskey, verifyPasskey, verifyPassword, verifyTotp } from "./crypto";

type Method = "password" | "totp" | "passkey";
interface LockConfig { method: Method; password?: PasswordRecord; totp?: string; passkey?: PasskeyRecord; }

const STORE_KEY = "snore-applock";
let config: LockConfig | null = null;
let locked = false;
let root: ReturnType<typeof createRoot> | undefined;
let host: HTMLDivElement | undefined;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let observer: MutationObserver | undefined;
let failures = 0;
let lockoutUntil = 0;

const settings = definePluginSettings({
    idleMinutes: {
        type: OptionType.SLIDER,
        description: "Lock again after this many minutes without input. 0 only locks on launch.",
        markers: [0, 1, 5, 10, 30, 60],
        default: 10,
        stickToMarkers: true,
    },
    lockOnBlur: { type: OptionType.BOOLEAN, description: "Lock whenever the Discord window loses focus.", default: false },
    setup: { type: OptionType.COMPONENT, description: "", component: () => <Setup /> },
});

async function load() {
    config = await DataStore.get<LockConfig>(STORE_KEY) ?? null;
}

async function save(next: LockConfig | null) {
    config = next;
    if (next) await DataStore.set(STORE_KEY, next); else await DataStore.del(STORE_KEY);
}

async function verify(input: string) {
    if (!config) return true;
    if (Date.now() < lockoutUntil) return false;
    let ok = false;
    if (config.method === "password" && config.password) ok = await verifyPassword(input, config.password);
    else if (config.method === "totp" && config.totp) ok = await verifyTotp(config.totp, input);
    else if (config.method === "passkey" && config.passkey) ok = await verifyPasskey(config.passkey).catch(() => false);
    if (!ok) {
        failures++;
        if (failures >= 5) { lockoutUntil = Date.now() + Math.min(5 * 60_000, 2 ** (failures - 5) * 10_000); }
    } else { failures = 0; lockoutUntil = 0; }
    return ok;
}

function swallow(e: Event) {
    if (!locked) return;
    const target = e.target as HTMLElement | null;
    if (host && target && host.contains(target)) return;
    e.stopImmediatePropagation();
    if (e instanceof KeyboardEvent && (e.ctrlKey || e.metaKey || e.altKey || e.key.startsWith("F"))) e.preventDefault();
}

const BLOCKED = ["keydown", "keyup", "keypress", "mousedown", "mouseup", "click", "contextmenu", "wheel", "touchstart", "paste", "drop"];

function LockScreen({ onUnlock }: { onUnlock: () => void; }) {
    const [value, setValue] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [shake, setShake] = useState(false);
    const method = config?.method ?? "password";

    async function submit() {
        if (busy) return;
        setBusy(true);
        const ok = await verify(value);
        setBusy(false);
        if (ok) { onUnlock(); return; }
        setValue("");
        setShake(true); setTimeout(() => setShake(false), 450);
        setError(Date.now() < lockoutUntil ? `Too many attempts. Try again in ${Math.ceil((lockoutUntil - Date.now()) / 1000)}s.` : method === "passkey" ? "Passkey check failed." : method === "totp" ? "Wrong code." : "Wrong password.");
    }

    React.useEffect(() => { if (method === "passkey") submit(); }, []);

    return (
        <div className="vc-applock" role="dialog" aria-modal="true">
            <div className={`vc-applock-card${shake ? " vc-applock-shake" : ""}`}>
                <img className="vc-applock-logo" src={`${SNORE_SERVER_URL}/assets/icon.png`} alt="" />
                <h2>Discord is locked</h2>
                <p>{method === "password" ? "Enter your SnoreClient password to continue." : method === "totp" ? "Enter the 6 digit code from your authenticator app." : "Use your passkey to continue."}</p>
                {method !== "passkey" && (
                    <input
                        autoFocus
                        type={method === "password" ? "password" : "text"}
                        inputMode={method === "totp" ? "numeric" : undefined}
                        placeholder={method === "password" ? "Password" : "000 000"}
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") submit(); }}
                    />
                )}
                <div className="vc-applock-error">{error}</div>
                <button onClick={submit} disabled={busy || (method !== "passkey" && !value)}>{method === "passkey" ? "Use passkey" : "Unlock"}</button>
            </div>
        </div>
    );
}

function mount() {
    if (host) return;
    host = document.createElement("div");
    host.id = "vc-applock-host";
    document.body.appendChild(host);
    root = createRoot(host);
    root.render(<LockScreen onUnlock={unlock} />);
    observer = new MutationObserver(() => { if (locked && host && !document.body.contains(host)) document.body.appendChild(host); });
    observer.observe(document.body, { childList: true });
}

function unmount() {
    observer?.disconnect(); observer = undefined;
    root?.unmount(); root = undefined;
    host?.remove(); host = undefined;
}

export function lock() {
    if (!config || locked) return;
    locked = true;
    document.body.classList.add("vc-applock-locked");
    mount();
}

function unlock() {
    locked = false;
    document.body.classList.remove("vc-applock-locked");
    unmount();
    armIdle();
}

function armIdle() {
    clearTimeout(idleTimer);
    const m = settings.store.idleMinutes;
    if (m > 0 && config) idleTimer = setTimeout(lock, m * 60_000);
}

function onActivity() { if (!locked) armIdle(); }
function onBlur() { if (settings.store.lockOnBlur) lock(); }
function onHotkey(e: KeyboardEvent) { if (e.ctrlKey && e.shiftKey && e.code === "KeyL" && config) { lock(); e.preventDefault(); } }

function Setup() {
    const [, rerender] = useState(0);
    const [method, setMethod] = useState<Method>(config?.method ?? "password");
    const [p1, setP1] = useState(""); const [p2, setP2] = useState("");
    const [secret] = useState(() => base32Encode(randomBytes(20)));
    const [code, setCode] = useState("");
    const [current, setCurrent] = useState("");
    const [msg, setMsg] = useState("");
    const user = UserStore.getCurrentUser();
    const uri = `otpauth://totp/SnoreClient:${encodeURIComponent(user?.username ?? "discord")}?secret=${secret}&issuer=SnoreClient&digits=6&period=30`;

    async function enable() {
        try {
            if (method === "password") {
                if (p1.length < 4) return setMsg("Use at least 4 characters.");
                if (p1 !== p2) return setMsg("Passwords do not match.");
                await save({ method, password: await hashPassword(p1) });
            } else if (method === "totp") {
                if (!await verifyTotp(secret, code)) return setMsg("That code does not match. Add the secret to your authenticator and enter the current code.");
                await save({ method, totp: secret });
            } else {
                await save({ method, passkey: await registerPasskey(user?.username ?? "discord") });
            }
            setMsg("Lock is on. Discord asks for it on every launch." + (settings.store.idleMinutes ? ` It also locks after ${settings.store.idleMinutes} min idle.` : ""));
            setP1(""); setP2(""); setCode("");
            armIdle();
            rerender(n => n + 1);
        } catch (e) {
            setMsg(`Could not set up: ${(e as Error).message}`);
        }
    }

    async function disable() {
        if (!await verify(current)) return setMsg(config?.method === "passkey" ? "Passkey check failed." : "Wrong password or code.");
        await save(null);
        setCurrent(""); setMsg("Lock removed.");
        clearTimeout(idleTimer);
        rerender(n => n + 1);
    }

    const Radio = ({ v, label }: { v: Method; label: string; }) => (
        <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
            <input type="radio" checked={method === v} onChange={() => setMethod(v)} /> <BaseText size="sm">{label}</BaseText>
        </label>
    );

    return (
        <div className="vc-applock-setup">
            {config ? (
                <>
                    <Paragraph>Lock is <b>on</b> using {config.method === "password" ? "a password" : config.method === "totp" ? "an authenticator app" : "a passkey"}. Press Ctrl+Shift+L to lock right now. There is no recovery: if you lose it, the only way back in is deleting SnoreClient's data folder.</Paragraph>
                    {config.method !== "passkey" && <TextInput type="password" value={current} onChange={setCurrent} placeholder={config.method === "totp" ? "Current authenticator code" : "Current password"} />}
                    <div style={{ display: "flex", gap: 8 }}>
                        <Button size="small" variant="secondary" onClick={lock}>Lock now</Button>
                        <Button size="small" variant="dangerSecondary" onClick={disable}>Remove lock</Button>
                    </div>
                </>
            ) : (
                <>
                    <Paragraph className={Margins.bottom8}>Pick how Discord should be unlocked. Messages stay hidden until you pass.</Paragraph>
                    <Radio v="password" label="Password" />
                    <Radio v="totp" label="Authenticator app (Google Authenticator, Authy, 1Password…)" />
                    <Radio v="passkey" label="Passkey (Windows Hello, Touch ID, security key)" />
                    {method === "password" && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <TextInput type="password" value={p1} onChange={setP1} placeholder="New password" />
                            <TextInput type="password" value={p2} onChange={setP2} placeholder="Repeat password" />
                        </div>
                    )}
                    {method === "totp" && (
                        <>
                            <BaseText size="sm">Add this secret to your authenticator app, then enter the code it shows:</BaseText>
                            <div className="vc-applock-secret">{secret.match(/.{1,4}/g)?.join(" ")}</div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <Button size="small" variant="secondary" onClick={() => { navigator.clipboard.writeText(uri); showToast("otpauth link copied"); }}>Copy otpauth link</Button>
                                <Button size="small" variant="secondary" onClick={() => { navigator.clipboard.writeText(secret); showToast("Secret copied"); }}>Copy secret</Button>
                            </div>
                            <TextInput value={code} onChange={setCode} placeholder="6 digit code" />
                        </>
                    )}
                    {method === "passkey" && <BaseText size="sm">Your device will ask you to create a passkey. It must support user verification (PIN, fingerprint or face).</BaseText>}
                    <Button size="small" onClick={enable}>Turn on lock</Button>
                </>
            )}
            {msg && <BaseText size="sm" color="text-muted">{msg}</BaseText>}
        </div>
    );
}

export default definePlugin({
    name: "AppLock",
    description: "Lock Discord behind a password, an authenticator code or a passkey. It asks on every launch, optionally after idle time or when the window loses focus, and hides all content until you unlock. Ctrl+Shift+L locks instantly.",
    authors: [SnoreClientDevs.founder],
    settings,

    async start() {
        await load();
        for (const ev of BLOCKED) window.addEventListener(ev, swallow, true);
        for (const ev of ["mousemove", "keydown", "mousedown", "wheel"]) window.addEventListener(ev, onActivity, true);
        window.addEventListener("blur", onBlur);
        window.addEventListener("keydown", onHotkey);
        if (config) lock(); else armIdle();
    },

    stop() {
        for (const ev of BLOCKED) window.removeEventListener(ev, swallow, true);
        for (const ev of ["mousemove", "keydown", "mousedown", "wheel"]) window.removeEventListener(ev, onActivity, true);
        window.removeEventListener("blur", onBlur);
        window.removeEventListener("keydown", onHotkey);
        clearTimeout(idleTimer);
        if (!locked) unmount();
    },
});
