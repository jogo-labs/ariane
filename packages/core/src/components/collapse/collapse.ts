import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import styles from './collapse.styles.js';

/**
 * @summary Résumé du composant ar-collapse.
 *
 * @slot         - Contenu principal.
 *
 * @csspart base - L'élément racine du composant.
 * @cssprop [--ar-collapse-size=auto] - Taille du composant.
 *
 * @event {CustomEvent} ar-collapse-change - Émis lors d'un changement.
 */
@customElement('ar-collapse')
export class ArCollapse extends LitElement {
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
        'ar-collapse': ArCollapse;
    }
}
