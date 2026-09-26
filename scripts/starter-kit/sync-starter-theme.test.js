// scripts/starter-kit/sync-starter-theme.test.js
import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { syncStarterTheme } from './sync-starter-theme.js';

describe('syncStarterTheme', () => {
    it("copie l'arbre, neutralise palette/radius, réécrit les imports", () => {
        const root = mkdtempSync(path.join(tmpdir(), 'sync-starter-theme-'));
        try {
            const srcThemesDir = path.join(root, 'themes');
            const repoPath = path.join(root, 'repo');
            mkdirSync(path.join(srcThemesDir, 'ariane', 'components'), { recursive: true });
            mkdirSync(repoPath, { recursive: true });

            writeFileSync(
                path.join(srcThemesDir, 'ariane.css'),
                `/**\n` +
                    ` * ariane.css — thème de la doc/démo Ariane ("Le Fil").\n` +
                    ` * Usage :\n` +
                    ` *   <link rel="stylesheet" href="https://unpkg.com/@ariane-ui/core/dist/styles/themes/ariane.css">\n` +
                    ` */\n\n` +
                    `@import url('./ariane/_palette.css') layer(ariane.theme);\n` +
                    `@import url('./ariane/components/_alert.css') layer(ariane.theme);\n`,
            );
            writeFileSync(
                path.join(srcThemesDir, 'ariane', '_palette.css'),
                `:root {\n` +
                    `    --ar-color-primary-05: oklch(16.5% 0.035 70);\n` +
                    `    --ar-color-primary-10: oklch(20% 0.035 70);\n` +
                    `    --ar-color-primary-20: oklch(28% 0.035 70);\n` +
                    `    --ar-color-primary-30: oklch(36% 0.035 70);\n` +
                    `    --ar-color-primary-40: oklch(52.43% 0.1108 74.71);\n` +
                    `    --ar-color-primary-50: oklch(60% 0.035 70);\n` +
                    `    --ar-color-primary-60: oklch(68% 0.035 70);\n` +
                    `    --ar-color-primary-70: oklch(76% 0.035 70);\n` +
                    `    --ar-color-primary-80: oklch(84% 0.035 70);\n` +
                    `    --ar-color-primary-90: oklch(92% 0.035 70);\n` +
                    `    --ar-color-primary-95: oklch(96.5% 0.038 87);\n` +
                    `    --ar-color-vault: oklch(23.54% 0.0334 273.44);\n` +
                    `    --ar-color-vault-deep: oklch(18.99% 0.0249 273.04);\n}`,
            );
            writeFileSync(
                path.join(srcThemesDir, 'ariane', '_global-tokens.css'),
                `:root {\n` +
                    `    --ar-border-radius-sm: 0.25rem;\n` +
                    `    --ar-border-radius-md: 0.5rem;\n` +
                    `    --ar-border-radius-lg: 0.875rem;\n` +
                    `    --ar-border-radius-xl: 1.5rem;\n` +
                    `    --ar-button-primary-color: var(--ar-color-neutral-10);\n}`,
            );
            writeFileSync(
                path.join(srcThemesDir, 'ariane', 'components', '_alert.css'),
                `ar-alert { color: red; }`,
            );
            writeFileSync(
                path.join(srcThemesDir, 'ariane', 'components', '_datepicker.css'),
                `:root {\n` +
                    `    --ar-datepicker-day-selected-bg: var(--ar-color-primary-70);\n` +
                    `    --ar-datepicker-day-selected-color: var(--ar-color-neutral-10);\n}\n` +
                    `ar-datepicker {\n` +
                    `    &::part(trigger):not(:disabled):active {\n` +
                    `        color: light-dark(var(--ar-color-text), var(--ar-color-text-inverse));\n` +
                    `    }\n}`,
            );

            syncStarterTheme({ srcThemesDir, repoPath });

            const entry = readFileSync(path.join(repoPath, 'ariane-starter.css'), 'utf8');
            expect(entry).toMatch(/@import url\('\.\/ariane-starter\/_palette\.css'\)/);
            expect(entry).not.toMatch(/\.\/ariane\//);
            expect(entry).not.toMatch(/thème de la doc\/démo Ariane/);
            expect(entry).toMatch(/thème de démarrage neutre/);

            const palette = readFileSync(
                path.join(repoPath, 'ariane-starter', '_palette.css'),
                'utf8',
            );
            expect(palette).toMatch(/--ar-color-primary-40: oklch\(37% 0\.13 275\);/);

            const globalTokens = readFileSync(
                path.join(repoPath, 'ariane-starter', '_global-tokens.css'),
                'utf8',
            );
            expect(globalTokens).toMatch(/--ar-border-radius-md: 0\.375rem;/);
            expect(globalTokens).toMatch(/--ar-button-primary-color: var\(--ar-color-white\);/);

            const alert = readFileSync(
                path.join(repoPath, 'ariane-starter', 'components', '_alert.css'),
                'utf8',
            );
            expect(alert).toBe('ar-alert { color: red; }');

            const datepicker = readFileSync(
                path.join(repoPath, 'ariane-starter', 'components', '_datepicker.css'),
                'utf8',
            );
            expect(datepicker).toMatch(
                /--ar-datepicker-day-selected-color: var\(--ar-color-white\);/,
            );
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});
