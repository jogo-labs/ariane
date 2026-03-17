// utils/tag-name.ts

/**
 * Extrait le prefix d'un tag name custom element.
 * "ar-button"       → "mr"
 * "ft-stepper-item" → "ft"
 */
export function getPrefix(tagName: string): string {
    return tagName.split('-')[0];
}

/**
 * Extrait le slug (tag sans prefix) pour construire les URLs.
 * "ar-button"       → "button"
 * "ar-stepper-item" → "stepper-item"
 */
export function getSlug(tagName: string): string {
    return tagName.split('-').slice(1).join('-');
}

/**
 * Regroupe les composants par prefix.
 * Utile si la lib expose plusieurs familles (mr-*, ft-*...).
 * { "mr": [...], "ft": [...] }
 */
export function groupByPrefix<T extends { tagName?: string }>(
    components: T[],
): Record<string, T[]> {
    return components.reduce<Record<string, T[]>>((acc, c) => {
        const prefix = getPrefix(c.tagName ?? '');
        (acc[prefix] ??= []).push(c);
        return acc;
    }, {});
}
