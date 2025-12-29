import React from 'react';

export default function Logo({ width = "100%", height = "auto" }) {
    return (
        <svg width={width} height={height} viewBox="0 0 900 260" xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: '100%' }}>
            <defs>
                {/* Theme Gradient: Yellow -> Pink -> Cyan */}
                <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FFD60A" />
                    <stop offset="50%" stopColor="#FF355E" />
                    <stop offset="100%" stopColor="#00D2FF" />
                </linearGradient>

                <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Background slash */}
            <rect x="0" y="120" width="900" height="22"
                fill="#111"
                transform="rotate(-3 450 130)"
                opacity="0.8" />

            {/* Shadow text */}
            <text x="80" y="160"
                fontSize="96"
                fontWeight="900"
                letterSpacing="6"
                fontFamily="Outfit, Impact, sans-serif"
                fill="#000"
                opacity="0.45"
                transform="skewX(-8)">
                TRICKSTROKE
            </text>

            {/* Main text */}
            <text x="70" y="150"
                fontSize="96"
                fontWeight="900"
                letterSpacing="6"
                fontFamily="Outfit, Impact, sans-serif"
                fill="url(#neonGradient)"
                stroke="#111"
                strokeWidth="4"
                filter="url(#glow)"
                transform="skewX(-8)">
                TRICKSTROKE
            </text>

            {/* Typing cursor */}
            <rect x="820" y="85" width="12" height="70" fill="#FFD60A">
                <animate attributeName="opacity"
                    values="1;0;1"
                    dur="1s"
                    repeatCount="indefinite" />
            </rect>

            {/* Subtitle */}
            <text x="90" y="200"
                fontSize="26"
                letterSpacing="2"
                fontFamily="Outfit, sans-serif"
                fill="#ddd"
                opacity="0.9">
                type • bluff • accuse
            </text>
        </svg>
    );
}
