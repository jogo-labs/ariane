/**
 * Extrait et valide les valeurs par défaut des CSS custom properties (`@cssprop`)
 * documentées à la main dans le JSDoc des composants, en les comparant à leur
 * définition réelle dans le thème par défaut (`src/styles/themes/default.css`).
 *
 * Utilisé par `cem.config.js` (hook `packageLinkPhase`) pour faire échouer
 * `npm run build:manifest` en cas de désaccord — cf. docs/superpowers/specs/2026-07-16-cem-theme-default-sync-design.md
 */

const TOKEN_RE = /(--ar[\w-]+)\s*:\s*([^;]+)/g;

/**
 * Parse un fichier CSS de thème et retourne une map nom de token → valeur nettoyée
 * (commentaire `/* ... *\/` trailing retiré, valeur triée). Ignore le nesting
 * (`@layer`/`:root`) — la regex matche sur le contenu brut du fichier.
 *
 * @param {string} css
 * @returns {Map<string, string>}
 */
export function extractThemeTokens(css) {
    const tokens = new Map();
    TOKEN_RE.lastIndex = 0;
    let match;
    while ((match = TOKEN_RE.exec(css)) !== null) {
        const name = match[1].trim();
        const value = match[2].split('/*')[0].trim();
        tokens.set(name, value);
    }
    return tokens;
}
