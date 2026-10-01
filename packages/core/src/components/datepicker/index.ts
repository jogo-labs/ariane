import { ArDatepicker } from './datepicker.js';
import { defineComponent } from '../../internal/define-component.js';

defineComponent('ar-datepicker', ArDatepicker);

declare global {
    interface HTMLElementTagNameMap {
        'ar-datepicker': ArDatepicker;
    }
}

export { ArDatepicker };
