/**
 * Retire du manifest les exports « custom-element-definition » orphelins — pointant vers une
 * déclaration absente de `mod.declarations` sur l'ensemble des modules.
 *
 * `@custom-elements-manifest/analyzer` reconnaît nativement `@internal` (comme `@ignore`) en
 * JSDoc sur une classe : sa déclaration et son export `js` sont déjà exclus du manifest sans
 * rien coder côté projet (`hasIgnoreJSDoc`, `src/utils/ast-helpers.js` de l'analyzer). Vérifié
 * empiriquement (#247) : ça suffit pour un mini custom element défini et enregistré
 * (`customElements.define()`) dans le même fichier — mais quand l'enregistrement vit dans un
 * fichier séparé (pattern `index.ts` de ce projet, ex. `ar-datepicker`), l'export
 * `custom-element-definition` de ce fichier séparé subsiste, référençant une déclaration qui a
 * disparu — un résidu (juste un tag + un pointeur mort, pas les membres/attributs/slots) mais
 * un résidu quand même dans `dist/custom-elements.json` (publié sur npm, cf. `package.json`
 * `"customElements"`). Cette fonction nettoie ce cas générique, quelle qu'en soit la cause
 * (`@internal` ou toute autre raison pour laquelle une déclaration serait absente).
 *
 * Mute `customElementsManifest` en place et retourne les tags retirés, pour logging/tests.
 *
 * @param {{ modules?: Array<{
 *   declarations?: Array<{ name: string }>,
 *   exports?: Array<{ kind: string, name: string, declaration?: { name: string } }>,
 * }> }} customElementsManifest
 * @returns {string[]}
 */
export function pruneDanglingCustomElementExports(customElementsManifest) {
    const modules = customElementsManifest.modules ?? [];

    const knownDeclarationNames = new Set();
    for (const mod of modules) {
        for (const d of mod.declarations ?? []) knownDeclarationNames.add(d.name);
    }

    const removed = [];
    for (const mod of modules) {
        mod.exports = (mod.exports ?? []).filter((e) => {
            const isDangling =
                e.kind === 'custom-element-definition' &&
                !knownDeclarationNames.has(e.declaration?.name);
            if (isDangling) removed.push(e.name);
            return !isDangling;
        });
    }

    return removed;
}
