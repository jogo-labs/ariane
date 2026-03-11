#!/usr/bin/env node
/**
 * Attend que le Custom Elements Manifest soit disponible avant de lancer Astro.
 *
 * Pourquoi "attendre" et pas juste "vérifier l'existence" ?
 * En mode `npm run dev` depuis la racine, Turbo lance les tâches en parallèle.
 * Le core peut être en train de builder (clean + rebuild) au moment où la doc démarre.
 * Le fichier peut donc exister puis disparaître (pendant le clean) puis réapparaître.
 * Un simple existsSync() arriverait potentiellement dans cette fenêtre.
 *
 * On poll donc le fichier jusqu'à ce qu'il soit stable (même contenu sur 2 checks consécutifs),
 * ce qui garantit que le build est terminé et le fichier complet.
 */
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(__dirname, '../../../packages/core/dist/custom-elements.json');

const POLL_INTERVAL_MS = 300;
const TIMEOUT_MS = 30_000;
const STABLE_CHECKS = 2; // nb de lectures identiques consécutives pour valider la stabilité

async function waitForManifest() {
    const start = Date.now();
    let stableCount = 0;
    let lastContent = null;

    process.stdout.write('⏳ En attente du Custom Elements Manifest');

    while (Date.now() - start < TIMEOUT_MS) {
        if (existsSync(manifestPath)) {
            try {
                const content = readFileSync(manifestPath, 'utf-8');

                // Vérifier que c'est du JSON valide et non-vide (pas un fichier en cours d'écriture)
                JSON.parse(content);

                if (content === lastContent) {
                    stableCount++;
                    if (stableCount >= STABLE_CHECKS) {
                        process.stdout.write(' ✓\n');
                        return;
                    }
                } else {
                    // Contenu différent du check précédent → le fichier est encore en cours de modification
                    stableCount = 0;
                    lastContent = content;
                }
            } catch {
                // JSON invalide → écriture en cours, on continue à poller
                stableCount = 0;
                lastContent = null;
            }
        }

        process.stdout.write('.');
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    process.stdout.write('\n');
    console.error('\n❌ Timeout : custom-elements.json non disponible après 30s.');
    console.error('   Lance manuellement : cd packages/core && npm run build:manifest\n');
    process.exit(1);
}

await waitForManifest();
