import { LitElement, html, type TemplateResult, type PropertyValues } from 'lit';
import { property, query } from 'lit/decorators.js';
import { warn } from '../../utils/warn.js';
import { prefersReducedMotion } from '../../utils/media.js';
import { ToggleController } from '../../controllers/toggle.controller.js';
import { emitToggleEvent } from '../../utils/toggle-events.js';
import styles from './collapse.styles.js';

/**
 * @summary Panneau pliable/dépliable.
 * @display demo
 *
 * @slot trigger - Élément déclencheur (ignoré si `for` est défini).
 * @slot         - Contenu collapsible.
 *
 * @csspart collapse          - Racine du composant.
 * @csspart trigger-container - Wrapper du slot trigger.
 * @csspart collapsible       - Zone animée (overflow hidden, height 0 → auto). Nom distinct de
 *   `panel` (rôle transverse = conteneur flottant) : ce wrapper n'est jamais flottant.
 * @csspart body              - Wrapper interne du contenu.
 *
 * @cssprop --ar-collapse-duration - Durée de la transition height.
 * @cssprop --ar-collapse-easing - Easing de la transition height.
 *
 * @event {CustomEvent} ar-collapse-show           - Avant l'ouverture. @cancelable
 * @event {CustomEvent} ar-collapse-show-prevented - Émis si ar-collapse-show est annulé.
 * @event {CustomEvent} ar-collapse-shown          - Après la fin de l'animation d'ouverture.
 * @event {CustomEvent} ar-collapse-hide           - Avant la fermeture. @cancelable
 * @event {CustomEvent} ar-collapse-hide-prevented - Émis si ar-collapse-hide est annulé.
 * @event {CustomEvent} ar-collapse-hidden         - Après la fin de l'animation de fermeture.
 */
export class ArCollapse extends LitElement {
    static override styles = [styles];
    private static _idCounter = 0;

    /** Ouvre ou ferme le panel. */
    @property({ reflect: true, type: Boolean }) open = false;

    /**
     * ID d'un élément déclencheur externe (light DOM).
     * Quand défini, le slot `trigger` est ignoré.
     */
    @property({ reflect: true }) for = '';

    /** Groupe accordéon — les panels partageant le même `name` se ferment mutuellement. */
    @property({ reflect: true }) name = '';

    /**
     * Position du slot trigger par rapport au contenu dans le DOM.
     * `before` (défaut) : trigger avant le panel. `after` : trigger après le panel.
     * L'ordre DOM reflète l'ordre visuel — pas de CSS `order` — pour respecter WCAG 2.4.3.
     */
    @property({
        attribute: 'trigger-position',
        reflect: true,
        converter: {
            fromAttribute: (value: string | null) => (value === 'after' ? 'after' : 'before'),
            toAttribute: (value: 'before' | 'after') => (value === 'after' ? 'after' : null),
        },
    })
    triggerPosition: 'before' | 'after' = 'before';

    /** Désactive le composant — le trigger ne répond plus aux clics. */
    @property({ reflect: true, type: Boolean }) disabled = false;

    @query('[part="collapsible"]') private _panel!: HTMLElement;

    private _animating = false;
    private _initialized = false;
    private _externalTrigger: HTMLElement | null = null;
    private _internalTrigger: HTMLElement | null = null;
    private _onTransitionEnd: (() => void) | null = null;

    constructor() {
        super();
        // s'enregistre lui-même via host.addController(), pas besoin de conserver la référence
        new ToggleController(this, {
            eventPrefix: 'ar-collapse',
            skipInitialTransition: true,
            onShow: () => this._onShow(),
            onHide: () => this._onHide(),
        });
    }

    override connectedCallback(): void {
        super.connectedCallback();
        if (!this.id) {
            this.id = `ar-collapse-${++ArCollapse._idCounter}`;
        }
    }

    override firstUpdated(): void {
        if (this.for) {
            this._warnIfBothTriggers();
            this._attachExternalTrigger();
        } else {
            // Initialise le trigger interne si le slot est déjà peuplé au premier rendu.
            // _handleTriggerSlotChange() sera rappelé si le slot change ultérieurement.
            this._handleTriggerSlotChange();
        }
        this._syncTriggerAria();
        // État initial sans animation — updated() gère les changements ultérieurs.
        if (this.open) {
            this._panel.removeAttribute('hidden');
            this._panel.style.height = 'auto';
        }
        this._initialized = true;
    }

    override updated(changed: PropertyValues<this>): void {
        if (!this._initialized) return;
        if (changed.has('for')) {
            this._detachExternalTrigger();
            if (this.for) {
                this._warnIfBothTriggers();
                this._attachExternalTrigger();
            }
        }
        if (changed.has('disabled')) {
            this._syncTriggerDisabled();
        }
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this._abortAnimation();
        this._detachExternalTrigger();
        if (this._internalTrigger) {
            this._internalTrigger.removeEventListener('click', this._handleTriggerClick);
            this._internalTrigger = null;
        }
    }

    override render(): TemplateResult {
        const trigger = html`
            <slot
                name="trigger"
                part="trigger-container"
                @slotchange=${this._handleTriggerSlotChange}
            ></slot>
        `;
        const panel = html`
            <div part="collapsible" hidden>
                <div part="body">
                    <slot></slot>
                </div>
            </div>
        `;
        return html`
            <div part="collapse">
                ${this.triggerPosition === 'after'
                    ? html`${panel}${trigger}`
                    : html`${trigger}${panel}`}
            </div>
        `;
    }

    /** Ouvre le panel. No-op si déjà ouvert, en cours d'animation, ou disabled. */
    show(): void {
        if (this.open || this._animating || this.disabled) return;
        this.open = true;
    }

    /** Ferme le panel. No-op si déjà fermé. */
    hide(): void {
        if (!this.open) return;
        this.open = false;
    }

    private _warnIfBothTriggers(): void {
        if (!this.for) return;
        const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]');
        if (slot?.assignedElements({ flatten: true }).length) {
            warn(
                'ar-collapse',
                'for et slot="trigger" sont tous les deux définis — for prend la priorité.',
            );
        }
    }

    private _attachExternalTrigger(): void {
        const el = document.getElementById(this.for);
        if (!el) {
            warn('ar-collapse', `Aucun élément trouvé avec l'id "${this.for}".`);
            return;
        }
        this._externalTrigger = el;
        el.addEventListener('click', this._handleTriggerClick);
        this._syncTriggerAria();
    }

    private _detachExternalTrigger(): void {
        if (!this._externalTrigger) return;
        this._externalTrigger.removeEventListener('click', this._handleTriggerClick);
        this._externalTrigger.removeAttribute('aria-expanded');
        this._externalTrigger.removeAttribute('aria-controls');
        this._externalTrigger.removeAttribute('aria-disabled');
        this._externalTrigger = null;
    }

    private _handleTriggerSlotChange(): void {
        if (this.for) {
            this._warnIfBothTriggers();
            return;
        }
        // Détacher l'ancien trigger interne avant d'en attacher un nouveau
        if (this._internalTrigger) {
            this._internalTrigger.removeEventListener('click', this._handleTriggerClick);
            this._internalTrigger = null;
        }
        const trigger = this._resolvedTrigger;
        if (!trigger) return;
        this._internalTrigger = trigger;
        trigger.addEventListener('click', this._handleTriggerClick);
        this._syncTriggerAria();
        this._syncTriggerDisabled();
    }

    private readonly _handleTriggerClick = (): void => {
        if (this.disabled) return;
        this.open = !this.open;
    };

    private get _resolvedTrigger(): HTMLElement | null {
        if (this.for) return this._externalTrigger;
        const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]');
        return (slot?.assignedElements({ flatten: true })[0] as HTMLElement | undefined) ?? null;
    }

    private _syncTriggerAria(): void {
        const trigger = this._resolvedTrigger;
        if (!trigger) return;
        trigger.setAttribute('aria-expanded', String(this.open));
        trigger.setAttribute('aria-controls', this.id);
    }

    private _syncTriggerDisabled(): void {
        const trigger = this._resolvedTrigger;
        if (!trigger) return;
        if (this.disabled) {
            if (!this.for) {
                // Trigger interne natif : disabled + aria-disabled
                trigger.setAttribute('disabled', '');
            }
            trigger.setAttribute('aria-disabled', 'true');
        } else {
            trigger.removeAttribute('disabled');
            trigger.removeAttribute('aria-disabled');
        }
    }

    private _abortAnimation(): void {
        if (!this._onTransitionEnd) return;
        this._panel.removeEventListener('transitionend', this._onTransitionEnd);
        this._onTransitionEnd = null;
        this._animating = false;
        // Finalise l'état du panel dans la direction en cours pour que open reste cohérent.
        if (this.open) {
            this._panel.removeAttribute('hidden');
            this._panel.style.height = 'auto';
        } else {
            this._panel.setAttribute('hidden', '');
            this._panel.style.height = '';
        }
    }

    private _closeGroupSiblings(): void {
        if (!this.name) return;
        const root = this.getRootNode() as Document | ShadowRoot;
        const tag = this.tagName.toLowerCase();
        root.querySelectorAll<ArCollapse>(`${tag}[name='${CSS.escape(this.name)}']`).forEach(
            (el) => {
                if (el !== this && el.open) el.hide();
            },
        );
    }

    private _shouldAnimate(): boolean {
        // transitionend ne se déclenche pas si duration=0s (défaut headless sans thème).
        // On vérifie la durée calculée pour éviter que _animating reste bloqué à true.
        const d = parseFloat(getComputedStyle(this._panel).transitionDuration) || 0;
        return !prefersReducedMotion() && d > 0;
    }

    private _onShow(): void {
        this._abortAnimation();
        this._closeGroupSiblings();
        this._syncTriggerAria();
        this._animating = true;
        const panel = this._panel;
        panel.style.height = '0px';
        panel.removeAttribute('hidden');
        const targetH = panel.scrollHeight;
        void panel.offsetHeight; // force reflow
        if (!this._shouldAnimate()) {
            panel.style.height = 'auto';
            this._animating = false;
            emitToggleEvent(this, 'ar-collapse-shown', { cancelable: false });
            return;
        }
        panel.style.height = `${targetH}px`;
        const onShow = () => {
            this._onTransitionEnd = null;
            this._animating = false;
            panel.style.height = 'auto';
            emitToggleEvent(this, 'ar-collapse-shown', { cancelable: false });
        };
        this._onTransitionEnd = onShow;
        panel.addEventListener('transitionend', onShow, { once: true });
    }

    private _onHide(): void {
        const wasAnimating = this._animating;
        this._abortAnimation();
        this._syncTriggerAria();
        if (wasAnimating) {
            // finding 5 : snap immédiat — frère accordéon ou interruption externe
            this._panel.setAttribute('hidden', '');
            this._panel.style.height = '';
            emitToggleEvent(this, 'ar-collapse-hidden', { cancelable: false });
            return;
        }
        this._animating = true;
        const panel = this._panel;
        panel.style.height = `${panel.scrollHeight}px`;
        void panel.offsetHeight; // force reflow
        if (!this._shouldAnimate()) {
            this._animating = false;
            panel.setAttribute('hidden', '');
            panel.style.height = '';
            emitToggleEvent(this, 'ar-collapse-hidden', { cancelable: false });
            return;
        }
        panel.style.height = '0px';
        const onHide = () => {
            this._onTransitionEnd = null;
            this._animating = false;
            panel.setAttribute('hidden', '');
            panel.style.height = '';
            emitToggleEvent(this, 'ar-collapse-hidden', { cancelable: false });
        };
        this._onTransitionEnd = onHide;
        panel.addEventListener('transitionend', onHide, { once: true });
    }
}
