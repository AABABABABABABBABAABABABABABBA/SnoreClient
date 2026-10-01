/*
 * SnoreClient server
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { config } from "./config.js";

mkdirSync(config.dataDir, { recursive: true });

export const db = new DatabaseSync(join(config.dataDir, "snoreclient.sqlite"));

db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        secret_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL
    );

    -- v1 protocol: a single compressed settings blob per user
    CREATE TABLE IF NOT EXISTS settings_v1 (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        written INTEGER NOT NULL,
        data BLOB NOT NULL
    );

    -- v2 protocol: keyed values with versions and checksums
    CREATE TABLE IF NOT EXISTS data_v2 (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        version INTEGER NOT NULL,
        checksum TEXT NOT NULL,
        value BLOB NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, key)
    );
`);

const stmts = {
    getUser: db.prepare("SELECT * FROM users WHERE id = ?"),
    upsertUser: db.prepare(`
        INSERT INTO users (id, username, secret_hash, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET username = excluded.username, secret_hash = excluded.secret_hash, last_seen_at = excluded.last_seen_at
    `),
    touchUser: db.prepare("UPDATE users SET last_seen_at = ? WHERE id = ?"),
    deleteUser: db.prepare("DELETE FROM users WHERE id = ?"),
    countUsers: db.prepare("SELECT COUNT(*) AS n FROM users"),

    getV1: db.prepare("SELECT written, data FROM settings_v1 WHERE user_id = ?"),
    putV1: db.prepare(`
        INSERT INTO settings_v1 (user_id, written, data) VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET written = excluded.written, data = excluded.data
    `),
    deleteV1: db.prepare("DELETE FROM settings_v1 WHERE user_id = ?"),

    manifestV2: db.prepare("SELECT key, version, checksum FROM data_v2 WHERE user_id = ? ORDER BY key"),
    getV2: db.prepare("SELECT key, version, checksum, value FROM data_v2 WHERE user_id = ? AND key = ?"),
    allV2: db.prepare("SELECT key, version, checksum, value FROM data_v2 WHERE user_id = ?"),
    countV2: db.prepare("SELECT COUNT(*) AS n FROM data_v2 WHERE user_id = ?"),
    putV2: db.prepare(`
        INSERT INTO data_v2 (user_id, key, version, checksum, value, updated_at) VALUES (?, ?, 1, ?, ?, ?)
        ON CONFLICT(user_id, key) DO UPDATE SET version = data_v2.version + 1, checksum = excluded.checksum, value = excluded.value, updated_at = excluded.updated_at
    `),
    deleteV2: db.prepare("DELETE FROM data_v2 WHERE user_id = ? AND key = ?"),
};

export const users = {
    get: id => stmts.getUser.get(id),
    upsert: (id, username, secretHash) => {
        const now = Date.now();
        stmts.upsertUser.run(id, username, secretHash, now, now);
    },
    touch: id => stmts.touchUser.run(Date.now(), id),
    delete: id => stmts.deleteUser.run(id),
    count: () => stmts.countUsers.get().n,
};

export const settingsV1 = {
    get: userId => stmts.getV1.get(userId),
    put: (userId, data) => {
        const written = Date.now();
        stmts.putV1.run(userId, written, data);
        return written;
    },
    delete: userId => stmts.deleteV1.run(userId),
};

export const dataV2 = {
    manifest: userId => stmts.manifestV2.all(userId),
    get: (userId, key) => stmts.getV2.get(userId, key),
    all: userId => stmts.allV2.all(userId),
    count: userId => stmts.countV2.get(userId).n,
    put: (userId, key, checksum, value) => {
        stmts.putV2.run(userId, key, checksum, value, Date.now());
        return stmts.getV2.get(userId, key);
    },
    delete: (userId, key) => stmts.deleteV2.run(userId, key).changes > 0,
};

export const transaction = fn => {
    db.exec("BEGIN");
    try {
        const result = fn();
        db.exec("COMMIT");
        return result;
    } catch (e) {
        db.exec("ROLLBACK");
        throw e;
    }
};
