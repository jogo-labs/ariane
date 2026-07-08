import { LitElement, html, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { property, query } from 'lit/decorators.js';
import { TooltipController } from '../../controllers/tooltip.controller.js';
import { warn } from '../../utils/warn.js';
import styles from './tooltip.styles.js';

export type ArTooltipPlacement =
    | 'top'
    | 'top-start'
    | 'top-end'
    | 'right'
    | 'right-start'
    | 'right-end'
    | 'bottom'
    | 'bottom-start'
    | 'bottom-end'
    | 'left'
    | 'left-start'
    | 'left-end';

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
 * @cssprop --ar-tooltip-bg                  - Fond de la bulle.
 * @cssprop --ar-tooltip-color                  - Couleur du texte.
 * @cssprop --ar-tooltip-border-radius        - Arrondi.
 * @cssprop --ar-tooltip-padding    - Marge interne.
 * @cssprop --ar-tooltip-font-size          - Taille de police.
 * @cssprop --ar-tooltip-max-width              - Largeur maximale.
 * @cssprop --ar-tooltip-arrow-size               - Taille du caret.
 * @cssprop [--ar-tooltip-distance=10px] - Espacement entre le trigger et la bulle.
 * @cssprop [--ar-tooltip-offset=var(--ar-anchor-offset)] - Décalage latéral de la bulle.
 */
export class ArTooltip extends LitElement {
    static override styles = [styles];

    /** ID du trigger dans le light DOM. Requis. */
    @property({ reflect: true }) for = '';

    /** Placement Floating UI (12 valeurs, ex: "top", "bottom-start"). */
    @property({ reflect: true }) placement: ArTooltipPlacement = 'top';

    /** Délai avant affichage en ms (WCAG 1.4.13). */
    @property({
        attribute: 'show-delay',
        reflect: true,
        converter: {
            fromAttribute: (v) => (v === null || v === '' ? 300 : Number(v)),
            toAttribute: String,
        },
    })
    showDelay = 300;

    /** Délai avant masquage en ms (WCAG 1.4.13). */
    @property({
        attribute: 'hide-delay',
        reflect: true,
        converter: {
            fromAttribute: (v) => (v === null || v === '' ? 150 : Number(v)),
            toAttribute: String,
        },
    })
    hideDelay = 150;

    /** Supprime le caret. */
    @property({ attribute: 'without-arrow', reflect: true, type: Boolean }) withoutArrow = false;

    /** Désactive complètement le tooltip. */
    @property({ reflect: true, type: Boolean }) disabled = false;

    @query('[part="bubble"]') private _bubble!: HTMLElement;

    private readonly _tooltip = new TooltipController(this, {
        placement: 'top',
        cssVarPrefix: 'tooltip',
    });
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
        const root = this.getRootNode();

        const trigger = (root as typeof document).getElementById(this.for);
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
        // Listener attaché avant le délai : Escape pendant showDelay doit aussi annuler l'affichage.
        document.addEventListener('keydown', this._handleKeyDown);
        this._showTimer = window.setTimeout(() => {
            void this._tooltip.show();
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
