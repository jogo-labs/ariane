import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import styles from './tab-panel.styles.js';

/**
 * @summary Résumé du composant ar-tab-panel.
 *
 * @slot         - Contenu principal.
 *
 * @csspart base - L'élément racine du composant.
 * @cssprop [--ar-tab-panel-size=auto] - Taille du composant.
 *
 * @event {CustomEvent} ar-tab-panel-change - Émis lors d'un changement.
 */
@customElement('ar-tab-panel')
export class ArTabPanel extends LitElement {
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
        'ar-tab-panel': ArTabPanel;
    }
}
