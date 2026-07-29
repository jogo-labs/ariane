import { LitElement, type TemplateResult, html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import styles from './alert.styles.js';
import { prefersReducedMotion } from '../../utils/media.js';
import { warn } from '../../utils/warn.js';

/** Objet de configuration d'un webcomposant ArAlert */
export class ArAlertConfig {
    /** Permet de spécifier le type d'alerte */
    variant: ArAlertVariant = ArAlert.DEFAULT_VARIANT;
    /** Permet d'afficher la croix de fermeture. La valeur attendue est l'ID de l'élément à focus après fermeture */
    nextFocus?: string;
    /** Désactive la notification aux lecteurs d'écran lors de l'apparition de l'alerte */
    withoutNotification: boolean = ArAlert.DEFAULT_NOTIFICATION;
}

/** Valeurs possibles pour la propriété variant de ArAlert */
export type ArAlertVariant = 'success' | 'warning' | 'error' | 'info';

/**
 * @summary Affiche un message d'alerte accessible avec différents niveaux de sévérité.
 * @display demo
 *
 * @slot              - Contenu de l'alerte (texte, titre, liens…).
 * @slot icon         - Icône de l'alerte. Remplace l'icône par défaut si fourni.
 * @slot close-icon   - Icône du bouton de fermeture. Remplace le SVG "×" par défaut.
 *
 * @csspart icon      - Le conteneur de l'icône de variant.
 * @csspart icon-svg  - Le SVG de l'icône de variant par défaut (absent si le slot `icon` est utilisé).
 * @csspart body      - Le conteneur du titre et du contenu.
 * @csspart close     - Le bouton de fermeture (présent uniquement si `next-focus` est défini).
 *
 * @cssprop --ar-alert-close-size - Taille (width/height) du bouton de fermeture.
 * @cssprop --ar-alert-info-bg - Fond de l'alerte "info".
 * @cssprop --ar-alert-info-border - Bordure de l'alerte "info".
 * @cssprop --ar-alert-info-icon - Couleur de l'icône "info".
 * @cssprop --ar-alert-warning-bg - Fond de l'alerte "warning".
 * @cssprop --ar-alert-warning-border - Bordure de l'alerte "warning".
 * @cssprop --ar-alert-warning-icon - Couleur de l'icône "warning".
 * @cssprop --ar-alert-error-bg - Fond de l'alerte "error".
 * @cssprop --ar-alert-error-border - Bordure de l'alerte "error".
 * @cssprop --ar-alert-error-icon - Couleur de l'icône "error".
 * @cssprop --ar-alert-success-bg - Fond de l'alerte "success".
 * @cssprop --ar-alert-success-border - Bordure de l'alerte "success".
 * @cssprop --ar-alert-success-icon - Couleur de l'icône "success".
 * @cssprop --ar-alert-close-transition-duration - Durée de la transition (opacity/background-color) du bouton de fermeture au survol/focus.
 * @cssprop --ar-alert-hide-transition-duration - Durée de la transition de sortie (opacity/transform) à la fermeture.
 * @cssprop --ar-alert-color - Couleur du texte de l'alerte (cascade vers --ar-color-text).

 *
 * @event {CustomEvent} ar-alert-close - Émis après la fermeture de l'alerte (fin de transition).
 */
export class ArAlert extends LitElement {
    static override styles = [styles];

    // @ignore
    static readonly DEFAULT_VARIANT: ArAlertVariant = 'error';
    // @ignore
    static readonly DEFAULT_NOTIFICATION = false;

    /**
     * ID de l'élément à focus après la fermeture de l'alerte.
     * Quand défini, affiche le bouton de fermeture.
     * @attr next-focus
     * @default undefined
     */
    @property({ reflect: true, type: String, attribute: 'next-focus' })
    nextFocus?: string;

    /**
     * Désactive la notification ARIA lors de l'apparition de l'alerte.
     * Par défaut, les lecteurs d'écran sont notifiés via `role="alert"` ou `role="status"`.
     * @attr without-notification
     */
    @property({ reflect: true, type: Boolean, attribute: 'without-notification' })
    withoutNotification = false;

    /**
     * Force le niveau d'urgence ARIA indépendamment de `variant` : `role="alert"` si présent,
     * sinon déduit de `variant` via une table de correspondance interne (`error`/`warning` →
     * `alert`, `success`/`info` → `status`, tout autre variant → `status`).
     * @attr urgent
     * @default undefined
     */
    @property({ type: Boolean })
    urgent?: boolean;

    /**
     * Type d'alerte. Détermine la couleur et l'icône affichées.
     * @attr variant
     */
    @property({ reflect: true, type: String })
    variant: ArAlertVariant | (string & {}) = 'error';

    /**
     * Indique si l'alerte est en cours de fermeture (animation de sortie).
     * Passé à `true` au clic sur le bouton close, déclenche la transition CSS.
     * @ignore
     */
    @property({ reflect: true, type: Boolean })
    protected hiding: boolean = false;

    constructor() {
        super();
        // Lance la suppression du DOM à la fin de l'animation de fermeture
        this.addEventListener('transitionend', this._finishHide);
    }

    override updated(changed: Map<string, unknown>) {
        if (changed.has('variant') || changed.has('withoutNotification') || changed.has('urgent')) {
            this._updateRole();
        }
        if (changed.has('variant') && !(this.variant in ArAlert._ICON_PATHS)) {
            warn(
                'ar-alert',
                `variant="${this.variant}" n'a pas d'icône par défaut, fournissez un contenu via slot="icon".`,
            );
        }
    }

    private _updateRole(): void {
        if (this.withoutNotification) {
            this.removeAttribute('role');
            return;
        }
        if (this.urgent !== undefined) {
            this.role = this.urgent ? 'alert' : 'status';
            return;
        }
        this.role = ArAlert._ROLE_BY_VARIANT[this.variant] ?? 'status';
    }

    private static readonly _ROLE_BY_VARIANT: Record<string, 'alert' | 'status'> = {
        error: 'alert',
        warning: 'alert',
        success: 'status',
        info: 'status',
    };

    private static readonly _ICON_PATHS: Record<ArAlertVariant, string> = {
        success: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
        warning:
            'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z',
        info: 'm11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z',
        error: 'M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z',
    };

    protected _defaultIcon(): TemplateResult | typeof nothing {
        const path = (ArAlert._ICON_PATHS as Record<string, string>)[this.variant];
        if (path === undefined) return nothing;
        return html` <svg
            aria-hidden="true"
            part="icon-svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
        >
            <path stroke-linecap="round" stroke-linejoin="round" d=${path}></path>
        </svg>`;
    }

    protected _defaultCloseIcon(): TemplateResult {
        return html`<svg
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
        >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"></path>
        </svg>`;
    }

    override render(): TemplateResult {
        return html` <div part="icon">
                <slot name="icon"> ${this._defaultIcon()} </slot>
            </div>
            <div part="body" class="alert-body">
                <slot></slot>
            </div>
            ${this.canBeHidden
                ? html` <button
                      part="close"
                      @click=${this._hide}
                      type="button"
                      aria-label="Fermer l'alerte"
                  >
                      <slot name="close-icon">${this._defaultCloseIcon()}</slot>
                  </button>`
                : nothing}`;
    }

    /** Indique si l'alerte peut être fermée (next-focus défini et non vide) */
    get canBeHidden(): boolean {
        return this.nextFocus !== undefined && this.nextFocus?.replaceAll(' ', '') !== '';
    }

    private _shouldAnimate(): boolean {
        // transitionend ne se déclenche pas si duration=0s (défaut headless sans thème).
        // On vérifie la durée calculée pour éviter que la fermeture reste bloquée indéfiniment.
        const d = parseFloat(getComputedStyle(this).transitionDuration) || 0;
        return !prefersReducedMotion() && d > 0;
    }

    private _hide = (): void => {
        if (!this.canBeHidden) return;
        this.hiding = true;
        // La reflection de l'attribut `hiding` par Lit n'est pas synchrone : on attend
        // updateComplete pour que `:host([hiding])` ait pu matcher avant de mesurer la durée.
        void this.updateComplete.then(() => {
            if (!this._shouldAnimate()) {
                this._finishHide();
            }
        });
    };

    /** Supprime l'alerte du DOM et reporte le focus après la fin de la transition CSS */
    private _finishHide = (): void => {
        if (!this.canBeHidden || !this.hiding) return;
        // Idempotent : le thème anime opacity ET transform, donc `transitionend` se déclenche
        // deux fois (une par propriété) — sans ce reset, le second appel repasserait la garde.
        this.hiding = false;

        this.dispatchEvent(new CustomEvent('ar-alert-close', { bubbles: true, composed: true }));
        this.remove();

        const $focusableElement = document.getElementById(
            `${(this.nextFocus as string).replace('#', '')}`,
        );
        if (!$focusableElement) {
            warn(
                'ar-alert',
                `L'id "${this.nextFocus}" spécifié via 'next-focus' n'est pas présent dans la page.`,
            );
            return;
        }
        $focusableElement.focus();
    };
}
