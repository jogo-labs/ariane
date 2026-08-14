import {
    LitElement,
    nothing,
    type TemplateResult,
    html,
    type CSSResultGroup,
    type PropertyValues,
} from 'lit';
import { property, query, state } from 'lit/decorators.js';
import utilitiesStyles from '../../styles/utilities.styles.js';
import resetStyles from '../../styles/components/reset.styles.js';
import styles from './dialog.styles.js';
import { announceA11y } from '../../a11y/announce-a11y.js';
import { HasSlotController } from '../../controllers/has-slot.controller.js';
import { prefersReducedMotion } from '../../utils/media.js';
import { acquireScrollLock, releaseScrollLock } from '../../utils/scroll-lock.js';
import { warn } from '../../utils/warn.js';

/** Evènements envoyés par le webcomposant ArDialog */
export type ArDialogEvents =
    | 'ar-dialog-show'
    | 'ar-dialog-show-prevented'
    | 'ar-dialog-shown'
    | 'ar-dialog-hide'
    | 'ar-dialog-hide-prevented'
    | 'ar-dialog-hidden'
    | 'ar-dialog-dismissed'
    | 'ar-dialog-dismissed-prevented'
    | 'ar-dialog-accepted'
    | 'ar-dialog-accepted-prevented';

const _dialogStack: ArDialog[] = [];

const DEFAULT_DIALOG_LABEL = 'Dialogue';

if (typeof document !== 'undefined') {
    document.addEventListener(
        'click',
        (e: MouseEvent) => {
            const trigger = (e.target as Element).closest('[data-ar-dialog-open]');
            if (!trigger) return;
            const id = trigger.getAttribute('data-ar-dialog-open');
            const target = id ? document.getElementById(id) : null;
            if (target instanceof ArDialog) target.open = true;
        },
        { capture: true },
    );
}

/**
 * @summary Boîte de dialogue modale ou panneau latéral (drawer), accessible et animée.
 *
 * @slot label - Titre du dialog. Remplace la propriété `label` si du HTML est nécessaire. Sans effet si `without-header` est actif.
 * @slot header-actions - Actions additionnelles dans le header, positionnées avant le bouton de fermeture (ex. bouton plein écran, menu). Retiré du DOM si `without-header` est actif.
 * @slot - Contenu principal du dialog.
 * @slot footer - Actions du dialog (boutons). Absent du DOM si non fourni.
 * @slot close-icon - Icône du bouton de fermeture. Remplace le SVG "×" par défaut. Retiré du DOM si `without-header` est actif.
 *
 * @csspart dialog - L'élément <dialog> racine.
 * @csspart header - L'en-tête contenant le titre et le bouton de fermeture. Absent du DOM si `without-header` est actif.
 * @csspart header-actions - Le conteneur des actions additionnelles du header (slot `header-actions`). Absent du DOM si le slot est vide ou si `without-header` est actif.
 * @csspart title - Le titre du dialog.
 * @csspart close-button - Le bouton de fermeture dans l'en-tête. Absent du DOM si `without-header` est actif.
 * @csspart action-button - Porté par `close-button` : bouton qui déclenche une action ponctuelle.
 * @csspart body - La zone de contenu principale.
 * @csspart footer - La zone d'actions (absente du DOM si slot non utilisé).
 *
 * @cssprop --ar-dialog-width - Largeur du dialog. Prend le pas sur les tailles prédéfinies pour une règle au moins aussi spécifique que `[size='...']` (ex. `ar-dialog[size='sm']`) — un simple `ar-dialog { }` est moins spécifique et perd face au preset de thème quand `size` est défini.
 * @cssprop --ar-dialog-spacing - Padding interne (block et inline) de la zone de contenu.
 * @cssprop --ar-dialog-spacing-block - Padding haut/bas. Prend le pas sur `--ar-dialog-spacing` si défini.
 * @cssprop --ar-dialog-spacing-inline - Padding gauche/droite. Prend le pas sur `--ar-dialog-spacing` si défini.
 * @cssprop --ar-dialog-backdrop - Couleur de fond du voile derrière le dialog (mode modal).
 * @cssprop --ar-dialog-close-size - Taille (width/height) du bouton de fermeture.
 * @cssprop --ar-dialog-close-transition-duration - Durée de la transition (background-color) du bouton de fermeture au survol.
 * @cssprop --ar-dialog-bg - Fond du dialog (cascade vers --ar-color-bg). Repli `Canvas` si aucun thème n'est chargé — sans thème et sans bordure (le dialog natif perd son style UA par défaut), le contenu flotte sinon sans surface visible.
 * @cssprop --ar-dialog-color - Couleur du texte du dialog (cascade vers --ar-color-text). Repli `CanvasText` si aucun thème n'est chargé.
 * @cssprop --ar-dialog-shake-outline-color - Couleur de l'anneau de mise en évidence (`outline`) affiché à la place du shake en `prefers-reduced-motion: reduce` (cascade vers --ar-color-danger-text).
 *
 * @event {CustomEvent} ar-dialog-show - Émis avant l'ouverture. @cancelable
 * @event {CustomEvent} ar-dialog-show-prevented - Émis si ar-dialog-show est annulé.
 * @event {CustomEvent} ar-dialog-shown - Émis après l'ouverture (après updateComplete).
 * @event {CustomEvent} ar-dialog-hide - Émis avant la fermeture. @cancelable
 * @event {CustomEvent} ar-dialog-hide-prevented - Émis si ar-dialog-hide est annulé. Le composant secoue le dialog et annonce `prevented-message` aux lecteurs d'écran.
 * @event {CustomEvent} ar-dialog-hidden - Émis après la fermeture (après animation).
 * @event {CustomEvent} ar-dialog-dismissed - Émis lors d'un clic sur data-ar-dismiss. @cancelable
 * @event {CustomEvent} ar-dialog-dismissed-prevented - Émis si ar-dialog-dismissed est annulé.
 * @event {CustomEvent} ar-dialog-accepted - Émis lors d'un clic sur data-ar-accept. @cancelable
 * @event {CustomEvent} ar-dialog-accepted-prevented - Émis si ar-dialog-accepted est annulé.
 */
export class ArDialog extends LitElement {
    static override styles: CSSResultGroup = [utilitiesStyles, resetStyles, styles];

    // ── Public properties ──────────────────────────────────────────────────────

    /**
     * Visibilité du composant.
     * @attr open
     * @default false
     */
    @property({ reflect: true, type: Boolean }) open: boolean = false;

    /**
     * Si présent, un clic sur le backdrop ferme le dialog.
     * Par défaut, le backdrop est statique et ne déclenche pas la fermeture.
     *
     * @attr close-on-backdrop
     * @default false
     */
    @property({ reflect: true, type: Boolean, attribute: 'close-on-backdrop' })
    closeOnBackdrop: boolean = false;

    /**
     * Titre affiché dans le header. Pour du HTML, utiliser `slot="label"`.
     *
     * @attr label
     * @default ''
     */
    @property({ reflect: true }) label = '';

    /**
     * Si présent, retire entièrement le header (titre, actions, bouton de fermeture) du DOM.
     * La propriété `label` devient alors le seul nom accessible du dialog (`aria-label`) —
     * elle est requise dans ce mode, le slot `label` (HTML) est sans effet.
     *
     * @attr without-header
     * @default false
     */
    @property({ reflect: true, type: Boolean, attribute: 'without-header' })
    withoutHeader: boolean = false;

    /**
     * Mode d'affichage : `modal` (centré avec backdrop) ou `drawer` (panneau latéral).
     *
     * @attr mode
     * @default 'modal'
     */
    @property({ reflect: true, type: String })
    mode: 'modal' | 'drawer' = 'modal';

    /**
     * Côté d'affichage du drawer. Sans effet en mode `modal`.
     *
     * @attr placement
     * @default 'right'
     */
    @property({ reflect: true, type: String })
    placement: 'left' | 'right' = 'right';

    /**
     * Taille du dialog. Les paliers `sm`/`lg`/`xl` sont définis par le thème —
     * sans thème chargé, seule la taille par défaut du composant s'applique.
     * Utilisez `--ar-dialog-width` pour une valeur personnalisée. Un `ar-dialog { }` non qualifié
     * doit néanmoins être au moins aussi spécifique que `[size='...']` (ou utiliser `!important`,
     * ou omettre `size`) pour l'emporter de façon fiable sur un palier de thème.
     *
     * @attr size
     * @default 'md'
     */
    @property({ reflect: true, type: String })
    size: 'sm' | 'md' | 'lg' | 'xl' = 'md';

    /**
     * Message annoncé aux lecteurs d'écran quand une fermeture est bloquée
     * (événements `ar-dialog-hide-prevented`, `ar-dialog-dismissed-prevented`, `ar-dialog-accepted-prevented`).
     *
     * @attr prevented-message
     * @default 'Fermeture bloquée.'
     */
    @property({ reflect: true, attribute: 'prevented-message' }) preventedMessage =
        'Fermeture bloquée.';

    /**
     * Label accessible du bouton de fermeture. À adapter pour la langue de l'interface.
     *
     * @attr close-label
     * @default 'Fermer'
     */
    @property({ reflect: true, attribute: 'close-label' }) closeLabel = 'Fermer';

    // ── Private state ──────────────────────────────────────────────────────────

    @query('dialog', true)
    dialog!: HTMLDialogElement;

    /** Cible du dernier pointerdown, pour distinguer un vrai clic backdrop d'un drag. */
    private _pointerDownTarget: EventTarget | null = null;

    /** Évite de lancer la fermeture pendant le cycle `updated()` de Lit. */
    private _closePending = false;

    /** Vrai pendant l'animation de fermeture — bloque les interactions et les double-appels. */
    @state() private _isClosing = false;

    /** Élément qui avait le focus avant l'ouverture — pour le restaurer à la fermeture. */
    private _triggerElement: Element | null = null;

    private readonly _slotController = new HasSlotController(
        this,
        'footer',
        'label',
        'header-actions',
    );
    private _hasWarnedMissingLabel = false;
    private _hasWarnedSlotLabelIgnored = false;
    private _hasWarnedNoCloseMechanism = false;

    private _getHeadingLabel(): string {
        return (this.label ?? '').trim() || DEFAULT_DIALOG_LABEL;
    }

    private _warnIfMissingLabel(): void {
        if (this._hasWarnedMissingLabel) return;
        if ((this.label ?? '').trim() || this._slotController.test('label')) return;

        this._hasWarnedMissingLabel = true;
        warn(
            'ar-dialog',
            'Aucun libellé accessible fourni. Ajoutez la propriété "label" ou un enfant direct avec slot="label".',
        );
    }

    private _warnIfSlotLabelIgnored(): void {
        if (this._hasWarnedSlotLabelIgnored) return;
        if (!this.withoutHeader) return;
        if ((this.label ?? '').trim()) return;
        if (!this._slotController.test('label')) return;

        this._hasWarnedSlotLabelIgnored = true;
        warn(
            'ar-dialog',
            'slot="label" est ignoré quand without-header est actif (aria-label ne peut contenir que du texte brut). Utilisez la propriété "label".',
        );
    }

    private _warnIfNoCloseMechanism(): void {
        if (this._hasWarnedNoCloseMechanism) return;
        if (!this.withoutHeader) return;
        if (this.closeOnBackdrop) return;
        if (this.querySelector('[data-ar-dismiss], [data-ar-accept]')) return;

        this._hasWarnedNoCloseMechanism = true;
        warn(
            'ar-dialog',
            'without-header est actif sans close-on-backdrop ni élément [data-ar-dismiss]/[data-ar-accept] dans le contenu : seule la touche Échap permet de fermer ce dialog.',
        );
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this._removeOpenListeners();
        if (this.open || this._isClosing) this._unfreezeScroll();
    }

    override firstUpdated(): void {
        if (this.open && !this.dialog?.open) {
            this._show();
        }
    }

    override updated(changedProperties: PropertyValues<this>): void {
        this._warnIfMissingLabel();
        this._warnIfSlotLabelIgnored();
        if (
            (changedProperties.has('placement') || changedProperties.has('mode')) &&
            this.mode === 'modal' &&
            this.placement !== 'right'
        ) {
            warn('ar-dialog', 'placement n\'a aucun effet en mode "modal".');
        }
        if (changedProperties.has('open')) {
            if (this.open && !this.dialog?.open) {
                this._show();
            } else if (!this.open && this.dialog?.open) {
                this._scheduleClose();
            }
        }
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    override render(): TemplateResult {
        const headingLabel = this._getHeadingLabel();

        return html`
            <dialog
                part="dialog"
                role="dialog"
                aria-labelledby=${this.withoutHeader ? nothing : 'dialog-heading'}
                aria-label=${this.withoutHeader ? headingLabel : nothing}
                aria-describedby="dialog-body"
                aria-modal="true"
                ?inert=${!this.open || this._isClosing}
                @cancel=${this._handleDialogCancel}
                @click=${this._handleDialogClick}
                @pointerdown=${this._handleDialogPointerDown}
                @pointerup=${this._handleDialogPointerUp}
            >
                ${this.withoutHeader
                    ? nothing
                    : html`<header part="header">
                          <h1 part="title" id="dialog-heading">
                              ${this._slotController.test('label')
                                  ? html`<slot name="label"></slot>`
                                  : headingLabel}
                          </h1>
                          ${this._slotController.test('header-actions')
                              ? html`<div part="header-actions">
                                    <slot name="header-actions"></slot>
                                </div>`
                              : nothing}
                          <button part="close-button action-button" type="button" data-ar-dismiss>
                              <slot name="close-icon">
                                  <svg
                                      aria-hidden="true"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke-width="1.5"
                                      stroke="currentColor"
                                  >
                                      <path
                                          stroke-linecap="round"
                                          stroke-linejoin="round"
                                          d="M6 18 18 6M6 6l12 12"
                                      ></path>
                                  </svg>
                              </slot>
                              <span class="sr-only">${this.closeLabel}</span>
                          </button>
                      </header>`}
                <div part="body" id="dialog-body">
                    <slot></slot>
                </div>
                ${this._slotController.test('footer')
                    ? html`<footer part="footer">
                          <slot name="footer"></slot>
                      </footer>`
                    : nothing}
            </dialog>
        `;
    }

    // ── Scroll management ──────────────────────────────────────────────────────

    /** Bloque le scroll du body. */
    private _freezeScroll() {
        if (!_dialogStack.includes(this)) {
            _dialogStack.push(this);
            acquireScrollLock(document.body);
        }
    }

    /** Restaure le scroll du body, seulement quand aucun autre dialog n'est ouvert. */
    private _unfreezeScroll() {
        const idx = _dialogStack.indexOf(this);
        if (idx === -1) return;
        _dialogStack.splice(idx, 1);
        releaseScrollLock(document.body);
    }

    // ── Events ─────────────────────────────────────────────────────────────────

    private _emit(name: ArDialogEvents): CustomEvent {
        const e = new CustomEvent(name, {
            bubbles: true,
            composed: true,
            cancelable: true,
            detail: { id: this.id || undefined },
        });
        this.dispatchEvent(e);
        return e;
    }

    private _announcePrevented(): void {
        const message = this.preventedMessage.trim() || 'Fermeture bloquée.';
        announceA11y(message, 'assertive');
    }

    private _scheduleClose(): void {
        if (this._closePending) return;
        this._closePending = true;

        void this.updateComplete.then(() => {
            this._closePending = false;
            if (this.isConnected && !this.open && this.dialog?.open) {
                this._close();
            }
        });
    }

    private _addOpenListeners() {
        document.addEventListener('keydown', this._handleDocumentKeyDown);
    }

    private _removeOpenListeners() {
        document.removeEventListener('keydown', this._handleDocumentKeyDown);
    }

    // ── Interaction handlers ───────────────────────────────────────────────────

    private _handleDialogClick = (event: MouseEvent) => {
        // Fallback backdrop close for Safari iOS (WebKit #267688 — pointerdown absent sur backdrop).
        // Sur desktop, _handleDialogPointerUp déjà traité ; _close() est idempotent via _isClosing.
        if (this.closeOnBackdrop && event.target === this.dialog) {
            this._close();
            return;
        }

        const path = event.composedPath() as Element[];
        const stopAt = path.indexOf(this.dialog);
        const inner = stopAt >= 0 ? path.slice(0, stopAt) : path;
        const dismissed = inner.find(
            (n): n is HTMLElement => n instanceof HTMLElement && n.hasAttribute('data-ar-dismiss'),
        );
        const accepted = inner.find(
            (n): n is HTMLElement => n instanceof HTMLElement && n.hasAttribute('data-ar-accept'),
        );

        if (dismissed || accepted) {
            const e = this._emit(dismissed ? 'ar-dialog-dismissed' : 'ar-dialog-accepted');
            if (e.defaultPrevented) {
                event.stopPropagation();
                const prevented = dismissed
                    ? 'ar-dialog-dismissed-prevented'
                    : 'ar-dialog-accepted-prevented';
                this._emit(prevented);
                this._shake();
                this._announcePrevented();
                return;
            }

            event.stopPropagation();
            this._close();
        }
    };

    private _handleDocumentKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && this.open && !this._isClosing) {
            // N'intercepte Escape que si ce dialog est au sommet de la pile (dialogs empilés)
            if (_dialogStack[_dialogStack.length - 1] !== this) return;
            event.preventDefault();
            event.stopPropagation();
            this._close();
        }
    };

    private _handleDialogCancel = (event: Event) => {
        // Toujours annulé : la gestion Escape est déléguée à _handleDocumentKeyDown pour
        // respecter la pile de dialogs (_dialogStack) et les animations de fermeture.
        event.preventDefault();
    };

    private _handleDialogPointerDown = (event: PointerEvent) => {
        this._pointerDownTarget = event.target;
    };

    private _handleDialogPointerUp = (event: PointerEvent) => {
        if (!this.closeOnBackdrop) return;
        if (this._pointerDownTarget === this.dialog && event.target === this.dialog) {
            this._close();
        }
        this._pointerDownTarget = null;
    };

    // ── Open / Close ───────────────────────────────────────────────────────────

    /** Ouvre le dialog natif, gèle le scroll et enregistre le listener clavier. */
    private _show(): void {
        this._warnIfNoCloseMechanism();
        this._triggerElement = document.activeElement;
        const showEvent = this._emit('ar-dialog-show');
        if (showEvent.defaultPrevented) {
            this._triggerElement = null;
            this._emit('ar-dialog-show-prevented');
            void this.updateComplete.then(() => {
                if (this.isConnected && this.open && !this.dialog?.open) {
                    this.open = false;
                }
            });
            return;
        }

        this._addOpenListeners();
        this.dialog?.showModal();
        this._freezeScroll();

        if (!prefersReducedMotion()) {
            this.dialog.classList.add('opening');
            const onOpenEnd = (e: AnimationEvent) => {
                if (e.target !== this.dialog) return;
                this.dialog.classList.remove('opening');
                this.dialog.removeEventListener('animationend', onOpenEnd);
            };
            this.dialog.addEventListener('animationend', onOpenEnd);
        }

        this.updateComplete.then(() => {
            const autoFocused = this.querySelector<HTMLElement>('[autofocus]');
            const firstFocusable =
                autoFocused ??
                this.querySelector<HTMLElement>(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
                );
            if (firstFocusable) {
                firstFocusable.focus();
            } else {
                (
                    this.shadowRoot?.querySelector<HTMLElement>('[data-ar-dismiss]') ?? this.dialog
                )?.focus();
            }
            this._emit('ar-dialog-shown');
        });
    }

    /** Déclenche l'animation de fermeture et attend animationend avant de clore. */
    private _close(): void {
        if (this._isClosing) return;
        const hideEvent = this._emit('ar-dialog-hide');
        if (hideEvent.defaultPrevented) {
            this.open = true;
            this._emit('ar-dialog-hide-prevented');
            this._shake();
            this._announcePrevented();
            return;
        }

        this._isClosing = true;
        this.dialog.classList.remove('opening', 'shake');
        this.dialog.classList.add('closing');

        if (prefersReducedMotion()) {
            this._finishClose();
            return;
        }

        const fallback = setTimeout(() => {
            this.dialog.removeEventListener('animationend', onEnd);
            this._finishClose();
        }, 500);

        const onEnd = (e: AnimationEvent) => {
            if (e.target !== this.dialog) return;
            clearTimeout(fallback);
            this.dialog.removeEventListener('animationend', onEnd);
            this._finishClose();
        };
        this.dialog.addEventListener('animationend', onEnd);
    }

    /** Animation de rejet — déclenche un shake (ou outline si prefers-reduced-motion) pour signaler que la fermeture est bloquée. */
    private _shake(): void {
        const dialog = this.dialog;
        dialog.classList.remove('shake');
        void dialog.offsetWidth; // force reflow pour redémarrer l'animation si déjà en cours
        dialog.classList.add('shake');

        if (prefersReducedMotion()) {
            setTimeout(() => dialog.classList.remove('shake'), 700);
        } else {
            const onShakeEnd = (e: AnimationEvent) => {
                if (e.animationName && e.animationName !== 'dialogShake') return;
                dialog.classList.remove('shake');
                dialog.removeEventListener('animationend', onShakeEnd);
            };
            dialog.addEventListener('animationend', onShakeEnd);
        }
    }

    /** Finalise la fermeture : ferme le dialog natif, restaure l'état et émet ar-dialog-hidden. */
    private _finishClose(): void {
        this.dialog.classList.remove('closing', 'opening', 'shake');
        this.dialog.close();
        this._unfreezeScroll();
        this._removeOpenListeners();
        this._isClosing = false;
        this.open = false;
        const trigger = this._triggerElement;
        this._triggerElement = null;
        (trigger as HTMLElement | null)?.focus?.();
        this.updateComplete.then(() => this._emit('ar-dialog-hidden'));
    }
}
