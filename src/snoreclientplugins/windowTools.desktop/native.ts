/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BrowserWindow, type IpcMainInvokeEvent } from "electron";

const win = (e: IpcMainInvokeEvent) => BrowserWindow.fromWebContents(e.sender);

export function setAlwaysOnTop(e: IpcMainInvokeEvent, on: boolean) {
    win(e)?.setAlwaysOnTop(on, "floating");
}

export function setOpacity(e: IpcMainInvokeEvent, opacity: number) {
    win(e)?.setOpacity(Math.min(1, Math.max(0.2, opacity)));
}

export function toggleMini(e: IpcMainInvokeEvent, width: number, height: number) {
    const w = win(e);
    if (!w) return false;
    const [cw, ch] = w.getSize();
    const mini = cw <= width + 40 && ch <= height + 40;
    if (mini) {
        w.unmaximize();
        w.setSize(1280, 800, true);
        w.center();
    } else {
        w.unmaximize();
        w.setSize(width, height, true);
    }
    return !mini;
}

export function minimizeToTray(e: IpcMainInvokeEvent) {
    win(e)?.hide();
}
