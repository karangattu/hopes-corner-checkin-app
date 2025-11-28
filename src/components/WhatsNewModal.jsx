import { useEffect } from "react";
import { X, Sparkles, Gift, Bug, Zap, ArrowRight } from "lucide-react";
import { APP_VERSION, CHANGELOG, markVersionAsSeen } from "../utils/appVersion";

const typeIcons = {
  feature: Sparkles,
  fix: Bug,
  performance: Zap,
  improvement: Gift,
};

const typeColors = {
  feature: "bg-purple-100 text-purple-700",
  fix: "bg-red-100 text-red-700",
  performance: "bg-blue-100 text-blue-700",
  improvement: "bg-emerald-100 text-emerald-700",
};

const typeLabels = {
  feature: "New Feature",
  fix: "Bug Fix",
  performance: "Performance",
  improvement: "Improvement",
};

/**
 * Modal showing what's new in the app
 */
const WhatsNewModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      // Mark as seen when opened
      markVersionAsSeen();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <Sparkles className="text-emerald-600" size={24} />
            </div>
            <div>
              <h2 id="whats-new-title" className="text-lg font-bold text-gray-900">
                What's New
              </h2>
              <p className="text-sm text-gray-500">
                Version {APP_VERSION}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {CHANGELOG.map((release, releaseIndex) => (
            <div key={release.version}>
              {releaseIndex > 0 && (
                <hr className="border-gray-100 mb-6" />
              )}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  v{release.version}
                </span>
                <span className="text-xs text-gray-400">
                  {release.date}
                </span>
                {release.version === APP_VERSION && (
                  <span className="text-xs font-medium text-white bg-emerald-500 px-2 py-0.5 rounded-full">
                    Current
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {release.highlights.map((item, itemIndex) => {
                  const Icon = typeIcons[item.type] || Sparkles;
                  const colorClass = typeColors[item.type] || typeColors.feature;
                  const label = typeLabels[item.type] || "Update";

                  return (
                    <div
                      key={itemIndex}
                      className="flex gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${colorClass} flex-shrink-0`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 text-sm">
                            {item.title}
                          </span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${colorClass}`}>
                            {label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            Got it
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsNewModal;
