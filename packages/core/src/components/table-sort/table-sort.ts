import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import styles from './table-sort.styles.js';

/**
 * @summary Résumé du composant ar-table-sort.
 *
 * @slot         - Contenu principal.
 *
 * @csspart base - L'élément racine du composant.
 * @cssprop [--ar-table-sort-size=auto] - Taille du composant.
 *
 * @event {CustomEvent} ar-table-sort-change - Émis lors d'un changement.
 */
@customElement('ar-table-sort')
export class ArTableSort extends LitElement {
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
        'ar-table-sort': ArTableSort;
    }
}
