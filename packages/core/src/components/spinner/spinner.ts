import { LitElement, type TemplateResult, html, type CSSResultGroup, svg } from 'lit';
import { property } from 'lit/decorators.js';
import utilitiesStyles from '../../styles/utilities.styles.js';
import animationsStyles from '../../styles/animations.styles.js';
import styles from './spinner.styles.js';
import { warn } from '../../utils/warn.js';
import { LocalizeController } from '../../controllers/localize.controller.js';
// fr avant en : la première traduction enregistrée devient le repli de la lib pour les langues non reconnues.
import '../../translations/fr.js';
import '../../translations/en.js';

/**
 * @summary Indique qu'une opération est en cours quand sa durée est inconnue. À utiliser pour un état de chargement là où une barre de progression déterminée n'est pas pertinente.
 * @display demo
 * @localized
 *
 * Le spinner SVG est masqué (`hidden`) quand `done` est `true`.
 * Un `<div role="alert">` annonce aux lecteurs d'écran le changement d'état,
 * que ce soit l'état de chargement ou de fin.
 *
 * @csspart spinner   - L'élément `<svg>` du spinner (visible quand `done` est false).
 * @csspart status    - Le `<div role="alert">` lu par les lecteurs d'écran.
 *
 * @cssprop --ar-spinner-stroke-color - Couleur du trait SVG. Hérite de `currentColor` par défaut.
 */
export class ArSpinner extends LitElement {
    static override styles: CSSResultGroup = [utilitiesStyles, animationsStyles, styles];
    static readonly DEFAULT_DONE: boolean = false;

    private readonly localize = new LocalizeController(this);

    /**
     * Passe le spinner en état "terminé" : masque le SVG et met à jour l'annonce ARIA.
     */
    @property({ reflect: true, useDefault: true, type: Boolean })
    done: boolean = ArSpinner.DEFAULT_DONE;

    /**
     * Texte annoncé aux lecteurs d'écran pendant le chargement. Traduit automatiquement selon
     * `lang` si non personnalisé.
     */
    @property({ reflect: true, useDefault: true, type: String, attribute: 'loading-label' })
    loadingLabel: string | undefined = undefined;

    /**
     * Texte annoncé aux lecteurs d'écran quand le chargement est terminé. Traduit automatiquement
     * selon `lang` si non personnalisé.
     */
    @property({ reflect: true, useDefault: true, type: String, attribute: 'done-label' })
    doneLabel: string | undefined = undefined;

    @property({ reflect: true, type: String, useDefault: true })
    size: 'xs' | 'sm' | 'lg' | undefined = undefined;

    override updated(changed: Map<string, unknown>): void {
        if (
            changed.has('loadingLabel') &&
            this.loadingLabel !== undefined &&
            !this.loadingLabel.trim()
        ) {
            warn(
                'ar-spinner',
                "loading-label est vide — le spinner ne sera pas annoncé aux lecteurs d'écran.",
            );
        }
        if (changed.has('doneLabel') && this.doneLabel !== undefined && !this.doneLabel.trim()) {
            warn(
                'ar-spinner',
                "done-label est vide — l'état terminé ne sera pas annoncé aux lecteurs d'écran.",
            );
        }
    }

    override render(): TemplateResult {
        const label = this.done
            ? this.doneLabel?.trim() || this.localize.term('loadingDone')
            : this.loadingLabel?.trim() || this.localize.term('loading');
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
                <p>${label}</p>
            </div>`;
    }
}
