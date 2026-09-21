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
    isLink: boolean;
    showSubsteps: boolean;
    srLabel: string;
}

/** Compose la valeur `part=` de l'indicateur d'étape avec sa variante d'état (convention BEM `--`). */
function withIndicatorStatePart(state: BulletState): string {
    if (state === 'current') return 'indicator indicator--current';
    if (state === 'completed') return 'indicator indicator--completed';
    return 'indicator';
}

/**
 * @summary Représente une étape ou sous-étape individuelle dans un ar-stepper.
 * @parent ar-stepper
 * @display docs
 *
 * @slot after-label - Contenu additif affiché à côté du label (ex. icône de statut) — n'affecte
 *   jamais le texte du label lui-même, toujours lu séparément (voir `aria-describedby`).
 * @slot indicator - Remplace le contenu par défaut (numéro d'étape via compteur CSS) de
 *   l'indicateur visuel (ex. icône de statut). Purement décoratif (`aria-hidden`) — l'information
 *   accessible de position est toujours portée séparément par le texte masqué visuellement.
 *
 * @csspart step-link  - Le lien de l'étape (présent uniquement quand l'étape est cliquable).
 * @csspart control    - Porté par `step-link`, ou par le conteneur non cliquable : élément interactif générique.
 * @csspart indicator  - Le marqueur visuel de l'étape (numéro par défaut, ou contenu du slot `indicator`).
 * @csspart indicator--current - Le marqueur visuel de l'étape courante (variante d'état de `indicator`).
 * @csspart indicator--completed - Le marqueur visuel d'une étape complétée (variante d'état de `indicator`).
 * @csspart label      - Le texte du label.
 * @csspart label--link - Le texte du label quand l'étape est cliquable (variante d'état de `label`).
 * @csspart list--substep - La liste des sous-étapes, quand cette étape en affiche.
 *
 * @cssprop --ar-stepper-item-label-color - Couleur des labels des étapes non courantes.
 * @cssprop --ar-stepper-item-current-header-color - Couleur du texte de l'étape courante rendue comme élément non cliquable (sans lien).
 * @cssprop --ar-stepper-item-link-hover-label-color - Couleur du label de l'étape au survol/focus (cascade vers --ar-color-text).
 * @cssprop --ar-stepper-item-link-focus-outline-color - Couleur de l'anneau de focus du lien d'étape (cascade vers --ar-color-interactive).
 */
export class ArStepperItem extends LitElement {
    static override styles: CSSResultGroup = [resetStyles, utilitiesStyles, styles];

    private readonly _uid = Math.random().toString(36).slice(2, 9);
    private readonly _afterLabelId = `stepper-item-after-label-${this._uid}`;

    @property({ type: String }) path = '';
    @property({ type: String }) label = '';
    @property({ type: String }) href?: string;

    @state() private _bulletState: BulletState = 'default';
    @state() private _isLink = false;
    @state() private _showSubsteps = false;
    @state() private _srLabel = '';
    @state() private _hasAfterLabel = false;
    @state() private _hasIndicatorContent = false;

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

    private _handleIndicatorSlotChange = (event: Event): void => {
        const slot = event.target as HTMLSlotElement;
        this._hasIndicatorContent = slot.assignedNodes({ flatten: true }).length > 0;
    };

    /* ------------------------------------------------ */
    /* RENDER                                           */
    /* ------------------------------------------------ */

    override render(): TemplateResult {
        const indicatorPart = withIndicatorStatePart(this._bulletState);
        const labelPart = this._isLink ? 'label label--link' : 'label';
        const describedBy = this._hasAfterLabel ? this._afterLabelId : nothing;

        const headerContent = html`
            <span
                part=${indicatorPart}
                aria-hidden="true"
                ?data-has-content=${this._hasIndicatorContent}
            >
                <slot name="indicator" @slotchange=${this._handleIndicatorSlotChange}></slot>
            </span>
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
                <span id=${this._afterLabelId} ?hidden=${!this._hasAfterLabel}>
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
