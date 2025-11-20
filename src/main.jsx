import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles.css";
import "./App.css";
import App from "./App.jsx";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "./components/ErrorBoundary";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2000,
          success: { duration: 1500 },
          error: { duration: 4000 },
        }}
      />
    </ErrorBoundary>
  </StrictMode>,
);

// Register service worker for PWA (only in production and if supported)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('Service worker registered.', reg);

        // Check for updates immediately on app load, then every 5 minutes
        const checkUpdates = () => {
          reg.update();
        };

        // Check immediately
        checkUpdates();

        // Then check every 5 minutes (instead of hourly)
        setInterval(checkUpdates, 5 * 60 * 1000);

        // Handle service worker updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          console.log('Service worker update found!');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is ready to take over
              console.log('New service worker installed, triggering update');

              // Show update notification
              const updateMessage = `A new version of Hope's Corner is available! Updating now...`;
              console.log(updateMessage);

              // Dispatch event for app to show toast
              window.dispatchEvent(
                new CustomEvent('app-update-available', {
                  detail: { message: updateMessage },
                })
              );

              // Automatically activate the new service worker after 2 seconds
              // This ensures critical updates are deployed without requiring user action
              setTimeout(() => {
                console.log('Activating new service worker');
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }, 2000);
            }
          });
        });
      })
      .catch((error) => {
        console.error('Service worker registration failed:', error);
      });

    // Reload page when new service worker takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('Service worker controller changed, reloading page');
        window.location.reload();
      }
    });
  });
}
