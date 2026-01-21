'use client';

interface KeyboardShortcutsBarProps {
    className?: string;
}

export function KeyboardShortcutsBar({ className = '' }: KeyboardShortcutsBarProps) {
    return (
        <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 ${className}`}>
            <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 rounded border border-gray-200">Ctrl+K</kbd>
                <span className="font-medium text-gray-400">Focus search</span>
            </div>
            <span className="text-gray-200">·</span>
            <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 rounded border border-gray-200">↑↓</kbd>
                <span className="font-medium text-gray-400">Navigate results</span>
            </div>
            <span className="text-gray-200">·</span>
            <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 rounded border border-gray-200">Enter</kbd>
                <span className="font-medium text-gray-400">Open first card / Expand</span>
            </div>
            <span className="text-gray-200">·</span>
            <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 rounded border border-gray-200">1</kbd>
                <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 rounded border border-gray-200">2</kbd>
                <span className="font-medium text-gray-400">Log meals while card selected</span>
            </div>
            <span className="text-gray-200">·</span>
            <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 rounded border border-gray-200">R</kbd>
                <span className="font-medium text-gray-400">Reset card / back to search</span>
            </div>
            <span className="text-gray-200">·</span>
            <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-100 rounded border border-gray-200">Esc</kbd>
                <span className="font-medium text-gray-400">Clear</span>
            </div>
        </div>
    );
}
