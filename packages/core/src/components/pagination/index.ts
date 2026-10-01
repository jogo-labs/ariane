import { ArPagination } from './pagination.js';
import { defineComponent } from '../../internal/define-component.js';

defineComponent('ar-pagination', ArPagination);

declare global {
    interface HTMLElementTagNameMap {
        'ar-pagination': ArPagination;
    }
}

export { ArPagination };
