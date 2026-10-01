#!/usr/bin/env node
/**
 * check-cdn-bundles.js
 *
 * Vérifie, après `build:bundles`, la cohérence des bundles CDN avec `package.json` (#300) :
 * le nom court est la version de PRODUCTION, le suffixe `.dev.js` la version de DÉVELOPPEMENT.
 *
 *   cdn/index.js, cdn/autoloader.js          → production (minifiée, sans avertissements)
 *   cdn/index.dev.js, cdn/autoloader.dev.js  → développement (avec avertissements)
 *
 * Ce qu'on garantit : les quatre `exports` `./cdn*` existent et pointent vers ces fichiers
 * (aucun autre export `./cdn*`), les cibles existent, aucun reste de l'ancienne nomenclature
 * `*.prod.js`, aucun fichier de production ne contient `console.warn` (le code d'avertissement,
 * conditionné par `__DEV__`, doit y être éliminé), et la version de développement en contient.
 *
 * Un `exports` qui désigne un fichier absent ou la mauvaise version se verrait en production
 * (404, ou version de développement servie à la place de la production) : on le casse au build.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CDN_EXPORTS = {
    './cdn': './cdn/index.js',
    './cdn.dev': './cdn/index.dev.js',
    './cdn/autoloader': './cdn/autoloader.js',
    './cdn/autoloader.dev': './cdn/autoloader.dev.js',
};

function listJsFiles(dir) {
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { recursive: true })
        .filter((p) => p.endsWith('.js'))
        .map((p) => join(dir, p));
}

/**
 * @param {{ exports: Record<string, unknown>, root: string }} options
 *   `root` : racine du paquet (le dossier qui contient `cdn/`).
 * @returns {string[]} les erreurs, vide si tout concorde.
 */
export function checkCdnBundles({ exports, root }) {
    const errors = [];

    for (const [key, expected] of Object.entries(CDN_EXPORTS)) {
        if (!(key in exports)) {
            errors.push(`Export manquant : ${key} (attendu : ${expected}).`);
        } else if (exports[key] !== expected) {
            errors.push(`Export ${key} : ${exports[key]} au lieu de ${expected}.`);
        }
        if (!existsSync(join(root, expected))) {
            errors.push(`Fichier absent : ${expected.replace(/^\.\//, '')} (cible de ${key}).`);
        }
    }

    for (const key of Object.keys(exports)) {
        if (key.startsWith('./cdn') && !(key in CDN_EXPORTS)) {
            errors.push(`Export inattendu : ${key} (ancienne nomenclature ?).`);
        }
    }

    const files = listJsFiles(join(root, 'cdn')).map((f) => ({
        path: relative(root, f),
        source: readFileSync(f, 'utf-8'),
    }));

    const legacy = files.filter((f) => f.path.endsWith('.prod.js')).map((f) => f.path);
    if (legacy.length > 0) {
        const examples = legacy.slice(0, 3).join(', ');
        const more = legacy.length > 3 ? `, … (${legacy.length} fichiers au total)` : '';
        errors.push(`Reste de l'ancienne nomenclature *.prod.js : ${examples}${more}.`);
    }

    const dev = files.filter((f) => f.path.endsWith('.dev.js'));
    const prod = files.filter((f) => !f.path.endsWith('.dev.js') && !f.path.endsWith('.prod.js'));

    for (const { path, source } of prod) {
        if (source.includes('console.warn')) {
            errors.push(
                `La version de production ${path} contient console.warn : les avertissements de développement n'ont pas été éliminés.`,
            );
        }
    }

    if (dev.length > 0 && !dev.some((f) => f.source.includes('console.warn'))) {
        errors.push(
            "Aucune version de développement (*.dev.js) ne contient d'avertissement (console.warn) : __DEV__ est-il bien à true ?",
        );
    }

    return errors;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
    const root = fileURLToPath(new URL('..', import.meta.url));
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
    const errors = checkCdnBundles({ exports: pkg.exports, root });
    if (errors.length > 0) {
        console.error('\n❌ Bundles CDN incohérents :');
        for (const e of errors) console.error(`   - ${e}`);
        console.error('');
        process.exit(1);
    }
    console.log('✓ Bundles CDN cohérents (production : .js, développement : .dev.js)');
}
