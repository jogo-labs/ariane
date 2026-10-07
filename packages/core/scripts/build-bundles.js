#!/usr/bin/env node
/**
 * build-bundles.js
 *
 * Produit trois bundles distincts :
 *
 *  dist/          → bundle NPM : lit est "external", tree-shakeable, destiné aux bundlers
 *                   (Vite, webpack). __DEV__ injecté via banner esbuild :
 *                   `const __DEV__ = process.env.NODE_ENV !== "production";`
 *                   Les bundlers consommateurs (Vite, webpack) remplacent process.env.NODE_ENV
 *                   → dead-code elimination en prod, warnings actifs en dev.
 *
 *  cdn/*.js       → bundle CDN prod : tout inclus (lit bundlé), minifié, __DEV__ = false
 *                   (dead-code éliminé). Le nom court est la production : oublier de préciser
 *                   la version donne le build sûr (#300).
 *
 *  cdn/*.dev.js   → bundle CDN dev : tout inclus, non minifié, __DEV__ = true. Destiné au
 *                   développement local via <script type="module">.
 *
 * CLI flags :
 *   --dev   → npm + CDN dev (*.dev.js) seulement
 *   --prod  → npm + CDN prod (*.js) seulement
 *   --watch → npm + CDN dev (*.dev.js) en watch (prod inutile en watch)
 *   (aucun) → npm + CDN dev + CDN prod (mode CI)
 */

import esbuild from 'esbuild';
import { readdirSync, mkdirSync, rmSync, existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';
import { minifyHTMLLiterals } from 'minify-literals';
import { cleanDist } from './clean-dist.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');
const WATCH = process.argv.includes('--watch');
const DEV_ONLY = process.argv.includes('--dev') || WATCH;
const PROD_ONLY = process.argv.includes('--prod');

// ─── Utilitaire : scan récursif de fichiers ───────────────────────────────────

/**
 * Retourne tous les fichiers TS d'un répertoire en excluant certains patterns.
 * Remplace glob pour éviter une dépendance externe.
 *
 * @param {string} dir
 * @param {RegExp[]} excludePatterns
 * @returns {string[]}
 */
function findTsFiles(dir, excludePatterns = []) {
    const results = [];
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findTsFiles(fullPath, excludePatterns));
        } else if (entry.name.endsWith('.ts') && !excludePatterns.some((p) => p.test(fullPath))) {
            results.push(fullPath);
        }
    }
    return results;
}

// ─── Entrées du bundle ────────────────────────────────────────────────────────

// Barrel principal + chaque composant comme entry point individuel
// → permet d'importer un composant seul sans charger toute la lib
const componentFiles = findTsFiles(join(SRC, 'components'), [/\.test\.ts$/, /\.styles\.ts$/]);

/**
 * Transforme un chemin absolu de fichier source en clé d'entrée esbuild.
 * Ex: /src/components/button/button.ts → components/button/button
 */
function toEntryKey(file) {
    return relative(SRC, file).replace(/\.ts$/, '');
}

const entryPoints = {
    index: join(SRC, 'index.ts'),
    headless: join(SRC, 'headless.ts'),
    // Sous-path @ariane-ui/core/utils : code pur, sans customElements.define
    'utils/index': join(SRC, 'utils', 'index.ts'),
    ...Object.fromEntries(componentFiles.map((f) => [toEntryKey(f), f])),
};

const cdnEntryPoints = {
    index: join(SRC, 'index.ts'),
    autoloader: join(SRC, 'autoloader.ts'),
};

// ─── Plugin : minification des templates `html`/`css` (Lit) ──────────────────
//
// esbuild `minify: true` minifie la syntaxe JS mais ne touche pas au contenu
// des template literals — un composant expédie donc son CSS (`css\`...\``)
// et son markup (`html\`...\``) tels qu'écrits en source (indentation,
// commentaires) même dans un bundle CDN "prod". `minify-literals` fait ce
// travail correctement : parsing du TS via acorn (gère les décorateurs Lit),
// minification CSS via lightningcss, HTML via html-minifier-next, et surtout
// une minification partielle correcte autour des interpolations `${...}`
// (quasi systématiques dans les `html\`\`` de Lit pour les bindings
// d'événements/attributs) — un scan naïf de template literal les ignorerait
// presque tous.
function minifyLitTemplatesPlugin() {
    return {
        name: 'minify-lit-templates',
        setup(build) {
            build.onLoad({ filter: /\.ts$/ }, async (args) => {
                const source = await readFile(args.path, 'utf8');
                if (!source.includes('html`') && !source.includes('css`')) return null;

                const result = await minifyHTMLLiterals(source, { fileName: args.path });
                if (!result) return null;

                return { contents: result.code, loader: 'ts' };
            });
        },
    };
}

// ─── Options communes ─────────────────────────────────────────────────────────

/** Dépendances runtime à externaliser dans le bundle npm (résolues par le bundler consommateur) */
const EXTERNALS_NPM = ['lit', 'lit/*', '@lit/*', 'tslib'];

const commonOptions = {
    bundle: true,
    format: 'esm',
    target: 'es2022',
    sourcemap: true,
    logLevel: 'info',
};

// ─── Clean ────────────────────────────────────────────────────────────────────

// En watch mode, dist/ est déjà populé par le pre-build (turbo run build) et
// build-css.js --watch tourne en parallèle — un rmSync ici créerait une race
// condition (dist/styles/ wipeé pendant que build-css.js y écrit).
if (!WATCH) {
    // INVARIANT : ne jamais retirer ni réécrire custom-elements.json pendant ce script :
    // build:skill et la doc le lisent en parallèle (Turbo n'ordonne pas build:bundles avant
    // eux, tous dépendent seulement de build:manifest). Un rmSync de dist/ suivi d'une
    // réécriture ouvrait une fenêtre où le fichier n'existait pas (échec intermittent en CI).
    // On vide donc dist/ sélectivement : les artefacts de build:manifest (jamais régénérés
    // après ce script) et dist/styles/ (build:css, idem) restent en place, intacts.
    cleanDist(join(ROOT, 'dist'), {
        keep: [
            'custom-elements.json',
            'vscode.html-custom-data.json',
            'vscode.css-custom-data.json',
            'styles',
        ],
    });

    // cdn/ n'est lu par personne en parallèle : clean complet puis recréation.
    const cdnDir = join(ROOT, 'cdn');
    rmSync(cdnDir, { recursive: true, force: true });
    mkdirSync(cdnDir, { recursive: true });
}

// ─── Build NPM ────────────────────────────────────────────────────────────────

async function buildNpm() {
    const options = {
        ...commonOptions,
        entryPoints,
        outdir: join(ROOT, 'dist'),
        external: EXTERNALS_NPM,
        splitting: true,
        chunkNames: 'chunks/[name]-[hash]',
        banner: { js: 'const __DEV__ = process.env.NODE_ENV !== "production";' },
    };

    if (WATCH) {
        const ctx = await esbuild.context(options);
        await ctx.watch();
        console.log('[npm] watching...');
        return ctx;
    }

    return esbuild.build(options);
}

// ─── Build CDN dev ────────────────────────────────────────────────────────────

async function buildCdnDev() {
    const options = {
        ...commonOptions,
        entryPoints: cdnEntryPoints,
        outdir: join(ROOT, 'cdn'),
        outExtension: { '.js': '.dev.js' },
        minify: false,
        splitting: true,
        chunkNames: 'chunks/[name]-[hash]',
        define: { __DEV__: 'true' },
    };

    if (WATCH) {
        const ctx = await esbuild.context(options);
        await ctx.watch();
        console.log('[cdn] watching...');
        return ctx;
    }

    return esbuild.build(options);
}

// ─── Build CDN prod ───────────────────────────────────────────────────────────

async function buildCdnProd() {
    const options = {
        ...commonOptions,
        entryPoints: cdnEntryPoints,
        outdir: join(ROOT, 'cdn'),
        minify: true,
        splitting: true,
        chunkNames: 'chunks/[name]-[hash]',
        define: { __DEV__: 'false' },
        metafile: true,
        plugins: [minifyLitTemplatesPlugin()],
    };

    const result = await esbuild.build(options);

    if (result.metafile) {
        const outputs = result.metafile.outputs;
        const key = Object.keys(outputs).find((k) => k.endsWith('cdn/index.js'));
        const bytes = key ? outputs[key].bytes : 0;
        const kb = (bytes / 1024).toFixed(1);
        console.log(`\n✓ CDN prod bundle: ${kb} kB (minified)\n`);
    }

    return result;
}

// ─── Copie du manifest CEM dans dist/ ─────────────────────────────────────────

function copyCemManifest() {
    const src = join(ROOT, 'dist', 'custom-elements.json');
    if (existsSync(src)) {
        console.log('✓ custom-elements.json already in dist/');
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    try {
        console.log('Building bundles...\n');

        const cdnBuilds = [];
        if (!PROD_ONLY) cdnBuilds.push(buildCdnDev());
        if (!DEV_ONLY) cdnBuilds.push(buildCdnProd());

        await Promise.all([buildNpm(), ...cdnBuilds]);

        copyCemManifest();
        if (!WATCH) {
            console.log('✓ Build complete');
        }
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

main();
