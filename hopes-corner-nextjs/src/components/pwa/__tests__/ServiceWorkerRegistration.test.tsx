import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { ServiceWorkerRegistration } from '../ServiceWorkerRegistration';

describe('ServiceWorkerRegistration Component', () => {
    // Save original env
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };

        // Mock window and navigator
        Object.defineProperty(global, 'navigator', {
            value: {
                serviceWorker: {
                    register: vi.fn().mockResolvedValue({
                        scope: 'test-scope',
                        update: vi.fn(),
                    }),
                    addEventListener: vi.fn(),
                },
            },
            writable: true,
        });

        Object.defineProperty(global, 'window', {
            value: {
                addEventListener: vi.fn((event, cb) => {
                    if (event === 'load') cb();
                }),
            },
            writable: true,
        });
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('registers service worker in production', () => {
        process.env.NODE_ENV = 'production';

        render(<ServiceWorkerRegistration />);

        // Should register SW
        expect(window.addEventListener).toHaveBeenCalledWith('load', expect.any(Function));
        // Since we mock window.addEventListener to call back immediately:
        expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    });

    it('does not register service worker in development', () => {
        process.env.NODE_ENV = 'development';

        render(<ServiceWorkerRegistration />);

        expect(navigator.serviceWorker.register).not.toHaveBeenCalled();
    });

    it('checks for updates periodically', async () => {
        vi.useFakeTimers();
        process.env.NODE_ENV = 'production';
        const updateMock = vi.fn();

        Object.defineProperty(global, 'navigator', {
            value: {
                serviceWorker: {
                    register: vi.fn().mockResolvedValue({
                        scope: 'test-scope',
                        update: updateMock,
                    }),
                    addEventListener: vi.fn(),
                },
            },
            writable: true,
        });

        render(<ServiceWorkerRegistration />);

        // Allow promise (register().then(...)) to resolve
        await Promise.resolve();
        await Promise.resolve();

        // Advance time > 60 mins
        vi.advanceTimersByTime(61 * 60 * 1000);

        expect(updateMock).toHaveBeenCalled();

        vi.useRealTimers();
    });

    it('handles controller change', () => {
        process.env.NODE_ENV = 'production';
        const addEventListenerMock = vi.fn();

        Object.defineProperty(global, 'navigator', {
            value: {
                serviceWorker: {
                    register: vi.fn().mockResolvedValue({}),
                    addEventListener: addEventListenerMock,
                },
            },
            writable: true,
        });

        render(<ServiceWorkerRegistration />);

        expect(addEventListenerMock).toHaveBeenCalledWith('controllerchange', expect.any(Function));

        // Trigger the handler
        const handler = addEventListenerMock.mock.calls.find((c: any) => c[0] === 'controllerchange')?.[1];
        if (handler) {
            handler();
        }
    });

    it('handles registration failure', async () => {
        process.env.NODE_ENV = 'production';
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        Object.defineProperty(global, 'navigator', {
            value: {
                serviceWorker: {
                    register: vi.fn().mockRejectedValue(new Error('Reg failed')),
                    addEventListener: vi.fn(),
                },
            },
            writable: true,
        });

        render(<ServiceWorkerRegistration />);

        await Promise.resolve();
        await Promise.resolve();

        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });
});
