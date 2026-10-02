/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { THEMES_DIR } from "@main/utils/constants";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

export async function saveTheme(_: unknown, fileName: string, css: string) {
    if (!/^[\w. -]+\.theme\.css$/.test(fileName)) throw new Error("Bad theme file name");
    await mkdir(THEMES_DIR, { recursive: true });
    await writeFile(join(THEMES_DIR, fileName), css, "utf8");
    return fileName;
}
