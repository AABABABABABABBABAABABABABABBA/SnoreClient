/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { SVGProps } from "react";

export function SnoreLogo({ size = 48, ...props }: SVGProps<SVGSVGElement> & { size?: number; }) {
    return (
        <svg viewBox="0 0 256 256" width={size} height={size} aria-hidden {...props}>
            <defs>
                <linearGradient id="snore-bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#2b2250" />
                    <stop offset="1" stopColor="#120f23" />
                </linearGradient>
                <linearGradient id="snore-moon" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#c4b5fd" />
                    <stop offset="1" stopColor="#8b7cf6" />
                </linearGradient>
            </defs>
            <rect width="256" height="256" rx="56" fill="url(#snore-bg)" />
            <circle cx="60" cy="52" r="3" fill="#e9d5ff" opacity=".8" />
            <circle cx="200" cy="40" r="2" fill="#e9d5ff" opacity=".6" />
            <circle cx="44" cy="190" r="2.5" fill="#e9d5ff" opacity=".5" />
            <circle cx="214" cy="206" r="3" fill="#e9d5ff" opacity=".7" />
            <path d="M112 44c-38 8-62 40-62 78 0 46 36 82 82 82 30 0 56-16 70-40-10 5-21 7-32 7-45 0-82-37-82-82 0-16 5-31 13-44 4-1 7-1 11-1z" fill="url(#snore-moon)" />
            <text x="150" y="112" fontFamily="Inter, 'Segoe UI', system-ui, sans-serif" fontWeight="800" fontSize="52" fill="#f3ebff" textAnchor="middle">Z</text>
            <text x="192" y="78" fontFamily="Inter, 'Segoe UI', system-ui, sans-serif" fontWeight="800" fontSize="36" fill="#f3ebff" textAnchor="middle" opacity=".85">z</text>
            <text x="222" y="52" fontFamily="Inter, 'Segoe UI', system-ui, sans-serif" fontWeight="800" fontSize="24" fill="#f3ebff" textAnchor="middle" opacity=".65">z</text>
        </svg>
    );
}
