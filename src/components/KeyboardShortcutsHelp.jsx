import React, { useId, useRef } from "react";
import { X, Keyboard } from "lucide-react";
import Modal from "./ui/Modal";

const KeyboardShortcutsHelp = ({ isOpen, onClose }) => {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef(null);
  const shortcuts = [
    { key: "⌘K / Ctrl+K", description: "Focus search", category: "Navigation" },
    { key: "Esc", description: "Close modals/dialogs", category: "Navigation" },
    {
      key: "⌘⌥G / Ctrl+Alt+G",
      description: "Create new guest",
      category: "Actions",
    },
    {
      key: "⌘Z / Ctrl+Z",
      description: "Undo last action",
      category: "Actions",
    },
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descriptionId}
      initialFocusRef={closeButtonRef}
    >
      <div className="max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="text-blue-500" size={24} aria-hidden="true" />
            <h2 className="text-xl font-semibold" id={titleId}>
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close keyboard shortcuts"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6" id={descriptionId}>
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
                    <span className="text-gray-700">
                      {shortcut.description}
                    </span>
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
            Press{" "}
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">
              ?
            </kbd>{" "}
            anytime to view shortcuts
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default KeyboardShortcutsHelp;
