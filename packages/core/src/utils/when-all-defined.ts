export interface WhenAllDefinedOptions {
    /**
     * Préfixe des tags à attendre. Par défaut, celui configuré via
     * `window.ARIANE_CONFIG.prefix` (CDN) ou `'ar-'` si absent. En import headless,
     * passer le préfixe utilisé pour `customElements.define()`.
     */
    prefix?: string;
    /**
     * Point de départ du scan. Par défaut `document`. Passer un élément ou un shadow root
     * pour limiter l'attente à ce sous-arbre.
     */
    root?: ParentNode;
}

/**
 * Attend que les custom elements du préfixe donné présents sous `root` soient définis dans
 * le registre CustomElementRegistry. Les shadow roots ouverts sont parcourus, et le scan est
 * répété tant que de nouveaux tags non définis apparaissent : un composant imbriqué n'existe
 * dans le DOM qu'après la définition de son parent. Les shadow roots fermés ne sont pas
 * atteignables.
 *
 * @returns Promise résolue quand plus aucun élément correspondant n'est en attente.
 *
 * @example
 * import { whenAllDefined } from '@ariane-ui/core/utils';
 * await whenAllDefined();
 * // Tous les ar-* (ou le préfixe configuré via ARIANE_CONFIG) présents dans la page sont prêts
 *
 * @example
 * await whenAllDefined({ prefix: 'acme-' });
 * // Attend les éléments avec un préfixe personnalisé (usage headless/npm)
 *
 * @example
 * await whenAllDefined({ root: checkoutSection });
 * // Attend uniquement les éléments de ce sous-arbre
 */
export async function whenAllDefined({
    prefix = `${window.ARIANE_CONFIG?.prefix ?? 'ar'}-`,
    root = document,
}: WhenAllDefinedOptions = {}): Promise<void> {
    for (;;) {
        const tags = collectUndefinedTags(root, prefix);
        if (tags.size === 0) return;
        await Promise.all([...tags].map((tag) => customElements.whenDefined(tag)));
    }
}

function collectUndefinedTags(root: ParentNode, prefix: string): Set<string> {
    const tags = new Set<string>();
    const elements = root instanceof Element ? [root] : [];
    elements.push(...root.querySelectorAll('*'));

    for (const el of elements) {
        const { localName } = el;
        if (localName.startsWith(prefix) && !customElements.get(localName)) {
            tags.add(localName);
        }
        if (el.shadowRoot) {
            for (const tag of collectUndefinedTags(el.shadowRoot, prefix)) tags.add(tag);
        }
    }
    return tags;
}
