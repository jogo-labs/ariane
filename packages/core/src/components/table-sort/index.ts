import { ArTableSort } from './table-sort.js';

customElements.define('ar-table-sort', ArTableSort);

declare global {
    interface HTMLElementTagNameMap {
        'ar-table-sort': ArTableSort;
    }
}

export { ArTableSort };
