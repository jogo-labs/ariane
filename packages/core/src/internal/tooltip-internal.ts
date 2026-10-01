import { ArTooltip } from '../components/tooltip/tooltip.js';

/**
 * Tag privé du tooltip embarqué par d'autres composants (aujourd'hui `ar-table-sort`). Partagé :
 * un seul enregistrement quel que soit le nombre de composants qui l'embarquent. Il ne commence
 * pas par `ar-` (pas de collision avec une autre librairie, ni de dépendance au préfixe choisi
 * par le consommateur) et n'est pas contractuel.
 */
const INTERNAL_TOOLTIP_TAG = 'ariane-internal-tooltip';

/**
 * Tooltip embarqué par d'autres composants, enregistré sous un tag privé.
 *
 * Une même classe ne peut pas être enregistrée sous deux noms (`NotSupportedError`) : ce tooltip
 * est donc une sous-classe, et `ArTooltip` reste librement enregistrable par le consommateur sous
 * le tag de son choix. Les règles CSS du consommateur n'atteignent pas un élément situé dans le
 * shadow DOM d'un autre composant : seuls les tokens `--ar-tooltip-*` le personnalisent.
 *
 * Ce dossier `src/internal/` est volontairement hors de `src/components/` : `build-bundles.js` fait de
 * chaque fichier `.ts` de `components/` une entrée publiée (`dist/components/…`, importable via
 * `exports["./dist/*"]`), ce que cette classe ne doit pas être. Elle ne sort que dans des chunks.
 *
 * Cette classe et son `customElements.define` doivent rester dans le même fichier : l'analyseur
 * de manifeste ne lit `@internal` que sur une classe de premier niveau retrouvée dans le fichier
 * de l'appel `define`. Ailleurs, un composant fantôme apparaît dans `custom-elements.json` et la
 * documentation ne compile plus.
 *
 * @internal
 */
export class ArTooltipInternal extends ArTooltip {}

/**
 * Enregistre le tooltip interne sous son tag privé, de façon idempotente. À appeler au premier
 * usage (`connectedCallback` du composant qui l'embarque), jamais à l'import : l'entrée
 * `/headless` ne doit rien enregistrer.
 *
 * @internal
 */
export function defineInternalTooltip(): void {
    if (!customElements.get(INTERNAL_TOOLTIP_TAG)) {
        customElements.define(INTERNAL_TOOLTIP_TAG, ArTooltipInternal);
    }
}
