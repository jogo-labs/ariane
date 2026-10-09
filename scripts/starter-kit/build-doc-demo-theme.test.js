import { describe, expect, it, beforeAll } from 'vitest';
import { cpSync, mkdtempSync, rmSync, utimesSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncStarterTheme } from './sync-starter-theme.js';
import { collectDeclaredProperties, collectSelectors, unscopedSelectors } from './scope-theme.js';
import {
    DOC_DEMO_CLASS,
    bundleCss,
    buildDocDemoTheme,
    createDocDemoThemeProvider,
} from './build-doc-demo-theme.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const THEMES = path.resolve(__dirname, '../../packages/core/src/styles/themes');

describe('buildDocDemoTheme (thème réel)', () => {
    let css;
    beforeAll(async () => {
        css = await buildDocDemoTheme(THEMES);
    });

    it('ne contient que des règles scopées sous .doc-demo (aucune fuite vers le chrome)', () => {
        expect(css).toContain(`.${DOC_DEMO_CLASS}`);
        expect(css).not.toContain(':root');
        expect(unscopedSelectors(css, DOC_DEMO_CLASS)).toEqual([]);
    });

    it('force color-scheme: inherit hors de toute couche (suit le menu de thème du site)', () => {
        // Règle non-couche : elle suit la dernière accolade fermante du bloc @layer.
        const rule = /\.doc-demo\s*\{\s*color-scheme:\s*inherit;?\s*\}\s*$/;
        expect(css).toMatch(rule);
        const before = css.replace(rule, '');
        const opens = (before.match(/\{/g) ?? []).length;
        const closes = (before.match(/\}/g) ?? []).length;
        expect(opens).toBe(closes);
        // Aucune déclaration color-scheme du thème ne doit rester une valeur "light dark"
        // non neutralisée par la règle finale : celle-ci est bien la dernière du fichier.
        expect(css.lastIndexOf('color-scheme')).toBeGreaterThan(before.lastIndexOf('color-scheme'));
    });

    it('le starter définit tout ce que définit ariane.css (aucune règle ne fuite)', async () => {
        const ariane = await bundleCss(path.join(THEMES, 'ariane.css'));
        const tmp = mkdtempSync(path.join(tmpdir(), 'starter-superset-'));
        try {
            syncStarterTheme({ srcThemesDir: THEMES, repoPath: tmp });
            const starter = await bundleCss(path.join(tmp, 'ariane-starter.css'));
            const key = (selector) => JSON.stringify(selector);
            const starterKeys = new Set(collectSelectors(starter).map(key));
            const arianeSelectors = collectSelectors(ariane);
            expect(arianeSelectors.length).toBeGreaterThan(0);
            const missing = arianeSelectors
                .filter((selector) => !starterKeys.has(key(selector)))
                .map(key);
            expect(missing).toEqual([]);

            // Chaque propriété déclarée par ariane.css pour un sélecteur doit l'être aussi par
            // le starter (sinon la valeur d'ariane fuirait dans les démos).
            const starterProps = collectDeclaredProperties(starter);
            const missingProps = [];
            for (const [selector, names] of collectDeclaredProperties(ariane)) {
                for (const name of names) {
                    if (!starterProps.get(selector)?.has(name)) {
                        missingProps.push(`${selector} ${name}`);
                    }
                }
            }
            expect(missingProps).toEqual([]);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });
});

describe('createDocDemoThemeProvider', () => {
    it('met en cache tant que les sources ne changent pas, reconstruit sinon', async () => {
        const tmp = mkdtempSync(path.join(tmpdir(), 'doc-demo-provider-'));
        try {
            const dir = path.join(tmp, 'themes');
            mkdirSync(dir, { recursive: true });
            cpSync(THEMES, dir, { recursive: true });
            const provider = createDocDemoThemeProvider(dir);

            const first = await provider.get();
            await provider.get();
            expect(provider.builds).toBe(1);

            const touched = path.join(dir, 'ariane', 'components', '_alert.css');
            const future = new Date(Date.now() + 60_000);
            utimesSync(touched, future, future);

            const second = await provider.get();
            expect(provider.builds).toBe(2);
            expect(second).toBe(first);

            // Supprimer le fichier le plus récent (le mtime max redescend) invalide le cache.
            const extra = path.join(dir, 'ariane', 'components', '_extra.css');
            writeFileSync(extra, '/* inutilisé */\n');
            utimesSync(extra, new Date(Date.now() + 120_000), new Date(Date.now() + 120_000));
            await provider.get();
            expect(provider.builds).toBe(3);
            rmSync(extra);
            await provider.get();
            expect(provider.builds).toBe(4);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });
});
