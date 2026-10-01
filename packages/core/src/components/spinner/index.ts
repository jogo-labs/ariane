import { ArSpinner } from './spinner.js';
import { defineComponent } from '../../internal/define-component.js';

defineComponent('ar-spinner', ArSpinner);

declare global {
    interface HTMLElementTagNameMap {
        'ar-spinner': ArSpinner;
    }
}

export { ArSpinner };
