// utils/state-parts.ts

/**
 * Détecte si un nom de part est un part d'état (convention BEM double-tiret,
 * `<élément>--<état>`, ex. "bullet--current", "count--warning") — source de vérité
 * unique, à tenir synchronisée avec la table de /getting-started/naming-conventions.
 */
export function isStatePart(partName: string): boolean {
    return partName.includes('--');
}
