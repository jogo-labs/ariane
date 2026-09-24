import { ArDatepicker } from './datepicker.js';

if (!customElements.get('ar-datepicker')) {
    customElements.define('ar-datepicker', ArDatepicker);
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-datepicker': ArDatepicker;
    }
}

export { ArDatepicker };
