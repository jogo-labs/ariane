// utils/transverse-roles.ts

import { getSlug } from './tag-name.ts';

/**
 * Rôles ::part() transverses reconnus (hors racine, qui varie par composant —
 * voir isTransversePart). Source de vérité unique, à tenir synchronisée avec
 * la table de /getting-started/naming-conventions.
 */
export const TRANSVERSE_ROLES = [
    'panel',
    'body',
    'trigger',
    'header',
    'footer',
    'control',
    'field',
    'input',
    'select',
    'action-button',
    'indicator',
    'label',
    'icon',
] as const;

/**
 * Détecte si un nom de part porte un rôle transverse — soit un rôle du
 * catalogue ci-dessus, soit le part racine (nom du composant sans préfixe,
 * ex. "charcounter" pour ar-charcounter), seul rôle transverse qui varie par
 * composant.
 */
export function isTransversePart(partName: string, tagName: string): boolean {
    if (partName === getSlug(tagName)) return true;
    return (TRANSVERSE_ROLES as readonly string[]).includes(partName);
}
