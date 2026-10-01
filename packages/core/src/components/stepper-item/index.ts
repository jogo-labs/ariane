import { ArStepperItem } from './stepper-item.js';
import { defineComponent } from '../../internal/define-component.js';

defineComponent('ar-stepper-item', ArStepperItem);

declare global {
    interface HTMLElementTagNameMap {
        'ar-stepper-item': ArStepperItem;
    }
}

export { ArStepperItem };
