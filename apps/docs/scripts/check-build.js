/**
 * check-build.js
 *
 * Vérifie que le build Astro a bien généré les pages attendues.
 * À lancer après `astro build` via `npm run test:build`.
 *
 * Echec (exit 1) si une page est absente du dist/.
 */

import { existsSync, readFileSync } from 'node:fs';
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
    'getting-started/frameworks/index.html',
    'getting-started/traductions/index.html',
    'theming/overview/index.html',
    'theming/appliquer-un-theme/index.html',
    'theming/personnalisation-avancee/index.html',
    'theming/shadow-dom/index.html',
    'theming/tag-customization/index.html',
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

const DOC_DEMO_THEME = join(DIST, 'themes', 'doc-demo.css');
if (!existsSync(DOC_DEMO_THEME)) {
    console.error('✗ Thème des démos manquant : themes/doc-demo.css');
    hasError = true;
} else {
    const demoCss = readFileSync(DOC_DEMO_THEME, 'utf8');
    if (!demoCss.includes('.doc-demo') || demoCss.includes(':root')) {
        console.error('✗ themes/doc-demo.css doit être scopé sous .doc-demo (sans :root)');
        hasError = true;
    } else {
        console.log('✓ themes/doc-demo.css');
    }
}

if (hasError) {
    console.error('\nBuild check echoue : des pages sont manquantes dans dist/.');
    process.exit(1);
} else {
    console.log('\nBuild check OK.');
}
