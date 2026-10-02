/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SETTINGS_DIR } from "@main/utils/constants";
import { shell } from "electron";
import { appendFile, readFile } from "fs/promises";
import { join } from "path";

const LOG_FILE = join(SETTINGS_DIR, "ghostpings.txt");

export async function appendLine(_: unknown, line: string) {
    await appendFile(LOG_FILE, line + "\n", "utf8");
}

export async function readLog() {
    return readFile(LOG_FILE, "utf8").catch(() => "");
}

export function getPath() {
    return LOG_FILE;
}

export function openLog() {
    shell.showItemInFolder(LOG_FILE);
}
