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
 *  cdn/           → bundle CDN dev : tout inclus (lit bundlé), non minifié, __DEV__ = true.
 *                   Destiné au développement local via <script type="module">.
 *
 *  cdn/*.prod.js  → bundle CDN prod : tout inclus, minifié, __DEV__ = false (dead-code
 *                   éliminé). Destiné à la production via un CDN.
 *
 * CLI flags :
 *   --dev   → npm + CDN dev seulement
 *   --prod  → npm + CDN prod seulement
 *   --watch → npm + CDN dev en watch (prod inutile en watch)
 *   (aucun) → npm + CDN dev + CDN prod (mode CI)
 */

import esbuild from 'esbuild';
import { readdirSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

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
    ...Object.fromEntries(componentFiles.map((f) => [toEntryKey(f), f])),
};

const cdnEntryPoints = {
    index: join(SRC, 'index.ts'),
    autoloader: join(SRC, 'autoloader.ts'),
};

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

// Préserver custom-elements.json pendant le clean : la doc Astro peut en avoir
// besoin pendant que ce build tourne (race condition Turbo avec les tâches persistent).
const manifestPath = join(ROOT, 'dist', 'custom-elements.json');
let preservedManifest = null;
if (existsSync(manifestPath)) {
    preservedManifest = readFileSync(manifestPath, 'utf-8');
}

for (const dir of ['dist', 'cdn']) {
    const target = join(ROOT, dir);
    if (existsSync(target)) {
        rmSync(target, { recursive: true });
    }
    mkdirSync(target, { recursive: true });
}

if (preservedManifest !== null) {
    writeFileSync(manifestPath, preservedManifest, 'utf-8');
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
        outExtension: { '.js': '.prod.js' },
        minify: true,
        splitting: true,
        chunkNames: 'chunks/[name]-[hash]',
        define: { __DEV__: 'false' },
        metafile: true,
    };

    const result = await esbuild.build(options);

    if (result.metafile) {
        const outputs = result.metafile.outputs;
        const key = Object.keys(outputs).find((k) => k.endsWith('index.prod.js'));
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
