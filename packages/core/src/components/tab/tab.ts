import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import styles from './tab.styles.js';

/**
 * @summary Résumé du composant ar-tab.
 *
 * @slot         - Contenu principal.
 *
 * @csspart base - L'élément racine du composant.
 * @cssprop [--ar-tab-size=auto] - Taille du composant.
 *
 * @event {CustomEvent} ar-tab-change - Émis lors d'un changement.
 */
@customElement('ar-tab')
export class ArTab extends LitElement {
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
        'ar-tab': ArTab;
    }
}
