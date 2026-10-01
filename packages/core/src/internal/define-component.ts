/**
 * Enregistre un composant sous le tag que le consommateur a choisi : `window.ARIANE_CONFIG.prefix`
 * s'il est défini, sinon le préfixe du tag par défaut. C'est le mécanisme commun à tous les
 * points d'entrée qui enregistrent (`index.ts` de chaque composant, donc le barrel, le bundle
 * CDN et les imports par composant) ; l'autoloader lit la même configuration de son côté.
 *
 * `defaultTag` est le tag par défaut en littéral (`ar-table-sort`) : son préfixe est ce qui précède
 * le premier `-` (il ne contient donc pas de tiret), le nom ce qui suit (`table-sort`). Le préfixe
 * du consommateur est utilisé tel quel, avec ou sans tiret (`acme-ui`). Il n'est pas validé : un
 * préfixe invalide fait lever à `customElements.define` une erreur native explicite.
 *
 * Idempotent : un tag déjà défini est conservé. Le préfixe est lu au moment de l'appel, donc à
 * l'import du composant : la configuration doit être posée avant la librairie.
 */
export function defineComponent(defaultTag: string, component: CustomElementConstructor): void {
    const dash = defaultTag.indexOf('-');
    const defaultPrefix = defaultTag.slice(0, dash);
    const name = defaultTag.slice(dash + 1);
    const tag = `${window.ARIANE_CONFIG?.prefix ?? defaultPrefix}-${name}`;
    if (!customElements.get(tag)) customElements.define(tag, component);
}
