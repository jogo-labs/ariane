import { LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ContextConsumer } from '@lit/context';

import { stepperContext, type StepperRegistry } from '../../context/stepper.context.js';

/**
 * @summary Élément enfant de mr-stepper.
 * @parent mr-stepper
 * @display docs
 */
@customElement('mr-stepper-item')
export class MrStepperItem extends LitElement {
    @property({ type: String }) path = '';
    @property({ type: String }) label = '';
    @property({ type: String }) href?: string;

    // Référence directe au registry, sans passer par un event pour unregister/notify.
    // Stocker la ref localement permet d'appeler unregisterItem() dans
    // disconnectedCallback sans dépendre du DOM (l'élément est déjà détaché à ce stade).
    private _registry?: StepperRegistry | undefined;

    // Le ContextConsumer prend en charge les items ajoutés DYNAMIQUEMENT
    // après que ft-stepper soit connecté (provider déjà actif → la request aboutit).
    // Pour les items présents au parsing initial, ft-stepper appellera
    // setRegistry() directement via collectExistingItems().
    protected readonly _consumer = new ContextConsumer(this, {
        context: stepperContext,
        subscribe: true,
        callback: (registry) => this.setRegistry(registry),
    });

    /* ------------------------------------------------ */
    /* PUBLIC API                                       */
    /* ------------------------------------------------ */

    // Appelé soit par le ContextConsumer (items dynamiques),
    // soit directement par ft-stepper.collectExistingItems() (items du parsing initial).
    // Gère proprement le changement de registry (ex: ft-stepper déplacé dans le DOM).
    setRegistry(registry: StepperRegistry) {
        if (this._registry) {
            this._registry.unregisterItem(this);
        }
        this._registry = registry;
        registry.registerItem(this);
    }

    /* ------------------------------------------------ */
    /* LIFECYCLE                                        */
    /* ------------------------------------------------ */

    override disconnectedCallback() {
        // Appel direct sur la ref locale — pas d'event.
        // À ce stade l'élément est déjà retiré du DOM,
        // un event bubblant ne remonterait jamais jusqu'à ft-stepper.
        this._registry?.unregisterItem(this);
        this._registry = undefined;

        super.disconnectedCallback();
    }

    /* ------------------------------------------------ */
    /* REACTIVITY                                       */
    /* ------------------------------------------------ */

    override updated(changed: Map<string, unknown>) {
        // Ignore le premier rendu (oldValue === undefined) :
        // setRegistry() vient de déclencher registerItem() → rebuildTree() déjà planifié.
        changed.forEach((oldValue, prop) => {
            if (oldValue === undefined) return;

            if (prop === 'path' || prop === 'label' || prop === 'href') {
                this._registry?.notifyItemChanged(this, prop);
            }
        });
    }

    /* ------------------------------------------------ */
    /* RENDER                                           */
    /* ------------------------------------------------ */

    // Pas de shadow DOM : mr-stepper-item est un pur conteneur de données.
    // Le rendu visuel est délégué à ft-stepper via NavigationNode.
    override createRenderRoot() {
        return this;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'mr-stepper-item': MrStepperItem;
    }
}
