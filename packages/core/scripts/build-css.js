#!/usr/bin/env node
/**
 * build-css.js
 *
 * Traite les fichiers CSS globaux (thèmes, utilities) :
 * - Minifie via esbuild
 * - Copie vers dist/styles/ avec les fichiers originaux non-minifiés
 * - Pour les fichiers sous src/styles/themes/, génère en plus un module JS
 *   jumeau (<nom>.js) exportant un CSSStyleSheet déjà peuplé avec la partie
 *   "composants" du thème (règles ::part()), pour adoption via
 *   shadowRoot.adoptedStyleSheets dans un shadow DOM applicatif (#170).
 *   La partie tokens (:root) est volontairement exclue : :root ne matche
 *   rien dans un shadow root adopté (il désigne toujours l'élément racine du
 *   document), l'inclure serait du poids mort. Les tokens traversent déjà la
 *   frontière shadow DOM par héritage CSS, sans action requise.
 *
 * Les styles des composants (button.styles.ts) ne passent PAS ici :
 * ils sont du TypeScript traité par build-bundles.js.
 */

import esbuild from 'esbuild';
import { readdirSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, relative, extname } from 'path';
import { fileURLToPath } from 'url';
import { extractComponentRules } from './extract-component-rules.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CSS_SRC = join(ROOT, 'src', 'styles');
const CSS_OUT = join(ROOT, 'dist', 'styles');
const THEMES_SRC = join(CSS_SRC, 'themes');
const WATCH = process.argv.includes('--watch');

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

/**
 * Convertit un nom de fichier kebab-case en camelCase.
 * @param {string} str
 * @returns {string}
 */
function toCamelCase(str) {
    return str.replace(/[-_]+([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
}

/**
 * Pour chaque fichier de thème sous src/styles/themes/ (hors fragments
 * préfixés `_`), génère un module JS jumeau exportant un CSSStyleSheet
 * peuplé avec la partie "composants" du thème (règles ::part(), etc.),
 * extraite du CSS déjà bundlé (résolution des @import faite par ctx.rebuild()
 * — doit donc s'exécuter avant cette fonction) via extractComponentRules().
 * @returns {Promise<void>}
 */
async function generateThemeJsExports() {
    const themeFiles = findCssFiles(THEMES_SRC).filter((f) => !f.split('/').pop().startsWith('_'));

    for (const file of themeFiles) {
        const basename = relative(THEMES_SRC, file).replace(/\.css$/, '');
        const bundledPath = join(CSS_OUT, 'themes', `${basename}.css`);
        const bundledSource = readFileSync(bundledPath, 'utf8');

        const componentsSource = extractComponentRules(bundledSource);

        const { code: minified, warnings } = await esbuild.transform(componentsSource, {
            loader: 'css',
            minify: true,
        });

        // Vérifier qu'il n'y a pas de warnings de syntaxe CSS
        if (warnings.length > 0) {
            const warningMessages = warnings
                .map(
                    (w) =>
                        `  - ${w.text} (${w.location ? `ligne ${w.location.line}` : 'position inconnue'})`,
                )
                .join('\n');
            throw new Error(
                `[build-css] Warnings de transformation CSS dans ${relative(ROOT, file)}:\n${warningMessages}\n` +
                    'Voir scripts/build-css.js pour les détails.',
            );
        }

        const exportName = `${toCamelCase(basename)}Theme`;
        const jsContent =
            `export const ${exportName} = new CSSStyleSheet();\n` +
            `${exportName}.replaceSync(${JSON.stringify(minified)});\n`;

        const outDir = join(CSS_OUT, 'themes');
        mkdirSync(outDir, { recursive: true });
        writeFileSync(join(outDir, `${basename}.js`), jsContent);
    }
}

const cssFiles = findCssFiles(CSS_SRC);

if (cssFiles.length === 0) {
    console.log('No CSS theme files found, skipping.');
    process.exit(0);
}

// Construire les entry points en préservant la structure de répertoires.
// Les fragments préfixés `_` (cf. ariane/_*.css) ne sont pas des entry points
// autonomes : ils sont résolus via @import par ariane.css (bundle: true).
const entryPoints = Object.fromEntries(
    cssFiles
        .filter((file) => !file.split('/').pop().startsWith('_'))
        .map((file) => {
            const key = relative(CSS_SRC, file).replace(/\.css$/, '');
            return [key, file];
        }),
);

mkdirSync(CSS_OUT, { recursive: true });

const ctx = await esbuild.context({
    entryPoints,
    outdir: CSS_OUT,
    bundle: true, // résout les @import (fragments de thème, cf. #256)
    minify: true,
    logLevel: 'info',
});

if (WATCH) {
    await ctx.watch();
    // Génération initiale seulement : un fichier thème modifié en watch ne
    // régénère pas automatiquement son .js jumeau. Limitation acceptée —
    // npm run build (utilisé pour vérifier un changement réel) régénère
    // toujours tout depuis zéro.
    await generateThemeJsExports();
    console.log('[css] watching...');
} else {
    await ctx.rebuild();
    await generateThemeJsExports();
    await ctx.dispose();
    console.log(`✓ CSS: ${cssFiles.length} file(s) → dist/styles/`);
}
