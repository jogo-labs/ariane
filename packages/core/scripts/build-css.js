#!/usr/bin/env node
/**
 * build-css.js
 *
 * Traite les fichiers CSS globaux (thèmes, utilities) :
 * - Minifie via esbuild
 * - Copie vers dist/styles/ avec les fichiers originaux non-minifiés
 *
 * Les styles des composants (button.styles.ts) ne passent PAS ici :
 * ils sont du TypeScript traité par build-bundles.js.
 */

import esbuild from 'esbuild';
import { readdirSync, mkdirSync, existsSync } from 'fs';
import { join, dirname, relative, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const CSS_SRC   = join(ROOT, 'src', 'styles');
const CSS_OUT   = join(ROOT, 'dist', 'styles');

/**
 * Scan récursif pour trouver tous les fichiers CSS.
 * @param {string} dir
 * @returns {string[]}
 */
function findCssFiles(dir) {
    if (!existsSync(dir)) return [];
    const results = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findCssFiles(full));
        } else if (extname(entry.name) === '.css') {
            results.push(full);
        }
    }
    return results;
}

const cssFiles = findCssFiles(CSS_SRC);

if (cssFiles.length === 0) {
    console.log('No CSS theme files found, skipping.');
    process.exit(0);
}

// Construire les entry points en préservant la structure de répertoires
const entryPoints = Object.fromEntries(
    cssFiles.map((file) => {
        const key = relative(CSS_SRC, file).replace(/\.css$/, '');
        return [key, file];
    }),
);

mkdirSync(CSS_OUT, { recursive: true });

await esbuild
    .build({
        entryPoints,
        outdir:   CSS_OUT,
        bundle:   false, // pas de résolution d'imports @import ici
        minify:   true,
        logLevel: 'info',
    })
    .then(() => {
        console.log(`✓ CSS: ${cssFiles.length} file(s) → dist/styles/`);
    })
    .catch((err) => {
        console.error('CSS build failed:', err);
        process.exit(1);
    });
