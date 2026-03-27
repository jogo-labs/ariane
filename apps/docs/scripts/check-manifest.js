#!/usr/bin/env node
/**
 * Vérifie que le Custom Elements Manifest est disponible avant de lancer Astro.
 *
 * Depuis la racine, `npm run dev` garantit que `build:manifest` a tourné avant
 * de démarrer les watchers — ce script est un filet de sécurité pour les lancements
 * directs (`npm run dev --workspace=apps/docs`).
 */
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(__dirname, '../../../packages/core/dist/custom-elements.json');

if (existsSync(manifestPath)) {
    try {
        JSON.parse(readFileSync(manifestPath, 'utf-8'));
        process.exit(0);
    } catch {
        // JSON invalide — probablement une écriture en cours
    }
}

console.error('❌ custom-elements.json introuvable ou invalide.');
console.error('   Lance : npm run build:manifest --workspace=packages/core\n');
process.exit(1);
