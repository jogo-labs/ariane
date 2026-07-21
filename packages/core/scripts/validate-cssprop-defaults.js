/**
 * Extrait les tokens du thème par défaut (`src/styles/themes/default.css`) et
 * vérifie que chaque token appartenant à un composant a bien une entrée
 * `@cssprop` dans son JSDoc — un trou de documentation silencieux.
 *
 * Utilisé par `cem.config.js` (hook `packageLinkPhase`) pour faire échouer
 * `npm run build:manifest` en cas de trou — cf. docs/superpowers/specs/2026-07-16-cem-theme-default-sync-design.md
 */

const TOKEN_RE = /(--ar[\w-]+)\s*:\s*([^;]+)/g;

/**
 * Marqueur du début des surcharges dark mode dans `default.css` : le bloc manuel
 * `:root[data-theme='dark']` ou le bloc automatique `@media (prefers-color-scheme: dark)`.
 * Par convention, le thème de base (`:root`) est toujours déclaré avant ces blocs.
 */
const DARK_OVERRIDE_RE =
    /:root\[data-theme=['"]dark['"]\]|@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)/;

/**
 * Parse un fichier CSS de thème et retourne une map nom de token → valeur nettoyée
 * (commentaire `/* ... *\/` trailing retiré, valeur triée). Ignore le nesting
 * (`@layer`/`:root`) — la regex matche sur le contenu brut du fichier. Ne considère
 * que le thème de base (`:root`), en ignorant tout ce qui suit le début des
 * surcharges dark mode (`:root[data-theme='dark']` ou `@media (prefers-color-scheme: dark)`),
 * pour ne pas confondre une valeur dark avec la valeur par défaut (claire) documentée
 * dans le JSDoc des composants.
 *
 * @param {string} css
 * @returns {Map<string, string>}
 */
export function extractThemeTokens(css) {
    const darkStart = css.search(DARK_OVERRIDE_RE);
    const baseCss = darkStart === -1 ? css : css.slice(0, darkStart);

    const tokens = new Map();
    TOKEN_RE.lastIndex = 0;
    let match;
    while ((match = TOKEN_RE.exec(baseCss)) !== null) {
        const name = match[1].trim();
        const value = match[2].split('/*')[0].trim().replace(/\s+/g, ' ');
        tokens.set(name, value);
    }
    return tokens;
}

/**
 * Détecte les tokens de default.css qui appartiennent à un composant (par
 * préfixe de tag, ex. --ar-alert-* pour <ar-alert>) mais qui n'ont aucune
 * entrée @cssprop dans le JSDoc de ce composant — un trou de documentation
 * silencieux. Seule la présence d'une entrée cssProperties portant ce nom est
 * vérifiée (aucun concept de valeur par défaut à comparer : ni le JSDoc ni la
 * doc générée n'en documentent, cf. suppression de la colonne « Défaut »).
 *
 * L'appartenance à un composant se détermine par préfixe de tag le plus long
 * (ex. --ar-tab-group-active-shadow appartient à <ar-tab-group>, pas à
 * <ar-tab>, même si les deux tags matchent le préfixe textuellement) — sans
 * ce tri, un composant au tag plus court (ar-tab) capterait à tort les
 * tokens d'un composant au tag plus long qui commence par le même préfixe
 * (ar-tab-group). Un token dont aucun tag ne matche le préfixe (tokens
 * globaux du thème comme --ar-color-*, --ar-spacing-*) est ignoré : ces
 * tokens n'appartiennent à aucun composant, ce n'est pas un trou de doc.
 *
 * @param {{ modules?: Array<{ declarations?: Array<{ name: string, tagName?: string, customElement?: boolean, cssProperties?: Array<{ name: string, default?: string }> }> }> }} customElementsManifest
 * @param {Map<string, string>} themeTokens
 * @returns {string[]}
 */
export function validateCssPropertyCoverage(customElementsManifest, themeTokens) {
    const declarations = [];
    for (const mod of customElementsManifest.modules ?? []) {
        for (const decl of mod.declarations ?? []) {
            if (decl.customElement && decl.tagName) {
                declarations.push(decl);
            }
        }
    }
    const byPrefixLength = [...declarations].sort((a, b) => b.tagName.length - a.tagName.length);

    const errors = [];
    for (const tokenName of themeTokens.keys()) {
        const owner = byPrefixLength.find((decl) => tokenName.startsWith(`--${decl.tagName}-`));
        if (!owner) continue;
        const documented = (owner.cssProperties ?? []).some((prop) => prop.name === tokenName);
        if (!documented) {
            errors.push(
                `${owner.name} : le token ${tokenName} est défini dans default.css mais n'a pas d'entrée @cssprop`,
            );
        }
    }
    return errors;
}
