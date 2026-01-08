import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './vitest.setup.ts',
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/**/*.test.{ts,tsx}',
                'src/**/*.spec.{ts,tsx}',
                'src/types/**/*',
                'node_modules/**/*',
            ],
            thresholds: {
                global: {
                    lines: 80,
                    functions: 80,
                    branches: 70,
                    statements: 80,
                },
            },
        },
        deps: {
            inline: [
                'next-auth',
                'framer-motion',
                '@supabase/supabase-js',
            ],
        },
        server: {
            deps: {
                inline: [
                    'next-auth',
                    'framer-motion',
                    '@supabase/supabase-js',
                ],
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
