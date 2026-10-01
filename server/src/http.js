/*
 * SnoreClient server
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { config } from "./config.js";

export class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

export function json(res, status, body, headers = {}) {
    const data = JSON.stringify(body);
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(data),
        ...headers,
    });
    res.end(data);
}

export function html(res, status, body, headers = {}) {
    res.writeHead(status, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        ...headers,
    });
    res.end(body);
}

export function empty(res, status, headers = {}) {
    res.writeHead(status, headers);
    res.end();
}

export function redirect(res, location) {
    res.writeHead(302, { Location: location });
    res.end();
}

export function readBody(req, limit = config.maxBlobBytes) {
    return new Promise((resolve, reject) => {
        const declared = Number(req.headers["content-length"] || 0);
        if (declared > limit) return reject(new HttpError(413, "Payload too large"));

        const chunks = [];
        let size = 0;
        req.on("data", chunk => {
            size += chunk.length;
            if (size > limit) {
                reject(new HttpError(413, "Payload too large"));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
    });
}

export async function readJson(req, limit) {
    const buf = await readBody(req, limit);
    if (!buf.length) throw new HttpError(400, "Expected a JSON body");
    try {
        return JSON.parse(buf.toString("utf8"));
    } catch {
        throw new HttpError(400, "Malformed JSON body");
    }
}

export function clientIp(req) {
    if (config.trustProxy) {
        const fwd = req.headers["x-forwarded-for"];
        if (typeof fwd === "string" && fwd) return fwd.split(",")[0].trim();
    }
    return req.socket.remoteAddress || "unknown";
}

const buckets = new Map();

export function rateLimited(req) {
    const now = Date.now();
    const ip = clientIp(req);
    const bucket = buckets.get(ip) ?? { start: now, count: 0 };
    if (now - bucket.start > 60_000) {
        bucket.start = now;
        bucket.count = 0;
    }
    bucket.count++;
    buckets.set(ip, bucket);
    if (buckets.size > 10_000) {
        for (const [key, b] of buckets) if (now - b.start > 60_000) buckets.delete(key);
    }
    return bucket.count > config.rateLimitPerMinute;
}

export const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, If-None-Match",
    "Access-Control-Expose-Headers": "ETag",
    "Access-Control-Max-Age": "86400",
};
