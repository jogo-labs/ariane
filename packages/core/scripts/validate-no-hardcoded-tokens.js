/**
 * Détecte les CSS custom properties `--ar-*` assignées avec une valeur littérale
 * dans un fichier `*.styles.ts`, plutôt qu'une référence `var()` vers un token
 * `default.css` — viole la philosophie headless du projet (aucune valeur de
 * design codée en dur dans un composant).
 *
 * Utilisé par `cem.config.js` (hook `packageLinkPhase`) pour faire échouer
 * `npm run build:manifest` en cas de détection — cf.
 * docs/superpowers/specs/2026-07-16-dialog-width-headless-tokens-design.md
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const HARDCODED_ASSIGNMENT_RE = /(--ar[\w-]+)\s*:(?!\s*var\()\s*[^;]+;/g;

/**
 * Recense récursivement tous les fichiers `*.styles.ts` sous `dir`.
 *
 * @param {string} dir
 * @returns {string[]} chemins absolus
 */
export function findStylesFiles(dir) {
    return readdirSync(dir, { recursive: true })
        .filter((relativePath) => relativePath.endsWith('.styles.ts'))
        .map((relativePath) => join(dir, relativePath));
}

/**
 * Détecte les assignations `--ar-*: <valeur littérale>;` dans le contenu d'un
 * fichier `*.styles.ts` (hors commentaires CSS, neutralisés avant la détection
 * pour éviter les faux positifs sur une mention en prose). Ne touche jamais aux
 * usages en consommation (`var(--ar-xxx, fallback)`), seulement aux assignations.
 *
 * @param {string} filePath chemin du fichier, utilisé uniquement pour le message d'erreur
 * @param {string} source contenu brut du fichier
 * @returns {string[]}
 */
export function findHardcodedTokenAssignments(filePath, source) {
    // Neutralise le contenu des commentaires /* ... */ sans changer la longueur
    // ni les retours à la ligne, pour garder des numéros de ligne exacts.
    const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
        comment.replace(/[^\n]/g, ' '),
    );

    const errors = [];
    HARDCODED_ASSIGNMENT_RE.lastIndex = 0;
    let match;
    while ((match = HARDCODED_ASSIGNMENT_RE.exec(withoutComments)) !== null) {
        const line = withoutComments.slice(0, match.index).split('\n').length;
        errors.push(
            `${filePath}:${line} — ${match[1]} codé en dur, doit référencer un token default.css via var()`,
        );
    }
    return errors;
}
