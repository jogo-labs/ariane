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

/**
 * Compare les `@cssprop [--nom=valeur]` déjà résolus dans le manifest CEM
 * aux valeurs réelles du thème par défaut. Ne modifie rien : retourne la liste
 * des désaccords trouvés (tableau vide si tout est cohérent).
 *
 * @param {{ modules?: Array<{ declarations?: Array<{ name: string, cssProperties?: Array<{ name: string, default?: string }> }> }> }} customElementsManifest
 * @param {Map<string, string>} themeTokens
 * @returns {string[]}
 */
export function validateCssPropertyDefaults(customElementsManifest, themeTokens) {
    const errors = [];
    for (const mod of customElementsManifest.modules ?? []) {
        for (const decl of mod.declarations ?? []) {
            for (const prop of decl.cssProperties ?? []) {
                if (prop.default === undefined) continue;
                const themeValue = themeTokens.get(prop.name);
                if (themeValue === undefined) continue;
                if (prop.default !== themeValue) {
                    errors.push(
                        `${decl.name} : ${prop.name} déclare [default=${prop.default}] dans le JSDoc mais default.css définit "${themeValue}"`,
                    );
                }
            }
        }
    }
    return errors;
}
