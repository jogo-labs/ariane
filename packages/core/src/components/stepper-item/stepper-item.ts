import { LitElement, html, nothing, type TemplateResult, type CSSResultGroup } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ContextConsumer } from '@lit/context';

import resetStyles from '../../styles/components/reset.styles.js';
import utilitiesStyles from '../../styles/utilities.styles.js';
import styles from './stepper-item.styles.js';

import { stepperContext, type StepperRegistry } from '../../context/stepper.context.js';

export type BulletState = 'current' | 'completed' | 'default';

export interface ItemRenderState {
    bulletState: BulletState;
    isSubstep: boolean;
    isLink: boolean;
    showSubsteps: boolean;
    srLabel: string;
}

/** Compose la valeur `part=` de la puce d'étape avec sa variante d'état (convention BEM `--`). */
function withBulletStatePart(state: BulletState): string {
    if (state === 'current') return 'bullet indicator bullet--current';
    if (state === 'completed') return 'bullet indicator bullet--completed';
    return 'bullet indicator';
}

/**
 * @summary Représente une étape ou sous-étape individuelle dans un ar-stepper.
 * @parent ar-stepper
 * @display docs
 *
 * @slot after-label - Contenu additif affiché à côté du label (ex. icône de statut) — n'affecte
 *   jamais le texte du label lui-même, toujours lu séparément (voir `aria-describedby`).
 *
 * @csspart step-link  - Le lien de l'étape (présent uniquement quand l'étape est cliquable).
 * @csspart control    - Porté par `step-link`, ou par le conteneur non cliquable : élément interactif générique.
 * @csspart bullet     - La puce numérotée de l'étape.
 * @csspart indicator  - Porté par `bullet` : marqueur/indicateur visuel.
 * @csspart label      - Le texte du label.
 * @csspart label--link - Le texte du label quand l'étape est cliquable (variante d'état de `label`).
 * @csspart bullet--current - La puce numérotée de l'étape courante (variante d'état de `bullet`).
 * @csspart bullet--completed - La puce numérotée d'une étape complétée (variante d'état de `bullet`).
 * @csspart list--substep - La liste des sous-étapes, quand cette étape en affiche.
 *
 * L'attribut `part` posé sur le host lui-même (`step` pour une étape de premier niveau,
 * `substep` pour une sous-étape) n'est pas un `::part()` consommable depuis l'extérieur —
 * `ar-stepper-item` est un élément slotté en light DOM, pas un descendant du shadow tree d'un
 * ancêtre, donc `::part()` ne peut pas l'atteindre. Il reste ciblable en CSS classique via un
 * sélecteur d'attribut : `ar-stepper-item[part="step"]` / `ar-stepper-item[part="substep"]`.
 */
export class ArStepperItem extends LitElement {
    static override styles: CSSResultGroup = [resetStyles, utilitiesStyles, styles];

    private readonly _uid = Math.random().toString(36).slice(2, 9);
    private readonly _afterLabelId = `stepper-item-after-label-${this._uid}`;

    @property({ type: String }) path = '';
    @property({ type: String }) label = '';
    @property({ type: String }) href?: string;

    @state() private _bulletState: BulletState = 'default';
    @state() private _isSubstep = false;
    @state() private _isLink = false;
    @state() private _showSubsteps = false;
    @state() private _srLabel = '';
    @state() private _hasAfterLabel = false;

    private _registry?: StepperRegistry | undefined;

    protected readonly _consumer = new ContextConsumer(this, {
        context: stepperContext,
        subscribe: true,
        callback: (registry) => this.setRegistry(registry),
    });

    /* ------------------------------------------------ */
    /* PUBLIC API                                       */
    /* ------------------------------------------------ */

    setRegistry(registry: StepperRegistry) {
        if (this._registry) {
            this._registry.unregisterItem(this);
        }
        this._registry = registry;
        registry.registerItem(this);
    }

    /** Poussé par `ar-stepper` à chaque recalcul d'état (currentPath, mode, structure de l'arbre). */
    setRenderState(state: ItemRenderState): void {
        this._bulletState = state.bulletState;
        this._isSubstep = state.isSubstep;
        this._isLink = state.isLink;
        this._showSubsteps = state.showSubsteps;
        this._srLabel = state.srLabel;
    }

    /** Déplace le focus sur le contrôle interne (lien ou conteneur non cliquable). */
    focusControl(): void {
        this.shadowRoot?.querySelector<HTMLElement>('.item-header')?.focus();
    }

    /* ------------------------------------------------ */
    /* LIFECYCLE                                        */
    /* ------------------------------------------------ */

    override disconnectedCallback() {
        this._registry?.unregisterItem(this);
        this._registry = undefined;

        super.disconnectedCallback();
    }

    override updated(changed: Map<string, unknown>) {
        changed.forEach((oldValue, prop) => {
            if (oldValue === undefined) return;

            if (prop === 'path' || prop === 'label' || prop === 'href') {
                this._registry?.notifyItemChanged(this, prop);
            }
        });

        this.setAttribute('part', this._isSubstep ? 'substep' : 'step');
        this.setAttribute('role', 'listitem');
        if (this._bulletState === 'current') {
            this.setAttribute('aria-current', 'step');
        } else {
            this.removeAttribute('aria-current');
        }
    }

    /* ------------------------------------------------ */
    /* EVENTS                                            */
    /* ------------------------------------------------ */

    private _handleClick = (event: MouseEvent): void => {
        // Sans href réel fourni par le consommateur (omis, ou explicitement '#' — la convention
        // documentée pour un item sans navigation propre), l'ancre est purement décorative : la
        // navigation est pilotée par notifyItemActivated, pas par le comportement natif.
        if (this.href === undefined || this.href === '#') {
            event.preventDefault();
        }
        this._registry?.notifyItemActivated(this, event);
    };

    private _handleAfterLabelSlotChange = (event: Event): void => {
        const slot = event.target as HTMLSlotElement;
        this._hasAfterLabel = slot.assignedNodes({ flatten: true }).length > 0;
    };

    /* ------------------------------------------------ */
    /* RENDER                                           */
    /* ------------------------------------------------ */

    override render(): TemplateResult {
        const bulletPart = withBulletStatePart(this._bulletState);
        const labelPart = this._isLink ? 'label label--link' : 'label';
        const describedBy = this._hasAfterLabel ? this._afterLabelId : nothing;

        const headerContent = html`
            <span part=${bulletPart} aria-hidden="true"></span>
            <span class="sr-only">${this._srLabel}</span>
            <span class="item-label" part=${labelPart}>${this.label}</span>
        `;

        return html`
            <div class="item-row">
                ${
                    this._isLink
                        ? html`
                              <a
                                  class="item-header"
                                  part="step-link control"
                                  aria-describedby=${describedBy}
                                  href=${this.href ?? '#'}
                                  @click=${this._handleClick}
                              >
                                  ${headerContent}
                              </a>
                          `
                        : html`
                              <div
                                  class="item-header"
                                  part="control"
                                  aria-describedby=${describedBy}
                                  tabindex="-1"
                              >
                                  ${headerContent}
                              </div>
                          `
                }
                <span id=${this._afterLabelId}>
                    <slot name="after-label" @slotchange=${this._handleAfterLabelSlotChange}></slot>
                </span>
            </div>
            ${
                this._showSubsteps
                    ? html`
                          <ol part="list list--substep" class="list-unstyled">
                              <slot></slot>
                          </ol>
                      `
                    : nothing
            }
        `;
    }
}
