/*
 * SnoreClient server
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { users } from "./db.js";

export const hashSecret = secret => createHash("sha256").update(secret).digest("hex");

export const newSecret = () => randomBytes(32).toString("base64url");

/**
 * Vencord style auth: the Authorization header is base64("<secret>:<userId>"),
 * optionally prefixed with "Basic ". Returns the user row or null.
 */
export function authenticate(req) {
    const header = req.headers.authorization;
    if (!header) return null;

    const token = header.startsWith("Basic ") ? header.slice(6) : header;
    let decoded;
    try {
        decoded = Buffer.from(token, "base64").toString("utf8");
    } catch {
        return null;
    }

    const sep = decoded.lastIndexOf(":");
    if (sep === -1) return null;

    const secret = decoded.slice(0, sep);
    const userId = decoded.slice(sep + 1);
    if (!secret || !/^\d{15,22}$/.test(userId)) return null;

    const user = users.get(userId);
    if (!user) return null;

    const expected = Buffer.from(user.secret_hash, "hex");
    const actual = Buffer.from(hashSecret(secret), "hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

    users.touch(userId);
    return user;
}
