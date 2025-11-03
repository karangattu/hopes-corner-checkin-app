import { usePWAInstall } from '../hooks/usePWAInstall';
import { X, Download } from 'lucide-react';
import { useState } from 'react';

/**
 * Component that shows an install prompt banner for PWA installation
 */
export default function PWAInstallPrompt() {
  const { isInstallable, promptInstall } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isInstallable || isDismissed) {
    return null;
  }

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (!accepted) {
      setIsDismissed(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg shadow-2xl p-4 text-white">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <Download className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base mb-1">
              Install Hope's Corner
            </h3>
            <p className="text-sm text-emerald-50 mb-3">
              Add to your home screen for quick access and offline support
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-white text-emerald-700 rounded-md font-medium text-sm hover:bg-emerald-50 transition-colors"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-white/20 text-white rounded-md font-medium text-sm hover:bg-white/30 transition-colors"
              >
                Not Now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-emerald-100 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
