/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Paragraph } from "@components/Paragraph";
import { SnoreClientDevs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import { Margins } from "@utils/margins";
import definePlugin, { OptionType } from "@utils/types";
import { RenderModalProps, User } from "@vencord/discord-types";
import { ConfirmModal, Menu, openModal, SelectedChannelStore, TextInput, useState } from "@webpack/common";

const settings = definePluginSettings({
    template: {
        type: OptionType.STRING,
        description: "Command to send. {id} is replaced with the user id, {reason} with the reason you type.",
        default: ",warn {id} {reason}",
    },
    channel: {
        type: OptionType.SELECT,
        description: "Where to send the command.",
        options: [
            { label: "The channel I'm currently viewing", value: "current", default: true },
            { label: "A fixed channel (set the id below)", value: "fixed" },
        ],
    },
    channelId: {
        type: OptionType.STRING,
        description: "Channel id used when \"A fixed channel\" is selected.",
        default: "",
    },
});

const WarnIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path d="M10.3 3.6a2 2 0 0 1 3.4 0l8.4 14.3A2 2 0 0 1 20.4 21H3.6a2 2 0 0 1-1.7-3.1l8.4-14.3ZM12 8a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0V9a1 1 0 0 0-1-1Zm0 10a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" />
    </svg>
);

function targetChannelId() {
    if (settings.store.channel === "fixed" && settings.store.channelId) return settings.store.channelId;
    return SelectedChannelStore.getChannelId();
}

function QuickWarnModal({ user, modalProps }: { user: User; modalProps: RenderModalProps; }) {
    const [reason, setReason] = useState("");
    const preview = settings.store.template.replace("{id}", user.id).replace("{reason}", reason || "…");

    return (
        <ConfirmModal
            {...modalProps}
            title={`Warn ${user.username}`}
            subtitle={`User id ${user.id} is filled in for you. Type the reason and press Warn.`}
            confirmText="Warn"
            variant="critical"
            onConfirm={setError => {
                if (!reason.trim()) {
                    setError("Enter a reason first.");
                    throw new Error();
                }
                const channelId = targetChannelId();
                if (!channelId) {
                    setError("Open a text channel first, or set a fixed channel in the plugin settings.");
                    throw new Error();
                }
                sendMessage(channelId, { content: settings.store.template.replace("{id}", user.id).replace("{reason}", reason.trim()) });
            }}
        >
            <TextInput
                autoFocus
                placeholder="Reason for the warn"
                value={reason}
                onChange={setReason}
            />
            <Paragraph className={Margins.top8} color="text-muted">Will send: <code>{preview}</code></Paragraph>
        </ConfirmModal>
    );
}

const userContextMenu: NavContextMenuPatchCallback = (children, { user }: { user?: User; }) => {
    if (!user?.id) return;
    children.push(
        <Menu.MenuItem
            id="vc-quick-warn"
            label="Quick Warn"
            color="danger"
            icon={WarnIcon}
            action={() => openModal(modalProps => <QuickWarnModal user={user} modalProps={modalProps} />)}
        />
    );
};

export default definePlugin({
    name: "QuickWarn",
    description: "Adds Quick Warn to user right click menus. Fills in their user id, asks for a reason, and sends your moderation bot's warn command.",
    authors: [SnoreClientDevs.founder],
    dependencies: ["ContextMenuAPI"],
    settings,
    contextMenus: {
        "user-context": userContextMenu,
    },
});
