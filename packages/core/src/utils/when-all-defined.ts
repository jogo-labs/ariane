/**
 * Attend que tous les custom elements avec le préfixe donné présents dans le document
 * soient définis dans le registre CustomElementRegistry.
 *
 * @param prefix - Préfixe des tags à attendre (défaut : 'ar-')
 * @returns Promise résolue quand tous les éléments correspondants sont définis.
 *
 * @example
 * import { whenAllDefined } from '@ariane-ui/core';
 * await whenAllDefined();
 * // Tous les ar-* présents dans la page sont prêts
 *
 * @example
 * await whenAllDefined('my-');
 * // Attend les éléments avec un préfixe personnalisé
 */
export function whenAllDefined(prefix = 'ar-'): Promise<CustomElementConstructor[]> {
    const tags = [
        ...new Set(
            [...document.querySelectorAll('*')]
                .map((el) => el.localName)
                .filter((name) => name.startsWith(prefix)),
        ),
    ];
    return Promise.all(tags.map((tag) => customElements.whenDefined(tag)));
}
