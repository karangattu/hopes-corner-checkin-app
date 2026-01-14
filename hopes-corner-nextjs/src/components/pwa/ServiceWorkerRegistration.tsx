'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            // Register service worker after page load
            window.addEventListener('load', () => {
                navigator.serviceWorker
                    .register('/sw.js')
                    .then((registration) => {
                        console.log('[SW] Service Worker registered with scope:', registration.scope);

                        // Check for updates periodically
                        setInterval(() => {
                            registration.update();
                        }, 60 * 60 * 1000); // Check every hour
                    })
                    .catch((error) => {
                        console.error('[SW] Service Worker registration failed:', error);
                    });
            });

            // Handle service worker updates
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('[SW] New service worker activated');
            });
        }
    }, []);

    return null;
}
