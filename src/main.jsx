import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles.css";
import "./App.css";
import App from "./App.jsx";
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 2000,
        success: { duration: 1500 },
        error: { duration: 4000 },
      }}
    />
  </StrictMode>,
);

// Register service worker for PWA (only in production and if supported)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('Service worker registered.', reg);

        // Check for updates every hour
        setInterval(() => {
          reg.update();
        }, 60 * 60 * 1000);

        // Handle service worker updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          console.log('Service worker update found!');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is ready to take over
              console.log('New service worker installed, prompting user to refresh');

              // Show update notification
              if (confirm('A new version of Hope\'s Corner is available! Click OK to update.')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((err) => {
        console.error('Service worker registration failed:', err);
      });

    // Reload page when new service worker takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}
