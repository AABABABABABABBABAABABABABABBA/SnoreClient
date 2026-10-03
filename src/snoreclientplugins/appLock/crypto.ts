/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const enc = new TextEncoder();

export function randomBytes(n: number) {
    return crypto.getRandomValues(new Uint8Array(n));
}

export function toHex(b: ArrayBuffer | Uint8Array) {
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}

export function fromHex(h: string) {
    return new Uint8Array((h.match(/../g) ?? []).map(x => parseInt(x, 16)));
}

export function toB64(b: ArrayBuffer | Uint8Array) {
    return btoa(String.fromCharCode(...new Uint8Array(b)));
}

export function fromB64(s: string) {
    return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

export function toB64Url(b: ArrayBuffer | Uint8Array) {
    return toB64(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromB64Url(s: string) {
    return fromB64(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - s.length % 4) % 4));
}

export interface PasswordRecord { salt: string; iterations: number; hash: string; }

export async function hashPassword(password: string, salt = toHex(randomBytes(16)), iterations = 310_000): Promise<PasswordRecord> {
    const key = await crypto.subtle.importKey("raw", enc.encode(password.normalize("NFKC")), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: fromHex(salt), iterations, hash: "SHA-256" }, key, 256);
    return { salt, iterations, hash: toHex(bits) };
}

export async function verifyPassword(password: string, rec: PasswordRecord) {
    const { hash } = await hashPassword(password, rec.salt, rec.iterations);
    return timingSafeEqual(hash, rec.hash);
}

function timingSafeEqual(a: string, b: string) {
    if (a.length !== b.length) return false;
    let r = 0;
    for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return r === 0;
}

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Uint8Array) {
    let bits = 0, value = 0, out = "";
    for (const b of bytes) {
        value = (value << 8) | b; bits += 8;
        while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
    }
    if (bits > 0) out += B32[(value << (5 - bits)) & 31];
    return out;
}

export function base32Decode(s: string) {
    let bits = 0, value = 0;
    const out: number[] = [];
    for (const c of s.toUpperCase().replace(/[^A-Z2-7]/g, "")) {
        value = (value << 5) | B32.indexOf(c); bits += 5;
        if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
    }
    return new Uint8Array(out);
}

export async function totp(secretB32: string, step = 30, digits = 6, at = Date.now()) {
    const counter = Math.floor(at / 1000 / step);
    const buf = new ArrayBuffer(8);
    new DataView(buf).setUint32(4, counter);
    const key = await crypto.subtle.importKey("raw", base32Decode(secretB32), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf));
    const offset = mac[mac.length - 1] & 15;
    const code = ((mac[offset] & 127) << 24 | mac[offset + 1] << 16 | mac[offset + 2] << 8 | mac[offset + 3]) % 10 ** digits;
    return code.toString().padStart(digits, "0");
}

export async function verifyTotp(secretB32: string, code: string) {
    const c = code.replace(/\s/g, "");
    for (const drift of [0, -1, 1]) if (timingSafeEqual(await totp(secretB32, 30, 6, Date.now() + drift * 30_000), c)) return true;
    return false;
}

export interface PasskeyRecord { credentialId: string; publicKey: string; alg: number; }

export async function registerPasskey(username: string): Promise<PasskeyRecord> {
    const cred = await navigator.credentials.create({
        publicKey: {
            challenge: randomBytes(32),
            rp: { name: "SnoreClient App Lock" },
            user: { id: randomBytes(16), name: username, displayName: username },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
            authenticatorSelection: { userVerification: "required", residentKey: "preferred" },
            timeout: 60_000,
        },
    }) as PublicKeyCredential | null;
    if (!cred) throw new Error("No passkey was created");
    const att = cred.response as AuthenticatorAttestationResponse;
    const pk = att.getPublicKey();
    if (!pk) throw new Error("Authenticator did not return a public key");
    return { credentialId: toB64Url(cred.rawId), publicKey: toB64(pk), alg: att.getPublicKeyAlgorithm() };
}

export async function verifyPasskey(rec: PasskeyRecord) {
    const challenge = randomBytes(32);
    const cred = await navigator.credentials.get({
        publicKey: { challenge, allowCredentials: [{ type: "public-key", id: fromB64Url(rec.credentialId) }], userVerification: "required", timeout: 60_000 },
    }) as PublicKeyCredential | null;
    if (!cred) return false;
    const res = cred.response as AuthenticatorAssertionResponse;
    const clientData = JSON.parse(new TextDecoder().decode(res.clientDataJSON));
    if (clientData.type !== "webauthn.get" || clientData.challenge !== toB64Url(challenge)) return false;
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", res.clientDataJSON));
    const auth = new Uint8Array(res.authenticatorData);
    const signed = new Uint8Array(auth.length + hash.length);
    signed.set(auth); signed.set(hash, auth.length);
    if (rec.alg === -7) {
        const key = await crypto.subtle.importKey("spki", fromB64(rec.publicKey), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
        return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, derToRaw(new Uint8Array(res.signature)), signed);
    }
    const key = await crypto.subtle.importKey("spki", fromB64(rec.publicKey), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    return crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, res.signature, signed);
}

function derToRaw(der: Uint8Array) {
    const read = (offset: number) => {
        let len = der[offset + 1];
        let start = offset + 2;
        if (len & 0x80) { const n = len & 0x7f; len = 0; for (let i = 0; i < n; i++) len = (len << 8) | der[start + i]; start += n; }
        return { start, len };
    };
    const seq = read(0);
    const r = read(seq.start);
    const s = read(r.start + r.len);
    const out = new Uint8Array(64);
    const rv = der.slice(r.start, r.start + r.len).slice(-32);
    const sv = der.slice(s.start, s.start + s.len).slice(-32);
    out.set(rv, 32 - rv.length);
    out.set(sv, 64 - sv.length);
    return out;
}
