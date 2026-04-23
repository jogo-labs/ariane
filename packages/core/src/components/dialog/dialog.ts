import {
    LitElement,
    type TemplateResult,
    html,
    type CSSResultGroup,
    type PropertyValues,
} from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import utilitiesStyles from '../../styles/utilities.styles.js';
import buttonStyles from '../../styles/components/button.styles.js';
import styles from './dialog.styles.js';

/** Evènements envoyés par le webcomposant FTModalSide */
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

const arDialogLocks = new Set();

/**
 * @summary Version améliorée du composant natif <dialog> avec affichage centré ou panel.
 *
 * @slot header
 * @slot title
 * @slot
 * @slot footer
 *
 * @csspart base - L'élément racine du composant.
 * @cssprop [--ar-dialog-size=auto] - Taille du composant.
 *
 * @event {CustomEvent} ar-dialog-change - Émis lors d'un changement.
 */
@customElement('ar-dialog')
export class ArDialog extends LitElement {
    static override styles: CSSResultGroup = [utilitiesStyles, buttonStyles, styles];

    // Variables internes

    // Références HTML
    /** Elément HTML contenant la dialog */
    @query('dialog', true)
    dialog?: HTMLDialogElement;

    /**
     * Visibilité du composant.
     * Quand l'attribut est présent le composant est visible.
     * @attr open
     * @default false
     */
    @property({ reflect: true, type: Boolean }) open: boolean = false;

    /**
     * Possibilité de fermer le composant en cliquant sur le backdrop.
     * Si vrai, le composant ne se ferme pas quand l'utilisateur clique sur le fond grisé
     *
     * @attr staticBackdrop
     * @default staticBackdrop
     */
    @property({ reflect: true, type: Boolean, attribute: 'static-backdrop' })
    staticBackdrop: boolean = false;

    /**
     * Le label du composant dialog affiché dans le header.
     * Pour utiliser du HTML, utiliser le slot `label`.
     */
    @property({ reflect: true }) label = '';

    /**
     * Mode d'affichage du composant.
     *
     * @attr mode
     * @default dialog
     */
    @property({ reflect: true, type: String })
    mode: 'modal' | 'panel' = 'modal';

    /**
     * Position du composant.
     * Utilisé uniquement pour le mode 'panel'
     *
     * @attr mode
     * @default dialog
     */
    @property({ reflect: true, type: String })
    placement: 'left' | 'right' = 'right';

    /**
     * Largeur du composant.
     *
     * @attr mode
     * @default size
     */
    @property({ reflect: true, type: String })
    size: 'sm' | 'md' | 'lg' | 'xl' = 'md';

    /** Valeur de la propriété de style overflow sur l'élément body à l'ouverture de la modale */
    private _overflowOnClose: string | null = null;

    private _pointerDownTarget: EventTarget | null = null;

    @state() private _isClosing = false;

    // ---------------------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------------------

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this.removeOpenListeners();
        if (this.open) {
            this._unfreezeScroll();
        }
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

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

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
                            <slot name="header">
                                <h1 part="title" class="dialog-title" id="dialog-heading">
                                    <slot name="label">${this.label}</slot>
                                </h1>
                                <button
                                    id="ftdialog-close"
                                    type="button"
                                    class="btn btn-tertiary light close btn-ratio-square"
                                    data-dismiss="dialog"
                                    aria-describedby="dialog-heading"
                                >
                                    <span aria-hidden="true" class="icon icon-close"></span>
                                    <span class="btn-content sr-only">Fermer la modale</span>
                                </button>
                            </slot>
                        </header>
                        <div part="body" class="dialog-body">
                            <slot></slot>
                        </div>
                        <footer part="footer" class="dialog-footer">
                            <slot name="footer"></slot>
                        </footer>
                    </div>
                </div>
            </dialog>
        `;
    }

    /** Empêche le scroll sur le corps de page quand la modale est ouverte */
    private _freezeScroll() {
        arDialogLocks.add(this);

        // On ajoute overflow hidden
        if (arDialogLocks.size === 1 && document.body.style.overflow) {
            // On fait un backup de l'overflow actuel
            this._overflowOnClose = document.body.style.overflow;
        }
        document.body.style.overflow = 'hidden';
    }

    /** Remet le scroll sur le corps de page quand la modale est fermée */
    private _unfreezeScroll() {
        arDialogLocks.delete(this);
        if (arDialogLocks.size > 0) return;

        // On rétabli la valeur précédente si nécessaire
        if (this._overflowOnClose) {
            document.body.style.overflow = this._overflowOnClose;
            this._overflowOnClose = null;
        }
        // Sinon on retire la clé
        else {
            document.body.style.removeProperty('overflow');
        }
    }

    /**
     * Emet l'évènement correspondant (ouverture, fermeture, ...)
     * @param  name Nom de l'évènement à transmettre
     * @emits Evènement du nom renseigné
     */
    private _emit(name: ArDialogEvents): CustomEvent {
        const e = new CustomEvent(name, {
            bubbles: true,
            composed: true,
            cancelable: true,
            detail: { id: this.id },
        });
        this.dispatchEvent(e);
        return e;
    }

    private addOpenListeners() {
        document.addEventListener('keydown', this._handleDocumentKeyDown);
    }

    private removeOpenListeners() {
        document.removeEventListener('keydown', this._handleDocumentKeyDown);
    }

    // ***** INTERACTIONS *****
    /**
     * Au click sur la modale, récupère quel élément a été cliqué et cache la modale selon le bouton.
     * @param {MouseEvent} event Evènement du click
     */
    private _handleDialogClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const dismissed = target.closest('[data-dismiss="dialog"]');
        const accepted = target.closest('[data-accept="dialog"]');

        if (dismissed || accepted) {
            const e = this._emit(dismissed ? 'ar-dialog-dismissed' : 'ar-dialog-accepted');
            if (e.defaultPrevented) {
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

    /**
     * À l'appui sur la touche escape, on ferme la modale
     * @param {KeyboardEvent} event
     */
    private _handleDocumentKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && this.open) {
            event.preventDefault();
            event.stopPropagation();
            this._close();
        }
    };

    /**
     * Gestion de l'événement 'cancel' déclenché par le <dialog> lorsque la touche Esc est appuyée
     * @param {Event} event
     */
    private _handleDialogCancel = (event: Event) => {
        event.preventDefault(); // Empêche la fermeture automatique du dialog sur "Escape"
    };

    /**
     * Au pointerdown sur la dialog, mémorise la cible pour comparaison au pointerup
     * @param {PointerEvent} event
     */
    private _handleDialogPointerDown = (event: PointerEvent) => {
        this._pointerDownTarget = event.target;
    };

    /**
     * Au pointerup sur le backdrop, ferme la modale si le pointerdown était aussi sur le backdrop
     * @param {PointerEvent} event
     */
    private _handleDialogPointerUp = (event: PointerEvent) => {
        if (this.staticBackdrop) return;
        if (this._pointerDownTarget === this.dialog && event.target === this.dialog) {
            this._close();
        }
        this._pointerDownTarget = null;
    };

    // ***** API *****
    /** Affiche la modale, fige le scroll et ajoute l'écoute du click */
    private _show(): void {
        const showEvent = this._emit('ar-dialog-show');
        if (showEvent.defaultPrevented) {
            return;
        }

        this.addOpenListeners();
        this.dialog?.showModal();
        this.open = true;
        this._freezeScroll();

        this._emit('ar-dialog-shown');
    }

    /** Cache la modale avec une animation, réactive le scroll et supprime l'écoute du click */
    private _close(): void {
        if (this._isClosing) return;
        const ftModalHideEvent = this._emit('ar-dialog-hide');

        // Si la fermeture est annulée
        if (ftModalHideEvent.defaultPrevented) {
            this.open = true;
            this._emit('ar-dialog-hide-prevented');
            return;
        }

        this._isClosing = true;

        const prefersReducedMotion =
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const animationTiming = prefersReducedMotion ? 0 : 400;
        this.dialog?.classList.add('closing');

        setTimeout(() => {
            this.dialog?.classList.remove('closing');
            this.dialog?.close();
            this._unfreezeScroll();
            this.removeOpenListeners();
            this._isClosing = false;
            this.open = false;
            this._emit('ar-dialog-hidden');
        }, animationTiming);
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-dialog': ArDialog;
    }
}
