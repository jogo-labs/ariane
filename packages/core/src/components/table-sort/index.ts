import { ArTableSort } from './table-sort.js';
import { defineComponent } from '../../internal/define-component.js';

defineComponent('ar-table-sort', ArTableSort);

declare global {
    interface HTMLElementTagNameMap {
        'ar-table-sort': ArTableSort;
    }
}

export { ArTableSort };
