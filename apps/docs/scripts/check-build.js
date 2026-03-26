/**
 * check-build.js
 *
 * Vérifie que le build Astro a bien généré les pages attendues.
 * À lancer après `astro build` via `npm run test:build`.
 *
 * Echec (exit 1) si une page est absente du dist/.
 */

import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');

// Pages statiques attendues dans le dist/
// Mettre à jour cette liste quand une nouvelle page statique est ajoutée.
const EXPECTED_PAGES = [
    'index.html',
    'getting-started/quickstart/index.html',
    'getting-started/utilisation/index.html',
    'foundations/tokens/index.html',
];

let hasError = false;

for (const page of EXPECTED_PAGES) {
    const fullPath = join(DIST, page);
    if (!existsSync(fullPath)) {
        console.error(`✗ Page manquante : ${page}`);
        hasError = true;
    } else {
        console.log(`✓ ${page}`);
    }
}

if (hasError) {
    console.error('\nBuild check echoue : des pages sont manquantes dans dist/.');
    process.exit(1);
} else {
    console.log('\nBuild check OK.');
}
