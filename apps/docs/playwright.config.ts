import { defineConfig } from '@playwright/test';

/**
 * Config Playwright dédiée aux tests d'accessibilité (axe-core) — teste le
 * build statique (`dist/`) servi par `astro preview`, pas le dev server
 * (build de prod = CSS/JS final, pas de HMR qui pourrait fausser un scan).
 *
 * `npm run build` doit avoir tourné avant `npm run test:a11y`.
 */
export default defineConfig({
    testDir: './tests/a11y',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['list'], ['github'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: 'http://localhost:4322',
    },
    webServer: {
        command: 'npx astro preview --port 4322',
        url: 'http://localhost:4322',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
    },
    projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
