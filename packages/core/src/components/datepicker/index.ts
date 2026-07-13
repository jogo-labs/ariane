import { ArDatepicker } from './datepicker.js';

customElements.define('ar-datepicker', ArDatepicker);

declare global {
    interface HTMLElementTagNameMap {
        'ar-datepicker': ArDatepicker;
    }
}

export { ArDatepicker };
