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

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CSS_SRC = join(ROOT, 'src', 'styles');
const CSS_OUT = join(ROOT, 'dist', 'styles');
const THEMES_SRC = join(CSS_SRC, 'themes');
const WATCH = process.argv.includes('--watch');

// Marqueur de split entre la partie tokens (:root) et la partie composants
// (::part()) d'un fichier de thème. Distinct du titre de section décoratif
// juste après (ex. "THÈME COMPOSANTS") : ce marqueur est le seul repère
// fiable pour ce script, il ne doit pas être renommé.
const SPLIT_ANCHOR = 'build-split-anchor: components';

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
 * Pour chaque fichier de thème sous src/styles/themes/, génère un module JS
 * jumeau exportant un CSSStyleSheet peuplé avec la partie "composants" du
 * thème (tout ce qui suit SPLIT_ANCHOR dans le fichier source).
 * @returns {Promise<void>}
 */
async function generateThemeJsExports() {
    const themeFiles = findCssFiles(THEMES_SRC);

    for (const file of themeFiles) {
        const source = readFileSync(file, 'utf8');
        const anchorIndex = source.indexOf(SPLIT_ANCHOR);

        if (anchorIndex === -1) {
            throw new Error(
                `[build-css] Ancre "${SPLIT_ANCHOR}" introuvable dans ` +
                    `${relative(ROOT, file)} — requise pour générer l'export ` +
                    'CSSStyleSheet du thème (voir scripts/build-css.js).',
            );
        }

        // L'ancre se trouve à l'intérieur d'un commentaire CSS.
        // Trouver la fermeture */ pour extraire uniquement le CSS des composants.
        const searchStart = anchorIndex + SPLIT_ANCHOR.length;
        const commentEndIndex = source.indexOf('*/', searchStart);

        if (commentEndIndex === -1) {
            throw new Error(
                `[build-css] Commentaire d'ancre non fermé dans ` +
                    `${relative(ROOT, file)} — le commentaire contenant ` +
                    `"${SPLIT_ANCHOR}" doit être fermé par */ (voir scripts/build-css.js).`,
            );
        }

        // Extraire le CSS après la fermeture du commentaire. Dans le fichier
        // source, ce CSS est enrobé dans une @layer ariane.theme { ... } dont
        // l'ouverture précède l'ancre et dont la fermeture } se trouve en fin
        // de fichier. On la ré-enrobe dans une @layer fraîche et complète
        // (plutôt que de retirer la } de fermeture d'origine) pour préserver
        // le layering : sans lui, les règles ::part() de default.js seraient
        // non-layered alors qu'elles le sont dans default.css, cassant
        // l'équivalence de cascade entre les deux méthodes de chargement
        // documentées (<link> vs adoptedStyleSheets — cf. #170).
        const componentsSource = `@layer ariane.theme {\n${source.slice(commentEndIndex + 2)}`;

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
                `[build-css] Warnings de transformation CSS dans ` +
                    `${relative(ROOT, file)}:\n${warningMessages}\n` +
                    'Voir scripts/build-css.js pour les détails.',
            );
        }

        const basename = relative(THEMES_SRC, file).replace(/\.css$/, '');
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

// Construire les entry points en préservant la structure de répertoires
const entryPoints = Object.fromEntries(
    cssFiles.map((file) => {
        const key = relative(CSS_SRC, file).replace(/\.css$/, '');
        return [key, file];
    }),
);

mkdirSync(CSS_OUT, { recursive: true });

const ctx = await esbuild.context({
    entryPoints,
    outdir: CSS_OUT,
    bundle: false, // pas de résolution d'imports @import ici
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
