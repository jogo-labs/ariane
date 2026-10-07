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
import { unscopedSelectors } from '../../../scripts/starter-kit/scope-theme.js';

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
    } else if (unscopedSelectors(demoCss, 'doc-demo').length > 0) {
        console.error('✗ themes/doc-demo.css contient des sélecteurs hors .doc-demo :');
        for (const selector of unscopedSelectors(demoCss, 'doc-demo')) {
            console.error(`    ${selector}`);
        }
        hasError = true;
    } else {
        console.log('✓ themes/doc-demo.css');
    }
}

// robots.txt et sitemap (#276) : le domaine principal est ariane-ui.com ; le sitemap ne doit
// lister que des URL de ce domaine, et robots.txt doit le désigner.
const SITE = 'https://ariane-ui.com';
const ROBOTS = join(DIST, 'robots.txt');
const SITEMAP_INDEX = join(DIST, 'sitemap-index.xml');
const SITEMAP = join(DIST, 'sitemap-0.xml');
if (!existsSync(ROBOTS) || !existsSync(SITEMAP_INDEX) || !existsSync(SITEMAP)) {
    console.error('✗ robots.txt, sitemap-index.xml ou sitemap-0.xml manquant dans dist/');
    hasError = true;
} else {
    const robots = readFileSync(ROBOTS, 'utf8');
    const urls = [...readFileSync(SITEMAP, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(
        (m) => m[1],
    );
    const problems = [];
    if (!robots.includes(`Sitemap: ${SITE}/sitemap-index.xml`)) {
        problems.push(`robots.txt doit contenir « Sitemap: ${SITE}/sitemap-index.xml »`);
    }
    if (/^\s*Disallow:\s*\/\s*$/m.test(robots)) {
        problems.push('robots.txt interdit tout le site (Disallow: /)');
    }
    const foreign = urls.filter((url) => !url.startsWith(`${SITE}/`));
    if (foreign.length > 0) {
        problems.push(`le sitemap liste des URL hors ${SITE} : ${foreign.slice(0, 3).join(', ')}`);
    }
    const missing = EXPECTED_PAGES.map(
        (page) => `${SITE}/${page.replace(/index\.html$/, '')}`,
    ).filter((url) => !urls.includes(url));
    if (missing.length > 0) {
        problems.push(`pages absentes du sitemap : ${missing.slice(0, 3).join(', ')}`);
    }
    if (problems.length > 0) {
        for (const problem of problems) console.error(`✗ ${problem}`);
        hasError = true;
    } else {
        console.log(`✓ robots.txt et sitemap (${urls.length} URL)`);
    }
}

if (hasError) {
    console.error('\nBuild check echoue : des pages sont manquantes dans dist/.');
    process.exit(1);
} else {
    console.log('\nBuild check OK.');
}
