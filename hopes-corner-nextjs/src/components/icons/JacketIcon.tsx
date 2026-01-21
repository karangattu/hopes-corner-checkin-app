import React from 'react';

interface JacketIconProps {
    size?: number;
    className?: string;
    strokeWidth?: number;
}

/**
 * Jacket icon from Lucide Lab
 * https://www.shadcn.io/icon/lucide-lab-jacket
 * 
 * Used in shower essentials for tracking jacket distribution with 15-day cooldown
 */
export function JacketIcon({ size = 24, className = '', strokeWidth = 2 }: JacketIconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M8 4c0 1.1 1.8 2 4 2s4-.9 4-2V3c0-.6-.4-1-1-1h-1.5c-.3 0-.5.2-.5.5V3c0 .6-.4 1-1 1s-1-.4-1-1v-.5c0-.3-.2-.5-.5-.5H9c-.6 0-1 .4-1 1z" />
            <path d="M8 4H6a2 2 0 0 0-2 2v2c0 .8.6 1.5 1.4 1.8l.9.3c.2 0 .4.1.5.3l.2.7V22h6V11h.2l.2-.7c.1-.2.3-.3.5-.3l.9-.3c.8-.3 1.4-1 1.4-1.8V6a2 2 0 0 0-2-2h-2" />
            <path d="M13 11V8a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1v3h.2l.2.7c.1.2.3.3.5.3h1.2c.2 0 .4-.1.5-.3l.2-.7z" />
            <path d="M17 11.1V22h-3" />
        </svg>
    );
}

export default JacketIcon;
