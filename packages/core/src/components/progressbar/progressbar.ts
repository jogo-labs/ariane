import { LitElement, type TemplateResult, html, type CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import utilitiesStyles from '../../styles/utilities.styles.js';
import styles from './progressbar.styles.js';

/** Objet de configuration d'un webcomposant MrProgressbar */
export class MrProgressbarConfig {
    /** Pourcentage de complétion (0–100) */
    percent?: number = 0;
}

/**
 * @summary Barre de progression accessible avec label et affichage du pourcentage.
 * @display demo
 *
 * La valeur de `percent` est automatiquement bornée entre 0 et 100.
 * Le label est fourni via le slot par défaut, affiché avant le pourcentage.
 *
 * @slot - Label décrivant ce que mesure la barre (ex: "Chargement du fichier").
 *
 * @csspart container    - Le `<div>` englobant l'ensemble du composant.
 * @csspart label        - Le `<p>` contenant le slot et le pourcentage.
 * @csspart label-text   - Le `<span>` autour du slot.
 * @csspart percent      - Le `<strong>` affichant la valeur numérique du pourcentage.
 * @csspart track        - Le `<div>` représentant le fond de la barre (rail).
 * @csspart bar          - Le `<div>` représentant la progression (la partie remplie).
 *
 * @cssprop --mr-progressbar-height       - Hauteur de la barre. Défaut : `8px`.
 * @cssprop --mr-progressbar-bg           - Couleur du rail (fond). Défaut : `#e5e7eb`.
 * @cssprop --mr-progressbar-fill         - Couleur de la progression. Défaut : `#2563eb`.
 * @cssprop --mr-progressbar-border-radius - Arrondi de la barre. Défaut : `9999px`.
 */
@customElement('mr-progressbar')
export class MrProgressbar extends LitElement {
    static override styles: CSSResultGroup | undefined = [utilitiesStyles, styles];

    /** Nom du composant affiché dans les logs */
    static readonly NAME = 'MrProgressbar';

    /**
     * Pourcentage de complétion. Automatiquement borné entre 0 et 100.
     * @attr percent
     */
    @property({ reflect: true, useDefault: true, type: Number })
    percent = 0;

    override render(): TemplateResult {
        // Clamp défensif : même si la propriété est bornée, une valeur HTML arbitraire peut passer
        const percentValue = Math.max(0, Math.min(100, this.percent));

        return html` <div part="container" class="progressbar-container">
            <p part="label" class="progress-label">
                <span part="label-text" class="content-label">
                    <slot></slot>
                </span>
                <strong part="percent" class="progress-percent">${percentValue}%</strong>
            </p>
            <div part="track" class="progress d-inline-flex">
                <div
                    part="bar"
                    class="progress-bar"
                    style=${styleMap({ width: percentValue + '%' })}
                    role="progressbar"
                    aria-valuenow="${percentValue}"
                    aria-valuemin="0"
                    aria-valuemax="100"
                ></div>
            </div>
        </div>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'mr-progressbar': MrProgressbar;
    }
}
