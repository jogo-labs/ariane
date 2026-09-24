import { ArPagination } from './pagination.js';

customElements.define('ar-pagination', ArPagination);

declare global {
    interface HTMLElementTagNameMap {
        'ar-pagination': ArPagination;
    }
}

export { ArPagination };
