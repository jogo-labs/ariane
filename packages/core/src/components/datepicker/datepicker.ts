import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import styles from './datepicker.styles.js';

/**
 * @summary Résumé du composant ar-datepicker.
 *
 * @slot         - Contenu principal.
 *
 * @csspart base - L'élément racine du composant.
 * @cssprop [--ar-datepicker-size=auto] - Taille du composant.
 *
 * @event {CustomEvent} ar-datepicker-change - Émis lors d'un changement.
 */
@customElement('ar-datepicker')
export class ArDatepicker extends LitElement {
    static override styles = [styles];

    override render() {
        return html`
            <div part="base">
                <slot></slot>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-datepicker': ArDatepicker;
    }
}
