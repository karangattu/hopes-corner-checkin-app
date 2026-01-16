'use client';

import React from 'react';
import { WashingMachine } from 'lucide-react';

interface LaundryLinkedBadgeProps {
    className?: string;
}

export function LaundryLinkedBadge({ className = '' }: LaundryLinkedBadgeProps) {
    return (
        <span
            data-testid="laundry-linked-badge"
            className={`inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${className}`}
        >
            <WashingMachine size={12} />
            Laundry Linked
        </span>
    );
}

export default LaundryLinkedBadge;
