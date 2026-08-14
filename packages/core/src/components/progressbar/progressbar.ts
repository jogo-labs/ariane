import { LitElement, type TemplateResult, html, type CSSResultGroup } from 'lit';
import { property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { warn } from '../../utils/warn.js';
import styles from './progressbar.styles.js';

/** Objet de configuration d'un webcomposant ArProgressbar */
export class ArProgressbarConfig {
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
 * @csspart progressbar  - Racine du composant.
 * @csspart label        - Le `<p>` contenant le slot et le pourcentage.
 * @csspart label-text   - Le `<span>` autour du slot.
 * @csspart percent      - Le `<strong>` affichant la valeur numérique du pourcentage.
 * @csspart track        - Le `<div>` représentant le fond de la barre (rail).
 * @csspart bar          - Le `<div>` représentant la progression (la partie remplie).
 *
 * @cssprop --ar-progressbar-track-color - Couleur du rail (fond). Repli `ButtonFace` si aucun thème n'est chargé (WCAG 1.4.11).
 * @cssprop --ar-progressbar-fill-color - Couleur de la progression. Repli `ButtonText` si aucun thème n'est chargé (WCAG 1.4.11) — distinct de `ButtonFace` pour garder rail et remplissage contrastés entre eux.
 * @cssprop --ar-progressbar-max-width - Largeur maximale du composant. Repli `500px` si aucun thème n'est chargé — sans plafond, le pourcentage peut s'éloigner visuellement de son label sur un conteneur très large.
 */
export class ArProgressbar extends LitElement {
    static override styles: CSSResultGroup = [styles];

    /**
     * Pourcentage de complétion. Automatiquement borné entre 0 et 100.
     * @attr percent
     */
    @property({ reflect: true, useDefault: true, type: Number })
    percent = 0;

    override updated(changed: Map<string, unknown>): void {
        if (changed.has('percent')) {
            if (isNaN(this.percent)) {
                warn('ar-progressbar', `percent est NaN — vérifiez l'attribut HTML fourni.`);
            } else if (this.percent < 0 || this.percent > 100) {
                warn(
                    'ar-progressbar',
                    `percent doit être compris entre 0 et 100. Valeur reçue : ${this.percent}. Elle sera bornée automatiquement.`,
                );
            }
        }
    }

    override render(): TemplateResult {
        // Clamp défensif : même si la propriété est bornée, une valeur HTML arbitraire peut passer
        const percentValue = Math.max(0, Math.min(100, this.percent));

        return html` <div part="progressbar">
            <p part="label" id="progressbar-label">
                <span part="label-text">
                    <slot></slot>
                </span>
                <strong part="percent">${percentValue}%</strong>
            </p>
            <div part="track">
                <div
                    part="bar"
                    style=${styleMap({ width: percentValue + '%' })}
                    role="progressbar"
                    aria-labelledby="progressbar-label"
                    aria-valuenow="${percentValue}"
                    aria-valuemin="0"
                    aria-valuemax="100"
                ></div>
            </div>
        </div>`;
    }
}
