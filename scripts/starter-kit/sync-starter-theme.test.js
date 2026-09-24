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
                `@import url('./ariane/_palette.css') layer(ariane.theme);\n` +
                    `@import url('./ariane/components/_alert.css') layer(ariane.theme);\n`,
            );
            writeFileSync(
                path.join(srcThemesDir, 'ariane', '_palette.css'),
                `:root {\n    --ar-color-primary-40: oklch(52.43% 0.1108 74.71);\n}`,
            );
            writeFileSync(
                path.join(srcThemesDir, 'ariane', '_global-tokens.css'),
                `:root {\n    --ar-border-radius-md: 0.5rem;\n}`,
            );
            writeFileSync(
                path.join(srcThemesDir, 'ariane', 'components', '_alert.css'),
                `ar-alert { color: red; }`,
            );

            syncStarterTheme({ srcThemesDir, repoPath });

            const entry = readFileSync(path.join(repoPath, 'ariane-starter.css'), 'utf8');
            expect(entry).toMatch(/@import url\('\.\/ariane-starter\/_palette\.css'\)/);
            expect(entry).not.toMatch(/\.\/ariane\//);

            const palette = readFileSync(
                path.join(repoPath, 'ariane-starter', '_palette.css'),
                'utf8',
            );
            expect(palette).toMatch(/--ar-color-primary-40: oklch\(52\.43% 0\.04 250\);/);

            const globalTokens = readFileSync(
                path.join(repoPath, 'ariane-starter', '_global-tokens.css'),
                'utf8',
            );
            expect(globalTokens).toMatch(/--ar-border-radius-md: 0\.375rem;/);

            const alert = readFileSync(
                path.join(repoPath, 'ariane-starter', 'components', '_alert.css'),
                'utf8',
            );
            expect(alert).toBe('ar-alert { color: red; }');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});
