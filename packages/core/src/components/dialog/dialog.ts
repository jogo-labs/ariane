import {
    LitElement,
    nothing,
    type TemplateResult,
    html,
    type CSSResultGroup,
    type PropertyValues,
} from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import utilitiesStyles from '../../styles/utilities.styles.js';
import buttonStyles from '../../styles/components/button.styles.js';
import styles from './dialog.styles.js';

/** Evènements envoyés par le webcomposant ArDialog */
export type ArDialogEvents =
    | 'ar-dialog-show'
    | 'ar-dialog-shown'
    | 'ar-dialog-hide'
    | 'ar-dialog-hide-prevented'
    | 'ar-dialog-hidden'
    | 'ar-dialog-dismissed'
    | 'ar-dialog-dismissed-prevented'
    | 'ar-dialog-accepted'
    | 'ar-dialog-accepted-prevented';

const arDialogLocks = new Set<ArDialog>();
let _savedBodyOverflow: string | null = null;

if (typeof document !== 'undefined') {
    document.addEventListener(
        'click',
        (e: MouseEvent) => {
            const trigger = (e.target as Element).closest('[data-ar-dialog-open]');
            if (!trigger) return;
            const id = trigger.getAttribute('data-ar-dialog-open');
            const target = id ? (document.getElementById(id) as ArDialog | null) : null;
            if (target?.tagName === 'AR-DIALOG') target.open = true;
        },
        { capture: true },
    );
}

/**
 * @summary Version améliorée du composant natif <dialog> avec affichage centré ou panel.
 *
 * @slot label - Titre du dialog. Remplace la propriété `label` si du HTML est nécessaire.
 * @slot - Contenu principal du dialog.
 * @slot footer - Actions du dialog (boutons). Absent du DOM si non fourni.
 *
 * @csspart dialog - L'élément <dialog> racine.
 * @csspart header - L'en-tête contenant le titre et le bouton de fermeture.
 * @csspart title - Le titre du dialog.
 * @csspart body - La zone de contenu principale.
 * @csspart footer - La zone d'actions (absente du DOM si slot non utilisé).
 *
 * @event {CustomEvent} ar-dialog-show - Émis avant l'ouverture. Annulable.
 * @event {CustomEvent} ar-dialog-shown - Émis après l'ouverture (après updateComplete).
 * @event {CustomEvent} ar-dialog-hide - Émis avant la fermeture. Annulable.
 * @event {CustomEvent} ar-dialog-hide-prevented - Émis si ar-dialog-hide est annulé.
 * @event {CustomEvent} ar-dialog-hidden - Émis après la fermeture (après animation).
 * @event {CustomEvent} ar-dialog-dismissed - Émis lors d'un clic sur data-ar-dismiss. Annulable.
 * @event {CustomEvent} ar-dialog-dismissed-prevented - Émis si ar-dialog-dismissed est annulé.
 * @event {CustomEvent} ar-dialog-accepted - Émis lors d'un clic sur data-ar-accept. Annulable.
 * @event {CustomEvent} ar-dialog-accepted-prevented - Émis si ar-dialog-accepted est annulé.
 */
@customElement('ar-dialog')
export class ArDialog extends LitElement {
    static override styles: CSSResultGroup = [utilitiesStyles, buttonStyles, styles];

    // ── Public properties ──────────────────────────────────────────────────────

    /**
     * Visibilité du composant.
     * Quand l'attribut est présent le composant est visible.
     * @attr open
     * @default false
     */
    @property({ reflect: true, type: Boolean }) open: boolean = false;

    /**
     * Si vrai, un clic sur le backdrop ne ferme pas le dialog.
     *
     * @attr static-backdrop
     * @default false
     */
    @property({ reflect: true, type: Boolean, attribute: 'static-backdrop' })
    staticBackdrop: boolean = false;

    /**
     * Titre affiché dans le header. Pour du HTML, utiliser `slot="label"`.
     *
     * @attr label
     * @default ''
     */
    @property({ reflect: true }) label = '';

    /**
     * Mode d'affichage : `modal` (centré avec backdrop) ou `panel` (latéral).
     *
     * @attr mode
     * @default 'modal'
     */
    @property({ reflect: true, type: String })
    mode: 'modal' | 'panel' = 'modal';

    /**
     * Côté d'affichage du panel. Sans effet en mode `modal`.
     *
     * @attr placement
     * @default 'right'
     */
    @property({ reflect: true, type: String })
    placement: 'left' | 'right' = 'right';

    /**
     * Largeur du dialog. Les valeurs correspondent à des tailles CSS prédéfinies.
     *
     * @attr size
     * @default 'md'
     */
    @property({ reflect: true, type: String })
    size: 'sm' | 'md' | 'lg' | 'xl' = 'md';

    // ── Private state ──────────────────────────────────────────────────────────

    @query('dialog', true)
    dialog!: HTMLDialogElement;

    /** Cible du dernier pointerdown, pour distinguer un vrai clic backdrop d'un drag. */
    private _pointerDownTarget: EventTarget | null = null;

    /** Vrai pendant l'animation de fermeture — bloque les interactions et les double-appels. */
    @state() private _isClosing = false;

    /** Vrai si au moins un enfant direct avec slot="footer" est présent. */
    @state() private _hasFooter = false;

    private _footerObserver?: MutationObserver;

    private _checkFooter(): void {
        this._hasFooter = !!this.querySelector(':scope > [slot="footer"]');
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    override connectedCallback(): void {
        super.connectedCallback();
        this._checkFooter();
        this._footerObserver = new MutationObserver(() => this._checkFooter());
        this._footerObserver.observe(this, { childList: true });
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this._footerObserver?.disconnect();
        this._removeOpenListeners();
        if (this.open || this._isClosing) this._unfreezeScroll();
    }

    override firstUpdated(): void {
        if (this.open && !this.dialog?.open) {
            this._show();
        }
    }

    override updated(changedProperties: PropertyValues<this>): void {
        if (changedProperties.has('open')) {
            if (this.open && !this.dialog?.open) {
                this._show();
            } else if (!this.open && this.dialog?.open) {
                this._close();
            }
        }
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    override render(): TemplateResult {
        return html`
            <dialog
                part="dialog"
                aria-labelledby="dialog-heading"
                aria-modal="true"
                role="dialog"
                ?inert=${!this.open || this._isClosing}
                @cancel=${this._handleDialogCancel}
                @click=${this._handleDialogClick}
                @pointerdown=${this._handleDialogPointerDown}
                @pointerup=${this._handleDialogPointerUp}
            >
                <div class="modal-dialog" role="document">
                    <div class="dialog-content">
                        <header part="header" class="dialog-header">
                            <h1 part="title" class="dialog-title" id="dialog-heading">
                                <slot name="label">${this.label}</slot>
                            </h1>
                            <button
                                type="button"
                                class="btn btn-tertiary light close btn-ratio-square"
                                data-ar-dismiss
                            >
                                <span aria-hidden="true" class="icon icon-close"></span>
                                <span class="btn-content sr-only">Fermer la modale</span>
                            </button>
                        </header>
                        <div part="body" class="dialog-body">
                            <slot></slot>
                        </div>
                        ${this._hasFooter
                            ? html`<footer part="footer" class="dialog-footer">
                                  <slot name="footer"></slot>
                              </footer>`
                            : nothing}
                    </div>
                </div>
            </dialog>
        `;
    }

    // ── Scroll management ──────────────────────────────────────────────────────

    /** Bloque le scroll du body. Le backup est partagé entre instances pour gérer les dialogs empilés. */
    private _freezeScroll() {
        if (arDialogLocks.size === 0) {
            _savedBodyOverflow = document.body.style.overflow || null;
        }
        arDialogLocks.add(this);
        document.body.style.overflow = 'hidden';
    }

    /** Restaure le scroll du body, seulement quand aucun autre dialog n'est ouvert. */
    private _unfreezeScroll() {
        arDialogLocks.delete(this);
        if (arDialogLocks.size > 0) return;

        if (_savedBodyOverflow) {
            document.body.style.overflow = _savedBodyOverflow;
        } else {
            document.body.style.removeProperty('overflow');
        }
        _savedBodyOverflow = null;
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

    private _addOpenListeners() {
        document.addEventListener('keydown', this._handleDocumentKeyDown);
    }

    private _removeOpenListeners() {
        document.removeEventListener('keydown', this._handleDocumentKeyDown);
    }

    // ── Interaction handlers ───────────────────────────────────────────────────

    private _handleDialogClick = (event: MouseEvent) => {
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
                return;
            }

            event.stopPropagation();
            this._close();
        }
    };

    private _handleDocumentKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && this.open && !this._isClosing) {
            event.preventDefault();
            event.stopPropagation();
            this._close();
        }
    };

    private _handleDialogCancel = (event: Event) => {
        event.preventDefault(); // Empêche la fermeture automatique du <dialog> natif sur Escape
    };

    private _handleDialogPointerDown = (event: PointerEvent) => {
        this._pointerDownTarget = event.target;
    };

    private _handleDialogPointerUp = (event: PointerEvent) => {
        if (this.staticBackdrop) return;
        if (this._pointerDownTarget === this.dialog && event.target === this.dialog) {
            this._close();
        }
        this._pointerDownTarget = null;
    };

    // ── Open / Close ───────────────────────────────────────────────────────────

    /** Ouvre le dialog natif, gèle le scroll et enregistre le listener clavier. */
    private _show(): void {
        const showEvent = this._emit('ar-dialog-show');
        if (showEvent.defaultPrevented) {
            return;
        }

        this._addOpenListeners();
        this.dialog?.showModal();
        this._freezeScroll();

        this.updateComplete.then(() => this._emit('ar-dialog-shown'));
    }

    /** Déclenche l'animation de fermeture et attend animationend avant de clore. */
    private _close(): void {
        if (this._isClosing) return;
        const hideEvent = this._emit('ar-dialog-hide');
        if (hideEvent.defaultPrevented) {
            this.open = true;
            this._emit('ar-dialog-hide-prevented');
            return;
        }

        const prefersReducedMotion =
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this._isClosing = true;
        this.dialog.classList.add('closing');

        if (prefersReducedMotion) {
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

    /** Finalise la fermeture : ferme le dialog natif, restaure l'état et émet ar-dialog-hidden. */
    private _finishClose(): void {
        this.dialog.classList.remove('closing');
        this.dialog.close();
        this._unfreezeScroll();
        this._removeOpenListeners();
        this._isClosing = false;
        this.open = false;
        this.updateComplete.then(() => this._emit('ar-dialog-hidden'));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-dialog': ArDialog;
    }
}
