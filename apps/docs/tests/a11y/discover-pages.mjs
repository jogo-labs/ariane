import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(__dirname, '..', '..', 'dist');

/**
 * Parcourt `dist/` (build Astro) et retourne les routes de toutes les pages
 * statiques générées (une entrée `index.html` → une route), sans liste à
 * maintenir à la main — contrairement à `scripts/check-build.js` qui ne
 * vérifie qu'un sous-ensemble de pages statiques connues.
 *
 * @returns {string[]} routes, ex. ['/', '/components/alert/', ...]
 */
export function discoverPages() {
    const routes = [];

    function walk(dir) {
        for (const entry of readdirSync(dir)) {
            const fullPath = join(dir, entry);
            if (statSync(fullPath).isDirectory()) {
                walk(fullPath);
                continue;
            }
            if (entry !== 'index.html') continue;
            const rel = relative(DIST, fullPath).split(sep).slice(0, -1).join('/');
            routes.push(rel ? `/${rel}/` : '/');
        }
    }

    walk(DIST);
    return routes.sort();
}
