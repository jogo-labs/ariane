import { mkdirSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';

/**
 * Vide `dir` en conservant les entrées de premier niveau listées dans `keep`.
 *
 * Contrairement à un `rmSync(dir)` suivi d'une réécriture des fichiers à préserver, une entrée
 * conservée n'est jamais retirée ni réécrite : il n'existe donc aucun instant où elle est
 * absente pour un lecteur concurrent (build:skill, build doc…). Une entrée conservée n'est pas
 * parcourue (`styles/` reste intact, y compris s'il s'agit d'un lien symbolique).
 *
 * Crée `dir` s'il n'existe pas.
 *
 * @param {string} dir
 * @param {{ keep?: string[] }} [options]
 * @returns {string[]} noms des entrées retirées
 */
export function cleanDist(dir, { keep = [] } = {}) {
    mkdirSync(dir, { recursive: true });
    const kept = new Set(keep);
    const removed = [];
    for (const name of readdirSync(dir)) {
        if (kept.has(name)) continue;
        const path = join(dir, name);
        rmSync(path, { recursive: true, force: true });
        removed.push(name);
    }
    return removed;
}
