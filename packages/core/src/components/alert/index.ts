import { ArAlert } from './alert.js';
import { defineComponent } from '../../internal/define-component.js';

defineComponent('ar-alert', ArAlert);

declare global {
    interface HTMLElementTagNameMap {
        'ar-alert': ArAlert;
    }
}

export { ArAlert };
