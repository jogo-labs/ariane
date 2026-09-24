import { readFileSync } from 'node:fs';

/**
 * Lit un manifest CEM (`custom-elements.json`) et retourne la liste des
 * custom elements publiés (tagName + summary). Filtre toute déclaration
 * sans tagName — notamment les classes de base non enregistrées comme
 * élément (ex. ArianeElement).
 */
export function readManifestComponents(manifestPath) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const components = [];
    for (const mod of manifest.modules ?? []) {
        for (const decl of mod.declarations ?? []) {
            if (decl.customElement && decl.tagName) {
                components.push({ tagName: decl.tagName, summary: decl.summary ?? '' });
            }
        }
    }
    return components;
}
