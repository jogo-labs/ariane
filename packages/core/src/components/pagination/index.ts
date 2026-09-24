import { ArPagination } from './pagination.js';

if (!customElements.get('ar-pagination')) {
    customElements.define('ar-pagination', ArPagination);
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-pagination': ArPagination;
    }
}

export { ArPagination };
