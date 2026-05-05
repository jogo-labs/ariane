#!/usr/bin/env node
/**
 * Vérifie que le Custom Elements Manifest est disponible avant de lancer Astro.
 *
 * Depuis la racine, `npm run dev` garantit que `build:manifest` a tourné avant
 * de démarrer les watchers — ce script est un filet de sécurité pour les lancements
 * directs (`npm run dev --workspace=apps/docs`).
 *
 * Le retry absorbe la race condition de restauration du cache Turbo : lors du
 * démarrage de `turbo run dev`, les restorations de cache de packages/core#build
 * et packages/core#build:manifest s'exécutent en parallèle, créant une brève
 * fenêtre où dist/ est en cours de remplacement (rimraf → copie).
 */
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(__dirname, '../../../packages/core/dist/custom-elements.json');

const MAX_ATTEMPTS = 6;
const DELAY_MS = 500;

function isManifestValid() {
    if (!existsSync(manifestPath)) return false;
    try {
        JSON.parse(readFileSync(manifestPath, 'utf-8'));
        return true;
    } catch {
        return false;
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        if (isManifestValid()) process.exit(0);
        if (attempt < MAX_ATTEMPTS) await sleep(DELAY_MS);
    }

    console.error('❌ custom-elements.json introuvable ou invalide.');
    console.error('   Lance : npm run build:manifest --workspace=packages/core\n');
    process.exit(1);
}

main();
