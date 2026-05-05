import { LitElement, html, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { TooltipController } from '../../controllers/tooltip.controller.js';
import type { Placement } from '@floating-ui/dom';
import { warn } from '../../utils/warn.js';
import styles from './tooltip.styles.js';

export type ArTooltipPlacement = Placement;

/**
 * @summary Bulle d'information non-interactive déclenchée sur hover et focus.
 *
 * Implémente WCAG 1.4.13 (Content on Hover or Focus) : la bulle reste
 * accessible quand le pointeur se déplace du trigger vers la bulle.
 *
 * Le contenu doit rester non-interactif (spec ARIA role="tooltip").
 * Pour du contenu riche ou cliquable, utiliser ar-dropdown.
 *
 * @slot - Texte du tooltip.
 *
 * @csspart bubble - Le panel flottant.
 * @csspart arrow  - Le caret directionnel.
 *
 * @cssprop [--ar-tooltip-bg=#1a1a1a]                  - Fond de la bulle.
 * @cssprop [--ar-tooltip-color=#fff]                  - Couleur du texte.
 * @cssprop [--ar-tooltip-border-radius=0.25rem]        - Arrondi.
 * @cssprop [--ar-tooltip-padding=0.375rem 0.625rem]    - Marge interne.
 * @cssprop [--ar-tooltip-font-size=0.8125rem]          - Taille de police.
 * @cssprop [--ar-tooltip-max-width=18rem]              - Largeur maximale.
 * @cssprop [--ar-tooltip-arrow-size=6px]               - Taille du caret.
 */
@customElement('ar-tooltip')
export class ArTooltip extends LitElement {
    static override styles = [styles];

    /** ID du trigger dans le light DOM. Requis. */
    @property({ reflect: true }) for = '';

    /** Placement Floating UI (12 valeurs, ex: "top", "bottom-start"). */
    @property({ reflect: true }) placement: ArTooltipPlacement = 'top';

    /** Espacement trigger→bulle en px. */
    @property({ reflect: true, type: Number }) distance = 6;

    /** Décalage latéral en px. */
    @property({ reflect: true, type: Number }) offset = 0;

    /** Délai avant affichage en ms (WCAG 1.4.13). */
    @property({ attribute: 'show-delay', reflect: true, type: Number }) showDelay = 300;

    /** Délai avant masquage en ms (WCAG 1.4.13). */
    @property({ attribute: 'hide-delay', reflect: true, type: Number }) hideDelay = 150;

    /** Supprime le caret. */
    @property({ attribute: 'without-arrow', reflect: true, type: Boolean }) withoutArrow = false;

    /** Désactive complètement le tooltip. */
    @property({ reflect: true, type: Boolean }) disabled = false;

    @query('[part="bubble"]') private _bubble!: HTMLElement;

    private readonly _tooltip = new TooltipController(this, { placement: 'top', distance: 6 });
    private _trigger: HTMLElement | null = null;
    private _showTimer = 0;
    private _hideTimer = 0;

    override firstUpdated(): void {
        this._attachTrigger();
        const arrowEl = this.shadowRoot?.querySelector<HTMLElement>('[part="arrow"]') ?? null;
        if (arrowEl) this._tooltip.setArrow(arrowEl);
    }

    override updated(changed: PropertyValues<this>): void {
        if (changed.has('for')) {
            this._detachTrigger();
            this._attachTrigger();
        }
        if (changed.has('placement')) this._tooltip.setPlacement(this.placement);
        if (changed.has('distance')) this._tooltip.setDistance(this.distance);
        if (changed.has('offset')) this._tooltip.setOffset(this.offset);
        if (changed.has('disabled') && this.disabled) {
            clearTimeout(this._showTimer);
            clearTimeout(this._hideTimer);
            this._tooltip.hide();
        }
        if (changed.has('withoutArrow')) {
            const arrowEl = this.withoutArrow
                ? null
                : (this.shadowRoot?.querySelector<HTMLElement>('[part="arrow"]') ?? null);
            this._tooltip.setArrow(arrowEl);
        }
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this._detachTrigger();
        clearTimeout(this._showTimer);
        clearTimeout(this._hideTimer);
        document.removeEventListener('keydown', this._handleKeyDown);
    }

    override render(): TemplateResult {
        return html`
            <div
                part="bubble"
                popover="manual"
                role="tooltip"
                @mouseenter=${this._handleBubbleMouseEnter}
                @mouseleave=${this._handleBubbleMouseLeave}
            >
                <slot></slot>
                ${this.withoutArrow ? nothing : html`<div part="arrow"></div>`}
            </div>
        `;
    }

    private _attachTrigger(): void {
        if (!this.for) return;
        const trigger = document.getElementById(this.for);
        if (!trigger) {
            warn('ar-tooltip', `Aucun élément trouvé avec l'id "${this.for}".`);
            return;
        }
        this._trigger = trigger;
        this._tooltip.attach(trigger, this._bubble);
        trigger.addEventListener('mouseenter', this._handleMouseEnter);
        trigger.addEventListener('mouseleave', this._handleMouseLeave);
        trigger.addEventListener('focus', this._handleFocus);
        trigger.addEventListener('blur', this._handleBlur);
    }

    private _detachTrigger(): void {
        if (!this._trigger) return;
        this._trigger.removeEventListener('mouseenter', this._handleMouseEnter);
        this._trigger.removeEventListener('mouseleave', this._handleMouseLeave);
        this._trigger.removeEventListener('focus', this._handleFocus);
        this._trigger.removeEventListener('blur', this._handleBlur);
        this._trigger.removeAttribute('aria-describedby');
        this._trigger = null;
        this._tooltip.hide();
    }

    private _scheduleShow(): void {
        if (this.disabled) return;
        clearTimeout(this._hideTimer);
        this._showTimer = window.setTimeout(() => {
            void this._tooltip.show();
            document.addEventListener('keydown', this._handleKeyDown);
        }, this.showDelay);
    }

    private _scheduleHide(): void {
        clearTimeout(this._showTimer);
        this._hideTimer = window.setTimeout(() => {
            this._tooltip.hide();
            document.removeEventListener('keydown', this._handleKeyDown);
        }, this.hideDelay);
    }

    private readonly _handleMouseEnter = (): void => this._scheduleShow();
    private readonly _handleMouseLeave = (): void => this._scheduleHide();
    private readonly _handleFocus = (): void => this._scheduleShow();
    private readonly _handleBlur = (): void => this._scheduleHide();

    private readonly _handleBubbleMouseEnter = (): void => {
        clearTimeout(this._hideTimer);
    };

    private readonly _handleBubbleMouseLeave = (): void => {
        this._scheduleHide();
    };

    private readonly _handleKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
            clearTimeout(this._showTimer);
            clearTimeout(this._hideTimer);
            this._tooltip.hide();
            document.removeEventListener('keydown', this._handleKeyDown);
        }
    };
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-tooltip': ArTooltip;
    }
}
