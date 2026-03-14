import { LitElement, type TemplateResult, html, nothing } from 'lit';
import { type ClassInfo, classMap } from 'lit/directives/class-map.js';
import { customElement, property } from 'lit/decorators.js';
import styles from './alert.styles.js';

export function warn(name: string, message: string, error?: Error) {
    if (error) console.warn(`${name} - ${message}`, error);
    else console.warn(`${name} - ${message}`);
}

/** Objet de configuration d'un webcomposant MrAlert */
export class MrAlertConfig {
    /** Permet de spécifier le type d'alerte */
    version: MrAlertVersion = MrAlert.DEFAULT_VERSION;
    /** Permet d'afficher la croix de fermeture. La valeur attendue est l'ID de l'élément à focus après fermeture */
    nextFocus?: string;
    /** Désactive la notification aux lecteurs d'écran lors de l'apparition de l'alerte */
    withoutNotification: boolean = MrAlert.DEFAULT_NOTIFICATION;
}

/** Valeurs possibles pour la propriété version de MrAlert */
export type MrAlertVersion = 'success' | 'warning' | 'error' | 'info';

const VERSION_TO_CLASS: Record<MrAlertVersion, string> = {
    success: 'check-round-full',
    warning: 'warning-full',
    error: 'error-full',
    info: 'info-full',
};

/**
 * @summary Affiche un message d'alerte accessible avec différents niveaux de sévérité.
 * @display demo
 *
 * @slot title   - Titre de l'alerte.
 * @slot content - Corps du message de l'alerte.
 *
 * @csspart container - Le `<div>` englobant l'alerte.
 * @csspart icon      - Le conteneur de l'icône de version.
 * @csspart body      - Le conteneur du titre et du contenu.
 * @csspart close     - Le bouton de fermeture (présent uniquement si `next-focus` est défini).
 *
 *
 * @cssprop [--mr--bg-info=#dfe9ff]             - Couleur de fond pour une alerte de type "info".
 * @cssprop [--mr--border-info=#dfe9ff]         - Couleur de la bordure pour une alerte de type "info".
 * @cssprop [--mr--icon-info=#2c74ff]             - Couleur de l'icône pour une alerte de type "info".
 * @cssprop [--mr--bg-warning=#fffaeb]             - Couleur de fond pour une alerte de type "warning".
 * @cssprop [--mr--border-warning=#fffaeb]         - Couleur de la bordure pour une alerte de type "warning".
 * @cssprop [--mr--icon-warning=#f79009]             - Couleur de l'icône pour une alerte de type "warning".
 * @cssprop [--mr--bg-error=#ffeceb]             - Couleur de fond pour une alerte de type "error".
 * @cssprop [--mr--border-error=#ffeceb]         - Couleur de la bordure pour une alerte de type "error".
 * @cssprop [--mr--icon-error=#f04438]             - Couleur de l'icône pour une alerte de type "error".
 * @cssprop [--mr--bg-success=#d9f6e8]             - Couleur de fond pour une alerte de type "success".
 * @cssprop [--mr--border-success=#d9f6e8]         - Couleur de la bordure pour une alerte de type "success".
 * @cssprop [--mr--icon-success=#09aa5f]             - Couleur de l'icône pour une alerte de type "success".

 *
 * @event {CustomEvent} mr-alert-close - Émis après la fermeture de l'alerte (fin de transition).
 */
@customElement('mr-alert')
export class MrAlert extends LitElement {
    static override styles = [styles];

    /** Nom du composant affiché dans les logs */
    // @ignore
    static readonly NAME = 'MrAlert';
    // @ignore
    static readonly DEFAULT_VERSION: MrAlertVersion = 'error';
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
     * Type d'alerte. Détermine la couleur et l'icône affichées.
     * @attr version
     */
    @property({ reflect: true, type: String, useDefault: true })
    version?: 'success' | 'warning' | 'error' | 'info';

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

    override render(): TemplateResult {
        const containerClassMap: ClassInfo = {
            alert: true,
            'alert-dismissible': this.nextFocus !== undefined,
        };
        containerClassMap[`alert-${this.version ?? MrAlert.DEFAULT_VERSION}`] = true;

        return html` <div
            part="container"
            class=${classMap(containerClassMap)}
            .role=${this.withoutNotification
                ? nothing
                : this.version === 'info'
                  ? 'status'
                  : 'alert'}
        >
            <div part="icon" class="alert-icon-container has-icon-top">
                <span
                    aria-hidden="true"
                    class="icon icon-${VERSION_TO_CLASS[this.version ?? MrAlert.DEFAULT_VERSION]}"
                ></span>
            </div>
            <div part="body" class="alert-body">
                <p class="alert-title"><slot name="title"></slot></p>
                <p class="alert-content"><slot name="content"></slot></p>
            </div>
            ${this.canBeHidden
                ? html` <button
                      part="close"
                      @click=${this._hide}
                      class="btn btn-sm btn-tertiary light close"
                      type="button"
                      aria-label="Fermer l'alerte"
                  >
                      X
                  </button>`
                : nothing}
        </div>`;
    }

    /** Indique si l'alerte peut être fermée (next-focus défini et non vide) */
    get canBeHidden(): boolean {
        return this.nextFocus !== undefined && this.nextFocus?.replaceAll(' ', '') !== '';
    }

    private _hide = (): void => {
        this.hiding = this.canBeHidden;
    };

    /** Supprime l'alerte du DOM et reporte le focus après la fin de la transition CSS */
    private _finishHide = (): void => {
        if (!this.canBeHidden) return;

        if (this.hiding) {
            this.dispatchEvent(
                new CustomEvent('mr-alert-close', { bubbles: true, composed: true }),
            );
            this.remove();
        }

        const $focusableElement = document.getElementById(
            `${(this.nextFocus as string).replace('#', '')}`,
        );
        if (!$focusableElement) {
            console.error(
                `${MrAlert.NAME} - L'id "${this.nextFocus}" spécifié via 'next-focus' n'est pas présent dans la page.`,
            );
            return;
        }
        $focusableElement.focus();
    };
}

declare global {
    interface HTMLElementTagNameMap {
        'mr-alert': MrAlert;
    }
}
