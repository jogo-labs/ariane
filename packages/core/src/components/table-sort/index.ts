import { ArTableSort } from './table-sort.js';

if (!customElements.get('ar-table-sort')) {
    customElements.define('ar-table-sort', ArTableSort);
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-table-sort': ArTableSort;
    }
}

export { ArTableSort };
