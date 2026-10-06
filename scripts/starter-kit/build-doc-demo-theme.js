import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { syncStarterTheme } from './sync-starter-theme.js';
import { scopeThemeUnder } from './scope-theme.js';

export const DOC_DEMO_CLASS = 'doc-demo';

/** Bundle un CSS (résout les `@import … layer()`), sans écrire sur le disque. */
export async function bundleCss(entryPath) {
    const result = await build({
        entryPoints: [entryPath],
        bundle: true,
        write: false,
        loader: { '.css': 'css' },
        logLevel: 'silent',
    });
    return result.outputFiles[0].text;
}

/**
 * Thème neutre du starter-kit (dérivé d'`ariane.css` par `syncStarterTheme`, le même flux
 * que le Kitchen Sink), imbriqué sous `.doc-demo`. Aucune écriture dans le dépôt : le
 * starter est généré dans un répertoire temporaire.
 */
export async function buildDocDemoTheme(srcThemesDir) {
    const tmp = mkdtempSync(path.join(tmpdir(), 'doc-demo-theme-'));
    try {
        syncStarterTheme({ srcThemesDir, repoPath: tmp });
        const bundled = await bundleCss(path.join(tmp, 'ariane-starter.css'));
        return scopeThemeUnder(bundled, DOC_DEMO_CLASS);
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }
}

function latestMtimeMs(dir) {
    let latest = 0;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        latest = Math.max(
            latest,
            entry.isDirectory() ? latestMtimeMs(full) : statSync(full).mtimeMs,
        );
    }
    return latest;
}

/**
 * Fournisseur avec cache : la feuille n'est reconstruite que si un fichier de
 * `srcThemesDir` a changé (utilisé par le serveur de développement du site). Les
 * scripts `derive-neutral-*` ne sont pas surveillés : les modifier demande de redémarrer
 * le serveur.
 */
export function createDocDemoThemeProvider(srcThemesDir) {
    let cached = null;
    let builds = 0;
    return {
        get builds() {
            return builds;
        },
        async get() {
            const stamp = latestMtimeMs(srcThemesDir);
            if (cached && cached.stamp === stamp) return cached.css;
            const css = await buildDocDemoTheme(srcThemesDir);
            builds += 1;
            cached = { stamp, css };
            return css;
        },
    };
}
