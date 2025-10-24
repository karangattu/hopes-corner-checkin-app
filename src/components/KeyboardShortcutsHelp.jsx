import React from "react";
import { X, Keyboard } from "lucide-react";

const KeyboardShortcutsHelp = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: "⌘K / Ctrl+K", description: "Focus search", category: "Navigation" },
    { key: "Esc", description: "Close modals/dialogs", category: "Navigation" },
  { key: "⌘⌥G / Ctrl+Alt+G", description: "Create new guest", category: "Actions" },
    { key: "⌘Z / Ctrl+Z", description: "Undo last action", category: "Actions" },
    { key: "?", description: "Show keyboard shortcuts", category: "Help" },
  ];

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="text-blue-500" size={24} />
            <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close keyboard shortcuts"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-gray-700">{shortcut.description}</span>
                    <kbd className="px-3 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono text-gray-700">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 text-center border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Press <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">?</kbd> anytime to view shortcuts
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;
