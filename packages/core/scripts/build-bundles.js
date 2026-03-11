#!/usr/bin/env node
/**
 * build-bundles.js
 *
 * Produit deux bundles distincts :
 *
 *  dist/   → bundle NPM : lit est "external", tree-shakeable, destiné aux bundlers (Vite, webpack).
 *            Les utilisateurs importent les composants individuellement ou via le barrel.
 *
 *  cdn/    → bundle CDN : tout inclus (lit bundlé dedans), un seul fichier auto-contenu.
 *            Destiné à être chargé via <script type="module"> depuis un CDN.
 *
 * Pourquoi deux cibles séparées ?
 * Le bundle npm suppose qu'un bundler en aval dédupliquera lit (et d'autres deps partagées).
 * Le bundle CDN ne peut pas faire cette supposition → tout est bundlé.
 */

import esbuild from 'esbuild';
import { readdirSync, mkdirSync, copyFileSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');
const WATCH = process.argv.includes('--watch');

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
        } else if (
            entry.name.endsWith('.ts') &&
            !excludePatterns.some((p) => p.test(fullPath))
        ) {
            results.push(fullPath);
        }
    }
    return results;
}

// ─── Entrées du bundle ────────────────────────────────────────────────────────

// Barrel principal + chaque composant comme entry point individuel
// → permet d'importer un composant seul sans charger toute la lib
const componentFiles = findTsFiles(join(SRC, 'components'), [
    /\.test\.ts$/,
    /\.styles\.ts$/,
]);

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
// besoin pendant que ce build tourne (race condition Turbo en mode dev --parallel).
// Le manifest est regénéré juste après par build:manifest, pas par ce script.
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

// Restaure immédiatement le manifest pour que la doc ne tombe pas pendant le build
if (preservedManifest !== null) {
    writeFileSync(manifestPath, preservedManifest, 'utf-8');
}

// ─── Build NPM ────────────────────────────────────────────────────────────────

async function buildNpm() {
    const options = {
        ...commonOptions,
        entryPoints,
        outdir: join(ROOT, 'dist'),
        // lit reste external → dédupliqué par Vite/webpack côté consommateur
        external: EXTERNALS_NPM,
        // Splitting permet de partager le code commun entre composants sans le dupliquer
        splitting: true,
        chunkNames: 'chunks/[name]-[hash]',
    };

    if (WATCH) {
        const ctx = await esbuild.context(options);
        await ctx.watch();
        console.log('[npm] watching...');
        return ctx;
    }

    return esbuild.build(options);
}

// ─── Build CDN ────────────────────────────────────────────────────────────────

async function buildCdn() {
    const options = {
        ...commonOptions,
        entryPoints: {
            index: join(SRC, 'index.ts'),
            autoloader: join(SRC, 'autoloader.ts'),
        },
        outdir: join(ROOT, 'cdn'),
        // Ici on ne met RIEN en external : tout est bundlé dans le fichier final
        minify: !WATCH,
        splitting: true,
        chunkNames: 'chunks/[name]-[hash]',
        metafile: true, // utile pour analyser le bundle (esbuild --analyze)
    };

    if (WATCH) {
        const ctx = await esbuild.context(options);
        await ctx.watch();
        console.log('[cdn] watching...');
        return ctx;
    }

    const result = await esbuild.build(options);

    // Afficher la taille du bundle CDN principal pour surveiller la régression
    if (result.metafile) {
        const bytes = result.metafile.outputs['cdn/index.js']?.bytes ?? 0;
        const kb = (bytes / 1024).toFixed(1);
        console.log(`\n✓ CDN bundle: ${kb} kB (minified)\n`);
    }

    return result;
}

// ─── Copie du manifest CEM dans dist/ ─────────────────────────────────────────

function copyCemManifest() {
    const src = join(ROOT, 'dist', 'custom-elements.json');
    // Le manifest est déjà dans dist/ grâce à cem analyze --outdir dist
    // Cette étape existe au cas où le manifest serait ailleurs
    if (existsSync(src)) {
        console.log('✓ custom-elements.json already in dist/');
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    try {
        console.log('Building bundles...\n');
        await Promise.all([buildNpm(), buildCdn()]);
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
