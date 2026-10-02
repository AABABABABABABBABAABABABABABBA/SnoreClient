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

    CREATE TABLE IF NOT EXISTS profiles (
        user_id TEXT PRIMARY KEY,
        avatar TEXT,
        global_name TEXT,
        updated_at INTEGER NOT NULL
    );

    -- previous versions of the settings key, for restore from the dashboard
    CREATE TABLE IF NOT EXISTS data_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        key TEXT NOT NULL,
        version INTEGER NOT NULL,
        checksum TEXT NOT NULL,
        value BLOB NOT NULL,
        saved_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS data_history_user ON data_history(user_id, key, saved_at);

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
    listAccounts: db.prepare(`
        SELECT u.id, u.username, u.created_at, u.last_seen_at,
               (SELECT COUNT(*) FROM data_v2 d WHERE d.user_id = u.id) + (SELECT COUNT(*) FROM settings_v1 s WHERE s.user_id = u.id) AS data_count
        FROM users u ORDER BY u.last_seen_at DESC
    `),

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
    entriesV2: db.prepare("SELECT key, version, checksum, length(value) AS size, updated_at FROM data_v2 WHERE user_id = ? ORDER BY key"),
    addHistory: db.prepare("INSERT INTO data_history (user_id, key, version, checksum, value, saved_at) VALUES (?, ?, ?, ?, ?, ?)"),
    trimHistory: db.prepare("DELETE FROM data_history WHERE user_id = ? AND key = ? AND id NOT IN (SELECT id FROM data_history WHERE user_id = ? AND key = ? ORDER BY saved_at DESC LIMIT 8)"),
    listHistory: db.prepare("SELECT id, version, checksum, length(value) AS size, saved_at FROM data_history WHERE user_id = ? AND key = ? ORDER BY saved_at DESC"),
    getHistory: db.prepare("SELECT value, checksum FROM data_history WHERE id = ? AND user_id = ?"),
    deleteHistory: db.prepare("DELETE FROM data_history WHERE user_id = ?"),
    rotateSecret: db.prepare("UPDATE users SET secret_hash = ? WHERE id = ?"),
    deleteAllV2: db.prepare("DELETE FROM data_v2 WHERE user_id = ?"),
    upsertProfile: db.prepare(`
        INSERT INTO profiles (user_id, avatar, global_name, updated_at) VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET avatar = excluded.avatar, global_name = excluded.global_name, updated_at = excluded.updated_at
    `),
    getProfile: db.prepare("SELECT avatar, global_name FROM profiles WHERE user_id = ?"),
    deleteProfile: db.prepare("DELETE FROM profiles WHERE user_id = ?"),
};

export const profiles = {
    upsert: (userId, avatar, globalName) => stmts.upsertProfile.run(userId, avatar ?? null, globalName ?? null, Date.now()),
    get: userId => stmts.getProfile.get(userId),
    delete: userId => stmts.deleteProfile.run(userId),
};

export const users = {
    get: id => stmts.getUser.get(id),
    upsert: (id, username, secretHash) => {
        const now = Date.now();
        stmts.upsertUser.run(id, username, secretHash, now, now);
    },
    touch: id => stmts.touchUser.run(Date.now(), id),
    delete: id => stmts.deleteUser.run(id),
    rotateSecret: (id, hash) => stmts.rotateSecret.run(hash, id),
    count: () => stmts.countUsers.get().n,
    list: () => stmts.listAccounts.all().map(r => ({ ...r, data_count: Number(r.data_count) })),
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
        if (key === "settings") {
            const prev = stmts.getV2.get(userId, key);
            if (prev && prev.checksum !== checksum) {
                stmts.addHistory.run(userId, key, prev.version, prev.checksum, prev.value, Date.now());
                stmts.trimHistory.run(userId, key, userId, key);
            }
        }
        stmts.putV2.run(userId, key, checksum, value, Date.now());
        return stmts.getV2.get(userId, key);
    },
    history: (userId, key) => stmts.listHistory.all(userId, key).map(h => ({ ...h, size: Number(h.size) })),
    historyEntry: (id, userId) => stmts.getHistory.get(id, userId),
    deleteHistory: userId => stmts.deleteHistory.run(userId),
    delete: (userId, key) => stmts.deleteV2.run(userId, key).changes > 0,
    entries: userId => stmts.entriesV2.all(userId).map(e => ({ ...e, size: Number(e.size) })),
    deleteAll: userId => stmts.deleteAllV2.run(userId),
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
