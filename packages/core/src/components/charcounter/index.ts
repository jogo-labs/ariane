import { ArCharcounter } from './charcounter.js';
import { defineComponent } from '../../internal/define-component.js';

defineComponent('ar-charcounter', ArCharcounter);

declare global {
    interface HTMLElementTagNameMap {
        'ar-charcounter': ArCharcounter;
    }
}

export { ArCharcounter };
