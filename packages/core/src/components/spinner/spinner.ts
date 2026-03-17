import { LitElement, type TemplateResult, html, type CSSResultGroup, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import utilitiesStyles from '../../styles/utilities.styles.js';
import animationsStyles from '../../styles/animations.styles.js';
import styles from './spinner.styles.js';

/**
 * @summary Indicateur de chargement accessible avec états "en cours" et "terminé".
 * @display demo
 *
 * Le spinner SVG est masqué (`hidden`) quand `done` est `true`.
 * Un `<div role="alert">` annonce aux lecteurs d'écran le changement d'état,
 * que ce soit l'état de chargement ou de fin.
 *
 * @csspart spinner   - L'élément `<svg>` du spinner (visible quand `done` est false).
 * @csspart status    - Le `<div role="alert">` lu par les lecteurs d'écran.
 *
 * @cssprop [--ar--spinner-stroke-color=#5b5d65]     - Couleur du trait SVG. Défaut : `currentColor`.
 */
@customElement('ar-spinner')
export class ArSpinner extends LitElement {
    static override styles: CSSResultGroup = [utilitiesStyles, animationsStyles, styles];

    static readonly NAME = 'ArSpinner';
    static readonly DEFAULT_DONE: boolean = false;
    static readonly DEFAULT_LOADING_LABEL: string = 'Contenu en cours de chargement';
    static readonly DEFAULT_DONE_LABEL: string = 'Chargement terminé';

    /**
     * Passe le spinner en état "terminé" : masque le SVG et met à jour l'annonce ARIA.
     * @attr done
     * @default false
     */
    @property({ reflect: true, useDefault: true, type: Boolean })
    done: boolean = ArSpinner.DEFAULT_DONE;

    /**
     * Texte annoncé aux lecteurs d'écran pendant le chargement.
     * @attr loading-label
     * @default 'Contenu en cours de chargement'
     */
    @property({ reflect: true, useDefault: true, type: String, attribute: 'loading-label' })
    loadingLabel: string = ArSpinner.DEFAULT_LOADING_LABEL;

    /**
     * Texte annoncé aux lecteurs d'écran quand le chargement est terminé.
     * @attr done-label
     * @default 'Chargement terminé'
     */
    @property({ reflect: true, useDefault: true, type: String, attribute: 'done-label' })
    doneLabel: string = ArSpinner.DEFAULT_DONE_LABEL;

    @property({ reflect: true, type: String, useDefault: true })
    size: 'xs' | 'sm' | 'lg' | undefined = undefined;

    override render(): TemplateResult {
        return html` <svg
                part="spinner"
                class="spinner"
                viewBox="25 25 50 50"
                aria-hidden="true"
                focusable="false"
                ?hidden=${this.done}
            >
                ${svg`<circle
                    class="spinner-path"
                    cx="50" cy="50" r="20"
                    fill="none"
                    stroke-width="4"
                    stroke-miterlimit="10"
                ></circle>`}
            </svg>
            <div part="status" role="alert" class="sr-only">
                <p>${this.done ? this.doneLabel : this.loadingLabel}</p>
            </div>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-spinner': ArSpinner;
    }
}
