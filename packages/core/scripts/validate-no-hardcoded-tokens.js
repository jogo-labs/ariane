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

// Détecte var(--ar-xxx, fallback) en consommation. Capture group 2 = expression du
// fallback, potentiellement multi-lignes (cf. format a11y-fallback ci-dessous).
// `[^()]*(?:\([^()]*\)[^()]*)*` tolère un niveau d'imbrication de parenthèses dans
// le fallback (ex. `var(--a, var(--b))`, déjà présent dans dialog.styles.ts) sans
// tronquer la capture au premier `)` rencontré.
const VAR_FALLBACK_RE = /var\(\s*(--ar[\w-]+)\s*,\s*([^()]*(?:\([^()]*\)[^()]*)*)\)/dg;

// Mots-clés couleur système CSS4 autorisés comme fallback sans justification —
// liste fermée, cf. section « Garde-fou CI » de la spec. Exact match (pas de
// tolérance de casse) : `canvas` n'est pas équivalent à `Canvas`.
const SYSTEM_COLOR_KEYWORDS = new Set([
    'Canvas',
    'CanvasText',
    'ButtonBorder',
    'ButtonFace',
    'ButtonText',
    'Field',
    'FieldText',
    'GrayText',
]);

// Fallbacks structurels déjà sanctionnés par CLAUDE.md (section « Philosophie de
// conception ») : « Les fallbacks structurels (0px pour des compensations de
// layout) sont acceptables. » — ex. tab.styles.ts:20-21, `calc(-1 * var(--ar-tab-
// group-border-top-width, 0px))`. Pas une valeur de design, pas besoin de
// commentaire a11y-fallback.
const STRUCTURAL_LITERAL_KEYWORDS = new Set(['0px', '0']);

// Un fallback qui est lui-même une référence nue à un autre token --ar-* (sans son
// propre fallback) n'est pas une valeur de design codée en dur — c'est une cascade
// token-à-token déjà légitime dans le modèle actuel (ex. dialog.styles.ts:174-175,
// `var(--ar-dialog-spacing-block, var(--ar-dialog-spacing))`).
const BARE_TOKEN_FALLBACK_RE = /^var\(\s*--ar[\w-]+\s*\)$/;

// Commentaire de justification requis pour un fallback littéral hors liste système,
// au format exact (pas une simple tolérance de tout commentaire), sur la ligne
// immédiatement précédente la valeur.
const A11Y_FALLBACK_COMMENT_RE = /^\s*\/\* a11y-fallback: .+ \*\/\s*$/;

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

/**
 * Détecte les `var(--ar-*, <fallback>)` dont le fallback n'est ni un mot-clé
 * couleur système CSS4 whitelisté, ni un fallback structurel sanctionné (0px), ni
 * une référence nue à un autre token --ar-*, ni une valeur littérale justifiée par
 * un commentaire `/* a11y-fallback: <raison> *\/` sur la ligne immédiatement
 * précédente — cf. section « Garde-fou CI » de
 * docs/superpowers/specs/2026-07-22-css-fallback-accessibilite-design.md.
 *
 * @param {string} filePath chemin du fichier, utilisé uniquement pour le message d'erreur
 * @param {string} source contenu brut du fichier
 * @returns {string[]}
 */
export function findUnjustifiedFallbacks(filePath, source) {
    // Même technique de neutralisation que findHardcodedTokenAssignments : les
    // commentaires CSS sont blanchis (mais leurs retours à la ligne préservés) pour
    // ne pas faire matcher un var() mentionné en prose dans un commentaire.
    const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
        comment.replace(/[^\n]/g, ' '),
    );
    const rawLines = source.split('\n');

    const errors = [];
    VAR_FALLBACK_RE.lastIndex = 0;
    let match;
    while ((match = VAR_FALLBACK_RE.exec(withoutComments)) !== null) {
        const token = match[1];
        const fallback = match[2].trim();

        if (SYSTEM_COLOR_KEYWORDS.has(fallback)) continue;
        if (STRUCTURAL_LITERAL_KEYWORDS.has(fallback)) continue;
        if (BARE_TOKEN_FALLBACK_RE.test(fallback)) continue;

        // Ligne où débute la valeur réelle du fallback (après un éventuel
        // commentaire neutralisé/espace en tête) — c'est cette ligne qui sert de
        // référence pour vérifier la ligne a11y-fallback précédente, pas la ligne
        // où commence l'appel var() (qui peut être plusieurs lignes plus haut dans
        // le format multi-lignes).
        const [groupStart] = match.indices[2];
        const trimmedStart = groupStart + (match[2].length - match[2].trimStart().length);
        const valueLine = withoutComments.slice(0, trimmedStart).split('\n').length;

        const precedingLine = rawLines[valueLine - 2] ?? '';
        if (A11Y_FALLBACK_COMMENT_RE.test(precedingLine)) continue;

        errors.push(
            `${filePath}:${valueLine} — fallback "${fallback}" non justifié pour ${token} : ` +
                `utilisez un mot-clé couleur système (${[...SYSTEM_COLOR_KEYWORDS].join(', ')}) ` +
                `ou un commentaire /* a11y-fallback: <raison> */ sur la ligne précédente`,
        );
    }
    return errors;
}
