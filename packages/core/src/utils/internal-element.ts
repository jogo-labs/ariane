/**
 * Enregistre `base` sous un nom privé, pour un composant qui en embarque un autre dans son
 * shadow DOM sans dépendre des tags choisis par le consommateur ni de ses préfixes.
 *
 * Une classe ne peut pas être enregistrée sous deux noms (`NotSupportedError`) : l'élément privé
 * est une sous-classe, et `base` reste librement enregistrable par le consommateur. Sans effet
 * si le tag est déjà défini (plusieurs instances, ou plusieurs copies de la librairie).
 *
 * À appeler au premier usage (`connectedCallback`), jamais à l'import, pour que l'entrée
 * `/headless` n'enregistre rien. Le nom privé ne doit pas commencer par `ar-` (collision avec
 * une autre librairie) et n'est pas une surface de personnalisation : les règles CSS du
 * consommateur n'atteignent pas un élément du shadow DOM, seuls les tokens l'atteignent.
 */
export function defineInternalElement(tag: string, base: CustomElementConstructor): void {
    if (customElements.get(tag)) return;
    customElements.define(tag, class extends base {});
}
