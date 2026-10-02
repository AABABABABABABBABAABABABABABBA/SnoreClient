CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    secret_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings_v1 (
    user_id TEXT PRIMARY KEY,
    written INTEGER NOT NULL,
    data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS data_v2 (
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    version INTEGER NOT NULL,
    checksum TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, key)
);

CREATE TABLE IF NOT EXISTS profiles (
    user_id TEXT PRIMARY KEY,
    avatar TEXT,
    global_name TEXT,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS data_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    version INTEGER NOT NULL,
    checksum TEXT NOT NULL,
    value TEXT NOT NULL,
    saved_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS data_history_user ON data_history(user_id, key, saved_at);
