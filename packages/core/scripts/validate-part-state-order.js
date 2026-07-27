/**
 * Détecte un ::part(x) de base déclaré après son ::part(x-état) correspondant dans
 * default.css — les règles ::part() de même spécificité se départagent par ordre de
 * déclaration (la dernière l'emporte), donc une base après sa variante d'état ferait
 * perdre la base au profit de l'état, y compris hors contexte actif.
 *
 * Heuristique : un nom de part B est considéré variante d'état d'un nom A (déclaré
 * dans le même bloc de composant) si B commence par `${A}-`. Limite connue : un part
 * non lié nommé `<A>-<suffixe>` (ex. `step`/`step-link`) serait à tort considéré comme
 * variante si les deux étaient un jour stylés dans le même bloc default.css — cas rare,
 * à corriger au cas par cas si rencontré (renommage ou réordonnancement).
 *
 * Utilisé par `cem.config.js` (hook `packageLinkPhase`) pour faire échouer
 * `npm run build:manifest` en cas de détection — cf.
 * docs/superpowers/specs/2026-07-27-part-state-multiplication-design.md
 */

const COMPONENT_BLOCK_RE = /^[ \t]*(ar-[\w-]+)[^{\n]*\{/gm;
const PART_RE = /::part\(([\w-]+)\)/g;

/**
 * @param {string} source
 * @param {number} openBraceIndex index (dans source) de l'accolade ouvrante
 * @returns {number} index de l'accolade fermante correspondante
 */
function findMatchingBrace(source, openBraceIndex) {
    let depth = 1;
    for (let i = openBraceIndex + 1; i < source.length; i++) {
        if (source[i] === '{') depth++;
        else if (source[i] === '}') {
            depth--;
            if (depth === 0) return i;
        }
    }
    throw new Error('Accolade fermante introuvable dans default.css');
}

/**
 * Découpe `source` en blocs de composant top-level (`ar-<nom> { ... }`), en gérant
 * l'imbrication CSS native (`&::part(x) { ... }`) via un comptage d'accolades.
 *
 * @param {string} source
 * @returns {{ component: string, body: string, bodyStartLine: number }[]}
 */
export function findComponentBlocks(source) {
    const blocks = [];
    COMPONENT_BLOCK_RE.lastIndex = 0;
    let match;
    while ((match = COMPONENT_BLOCK_RE.exec(source)) !== null) {
        const component = match[1];
        const openBraceIndex = match.index + match[0].length - 1;
        const closeBraceIndex = findMatchingBrace(source, openBraceIndex);
        const body = source.slice(openBraceIndex + 1, closeBraceIndex);
        const bodyStartLine = source.slice(0, openBraceIndex + 1).split('\n').length;
        blocks.push({ component, body, bodyStartLine });
    }
    return blocks;
}

/**
 * @param {string} body
 * @param {number} bodyStartLine
 * @returns {Map<string, number>} nom de part → première ligne de déclaration
 */
function findPartOccurrences(body, bodyStartLine) {
    const occurrences = new Map();
    PART_RE.lastIndex = 0;
    let match;
    while ((match = PART_RE.exec(body)) !== null) {
        const name = match[1];
        if (occurrences.has(name)) continue;
        const line = bodyStartLine + body.slice(0, match.index).split('\n').length - 1;
        occurrences.set(name, line);
    }
    return occurrences;
}

/**
 * @param {string} filePath chemin du fichier, utilisé uniquement pour le message d'erreur
 * @param {string} source contenu brut de default.css
 * @returns {string[]}
 */
export function findPartStateOrderErrors(filePath, source) {
    const errors = [];
    for (const { component, body, bodyStartLine } of findComponentBlocks(source)) {
        const occurrences = findPartOccurrences(body, bodyStartLine);
        const names = [...occurrences.keys()];
        for (const stateName of names) {
            for (const baseName of names) {
                if (baseName === stateName) continue;
                if (!stateName.startsWith(`${baseName}-`)) continue;
                const baseLine = /** @type {number} */ (occurrences.get(baseName));
                const stateLine = /** @type {number} */ (occurrences.get(stateName));
                if (stateLine < baseLine) {
                    errors.push(
                        `${filePath}:${stateLine} — ${component}::part(${stateName}) déclaré ` +
                            `avant ${component}::part(${baseName}) : la règle de base doit ` +
                            `toujours précéder ses parts d'état`,
                    );
                }
            }
        }
    }
    return errors;
}
